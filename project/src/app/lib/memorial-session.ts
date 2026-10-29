/** Per-item local decisions, deliberately separate from todo-day v1 and document content/done. */
export type MemorialDecision='approved'|'declined'
export interface MemorialScope {key:string;ids:string[]}
interface Result {ok:boolean;error?:string}
export interface MemorialPort {getItem(key:string):string|null;setItem(key:string,value:string):void}
interface RecordV1 {version:1;scope:string;decisions:Record<string,MemorialDecision>;history:string[];times?:Record<string,number>}
export interface MemorialState {decisions:Record<string,MemorialDecision>;currentId?:string;ready:boolean;error?:string;approved:number;declined:number;complete:boolean;empty:boolean;canUndo:boolean}
export const memorialKey=(scope:string)=>`app.court.memorial.v1.${encodeURIComponent(scope)}`
/** Parent adapter owns this gate across a keyed paper/source remount. */
export function createMemorialCommandScope(){
 let active:{nonce:number;scope:string}|undefined
 return(scope:string,nonce:number|undefined)=>{if(nonce===undefined)return undefined;if(!active||nonce>active.nonce)active={nonce,scope};return nonce===active.nonce&&scope===active.scope?nonce:undefined}
}
export function createMemorialSession(port:MemorialPort,scope:MemorialScope,change:(s:MemorialState)=>void=()=>{}){
 const ids=[...new Set(scope.ids)],known=new Set(ids)
 let record:RecordV1={version:1,scope:scope.key,decisions:{},history:[]},pending:RecordV1|undefined,alive=true
 let state:MemorialState={decisions:{},currentId:ids[0],ready:false,approved:0,declined:0,empty:ids.length===0,complete:false,canUndo:false}
 function publish(ready:boolean,error?:string){const decisions=Object.fromEntries(Object.entries(record.decisions).filter(([id])=>known.has(id))) as Record<string,MemorialDecision>,currentId=ids.find(id=>!decisions[id]);state={decisions,currentId,ready,error,approved:Object.values(decisions).filter(v=>v==='approved').length,declined:Object.values(decisions).filter(v=>v==='declined').length,empty:ids.length===0,complete:ids.length>0&&!currentId,canUndo:record.history.some(id=>known.has(id))};if(alive)change(state)}
 const fail=(error:string)=>({ok:false,error})
 const valid=(r:RecordV1)=>r&&r.version===1&&r.scope===scope.key&&r.decisions&&typeof r.decisions==='object'&&!Array.isArray(r.decisions)&&Object.values(r.decisions).every(v=>v==='approved'||v==='declined')&&Array.isArray(r.history)&&r.history.every(id=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(r.decisions,id))&&new Set(r.history).size===r.history.length&&Object.keys(r.decisions).length===r.history.length
 function open():Result{if(!alive)return fail('奏折已关闭。');try{const raw=port.getItem(memorialKey(scope.key));const next=raw===null?{version:1 as const,scope:scope.key,decisions:{},history:[]}:JSON.parse(raw);if(!valid(next))throw Error();record=next;pending=undefined;publish(true);return{ok:true}}catch{pending=undefined;publish(false,'批示暂时无法读取，旧记录未被覆盖。请重试。');return fail(state.error!)}}
 function save(next:RecordV1):Result{if(!alive)return fail('奏折已关闭。');try{const raw=JSON.stringify(next),key=memorialKey(scope.key);port.setItem(key,raw);if(port.getItem(key)!==raw)throw Error();record=next;pending=undefined;publish(true);if(typeof window!=='undefined')window.dispatchEvent(new Event('xiaoazi:records'));return{ok:true}}catch{pending=next;publish(true,'批示未确认保存，请重试。');return fail(state.error!)}}
 return{state:()=>state,open,resume(){alive=true},
  decide(id:string,decision:MemorialDecision){if(!alive||!state.ready||pending||id!==state.currentId||!known.has(id)||Object.prototype.hasOwnProperty.call(record.decisions,id)||!['approved','declined'].includes(decision))return fail(state.error||'这份奏折已变化，请重新核对。');return save({...record,decisions:{...record.decisions,[id]:decision},history:[...record.history,id],times:{...record.times,[id]:Date.now()}})},
  undo(){if(!alive||!state.ready||pending)return fail(state.error||'请先读取批示。');const id=[...record.history].reverse().find(id=>known.has(id));if(!id)return fail('尚无可撤回的批示。');const decisions={...record.decisions},times={...record.times};delete decisions[id];delete times[id];return save({...record,decisions,times,history:record.history.filter(x=>x!==id)})},
  retry(){if(!alive)return fail('奏折已关闭。');return pending?save(pending):open()},
  dispose(){alive=false;pending=undefined},
 }
}
