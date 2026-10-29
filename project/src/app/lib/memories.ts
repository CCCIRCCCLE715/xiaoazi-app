export interface MemoryRecord{id:string;text:string;createdAt:number;updatedAt:number}
interface Port{getItem(k:string):string|null;setItem(k:string,v:string):void}
const KEY='app.court.memories.v1'
export function notifyCourtRecords(){if(typeof window!=='undefined')window.dispatchEvent(new Event('xiaoazi:records'))}
export function createMemoryStore(port:Port,now=()=>Date.now(),id=()=>crypto.randomUUID()){
 function list():MemoryRecord[]{try{const raw=port.getItem(KEY);if(raw===null)return [];const d=JSON.parse(raw);if(d?.version!==1||!Array.isArray(d.items)||d.items.length>50||d.items.some((i:MemoryRecord)=>!i||typeof i.id!=='string'||typeof i.text!=='string'||!i.text.trim()||i.text.length>300||!Number.isFinite(i.createdAt)||!Number.isFinite(i.updatedAt))||new Set(d.items.map((i:MemoryRecord)=>i.id)).size!==d.items.length)throw Error();return d.items}catch{throw Error('记忆暂时无法读取，原记录未被覆盖。')}}
 function write(items:MemoryRecord[]){try{const raw=JSON.stringify({version:1,items});port.setItem(KEY,raw);if(port.getItem(KEY)!==raw)throw Error();notifyCourtRecords()}catch{throw Error('记忆未保存，请重试。')}}
 return{list,save(input:{id?:string;text:string}){const text=input.text.trim();if(!text||text.length>300)throw Error('请填写1至300个字。');if(/sk-[a-z0-9_-]{16,}|API\s*Key\s*[:：=]/i.test(text))throw Error('请勿在记忆中保存密钥。');const items=list(),old=items.find(i=>i.id===input.id);if(input.id&&!old)throw Error('这条记忆已变化，请刷新。');if(!old&&items.length>=50)throw Error('最多保存50条记忆。');const item={id:old?.id??id(),text,createdAt:old?.createdAt??now(),updatedAt:now()};write(old?items.map(i=>i.id===old.id?item:i):[...items,item]);return item},remove(id:string){const items=list();if(!items.some(i=>i.id===id))throw Error('这条记忆已不存在。');write(items.filter(i=>i.id!==id))}}
}
/** Values only. The native contract encloses these in user-data JSON, never in a system role. */
export function memoryContext(items:MemoryRecord[]):string[]{return items.slice(0,20).map(i=>i.text)}
export const listMemories=()=>createMemoryStore(localStorage).list()
export const saveMemory=(input:{id?:string;text:string})=>createMemoryStore(localStorage).save(input)
export const deleteMemory=(id:string)=>createMemoryStore(localStorage).remove(id)
