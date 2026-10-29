import type {MemorialDecision} from './memorial-session'
export interface PaperPoint {x:number;y:number}
export interface PaperSample extends PaperPoint {id:number;t:number;primary:boolean}
export interface PaperView {id?:string;scope:string;phase:'idle'|'dragging'|'settling'|'exiting'|'entering';position:PaperPoint;hint?:MemorialDecision;strength:number}
interface Animation {finished:Promise<unknown>;cancel():void}
interface Port {current():{scope:string;id?:string};save(id:string,decision:MemorialDecision):{ok:boolean};read():PaperPoint;draw(point:PaperPoint,hint?:MemorialDecision,strength?:number):void;change(s:PaperView):void;animate(kind:'settle'|'exit'|'enter',point:PaperPoint,reduced:boolean):Animation}
/** Owns gesture and completion epochs; the DOM adapter owns transform/opacity only. */
export function createMemorialGesture(port:Port){
 let alive=true,epoch=0,animation:Animation|undefined,view:PaperView={...port.current(),phase:'idle',position:{x:0,y:0},strength:0}
 let start:(PaperSample&{offset:PaperPoint;width:number;scope:string;item:string})|undefined,samples:PaperSample[]=[],ghost=false
 const publish=()=>port.change({...view,position:{...view.position}})
 const stop=()=>{epoch++;animation?.cancel();animation=undefined;start=undefined;samples=[]}
 const fresh=()=>{const current=port.current();return current.scope===view.scope&&current.id===view.id}
 function reset(){stop();if(!alive)return;view={...port.current(),phase:'idle',position:{x:0,y:0},strength:0};port.draw(view.position);publish()}
 function run(kind:'settle'|'exit'|'enter',point:PaperPoint,reduced:boolean,next:()=>void){const token=++epoch;animation=port.animate(kind,point,reduced);void animation.finished.then(()=>{if(!alive||token!==epoch)return;animation=undefined;next()},()=>{})}
 function enter(reduced:boolean){view={...port.current(),phase:'entering',position:{x:0,y:0},strength:0};publish();run('enter',view.position,reduced,()=>{view.phase='idle';publish()})}
 function settle(reduced=false){start=undefined;samples=[];view.phase='settling';view.hint=undefined;view.strength=0;publish();run('settle',view.position,reduced,()=>{view.phase='idle';view.position={x:0,y:0};port.draw(view.position);publish()})}
 function decide(decision:MemorialDecision,keyboard=false,reduced=false,point:PaperPoint={x:decision==='approved'?100:-100,y:0}){
  if(!alive||!view.id||!fresh()||['exiting','entering'].includes(view.phase))return false
  stop();if(!port.save(view.id,decision).ok){settle(reduced);return false}
  if(keyboard){reset();return true}
  view.phase='exiting';view.hint=decision;view.strength=1;view.position=point;publish();run('exit',point,reduced,()=>enter(reduced));return true
 }
 return{view:()=>view,reset,decide,resume(){alive=true;reset()},
  down(p:PaperSample,width:number){if(!alive||!p.primary||start||!view.id||!fresh()||['exiting','entering'].includes(view.phase))return false;const offset=view.phase==='settling'?port.read():{x:0,y:0};stop();start={...p,offset,width,scope:view.scope,item:view.id};samples=[p];view.phase='dragging';view.position=offset;view.hint=undefined;view.strength=0;publish();return true},
  move(p:PaperSample){if(!start||p.id!==start.id||!alive)return false;if(!fresh()){reset();return false}samples.push(p);samples=samples.filter(s=>s.t>=p.t-100||s===samples[0]);const dx=p.x-start.x,dy=p.y-start.y;view.position={x:dx+start.offset.x,y:dy+start.offset.y};view.hint=Math.abs(dx)<8?undefined:dx<0?'declined':'approved';view.strength=Math.min(1,Math.abs(dx)/Math.max(64,start.width*.18));if(Math.hypot(dx,dy)>8)ghost=true;port.draw(view.position,view.hint,view.strength);return true},
  up(p:PaperSample,reduced=false){if(!start||p.id!==start.id||!alive)return false;if(!fresh()){reset();return false}const s=start;const dx=p.x-s.x,dy=p.y-s.y,distance=Math.hypot(dx,dy);const recent=[...samples].reverse().find(v=>v.t<=p.t-30)||s;const speed=Math.hypot(p.x-recent.x,p.y-recent.y)/Math.max(1,p.t-recent.t);const point={x:dx+s.offset.x,y:dy+s.offset.y};start=undefined;samples=[];view.position=point;if(Math.abs(dx)>=24&&(distance>=Math.max(64,s.width*.18)||distance>=32&&speed>=.6))return decide(dx<0?'declined':'approved',false,reduced,point);settle(reduced);return false},
  cancel(reduced=false){if(!alive)return;stop();if(!fresh()){reset();return}if(view.phase==='exiting'||view.phase==='entering'){reset();return}settle(reduced)},
  pointerStart(){ghost=false},
  consumeClick(){const old=ghost;ghost=false;return old},
  dispose(){stop();alive=false},
 }
}
