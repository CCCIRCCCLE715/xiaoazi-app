/** Local-only demonstration schedule. Never reads a calendar or calls device abilities. */
export type TodoCategory='用膳'|'工作'|'娱乐'|'生活'
export interface TodoItem {id:string;time:string;title:string;category:TodoCategory;done:boolean;origin?:'user'}
export interface TodoDay {version:1;date:string;source:'example-local'|'user-local';items:TodoItem[];confirmed:boolean;held:boolean}
export interface TodoState {day:TodoDay;completed:number;ready:boolean;saveState:'loading'|'saved'|'error';error?:string}
export type TodoEdit=Pick<TodoItem,'id'|'time'|'title'>
type Operation='seed'|'toggle'|'edit'|'confirm'|'hold'
interface Port {getItem(key:string):string|null;setItem(key:string,value:string):void}
interface Result {ok:boolean;operation?:Operation;error?:string}
const categories:TodoCategory[]=['用膳','工作','娱乐','生活']
const CLOCK=/^(?:[01]\d|2[0-3]):[0-5]\d$/
export function shanghaiDay(now:Date):string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-')
}
export const todoKey=(date:string)=>`app.court.todo.${date}`
export function exampleTodoDay(date:string):TodoDay {
 const items:[string,string,TodoCategory][]=[['08:30','用早膳，整理今日安排','用膳'],['09:30','修改宣传片脚本','工作'],['10:30','拍摄手机素材','工作'],['12:30','午膳，休息片刻','用膳'],['14:00','剪辑宣传片，补录旁白','工作'],['16:00','和同事核对修改版','工作'],['18:30','用晚膳','用膳'],['20:00','看电影或玩会儿游戏','娱乐'],['21:30','散步，收拾明日用品','生活']]
 return {version:1,date,source:'example-local',items:items.map(([time,title,category],i)=>({id:`${date}-${i+1}`,time,title,category,done:false})),confirmed:false,held:false}
}
export function todoItemTitle(item:Pick<TodoItem,'title'|'origin'>,source:string):string {
 return source==='example-local'&&item.origin!=='user'&&item.title==='拍摄手机演示镜头'?'拍摄手机素材':item.title
}
function validDay(value:unknown,date:string):value is TodoDay {
 const d=value as TodoDay
 return Boolean(d&&d.version===1&&d.date===date&&['example-local','user-local'].includes(d.source)&&typeof d.confirmed==='boolean'&&typeof d.held==='boolean'&&Array.isArray(d.items)&&d.items.length<=100&&new Set(d.items.map(i=>i.id)).size===d.items.length&&d.items.every(i=>typeof i.id==='string'&&i.id.startsWith(date+'-')&&CLOCK.test(i.time)&&typeof i.title==='string'&&i.title.trim().length>0&&i.title.length<=80&&categories.includes(i.category)&&typeof i.done==='boolean'))
}
const sorted=(items:TodoItem[])=>[...items].sort((a,b)=>a.time.localeCompare(b.time))
export function createTodoSession(port:Port,now=()=>new Date(),change: (state:TodoState)=>void=()=>{},profile={key:todoKey,seed:exampleTodoDay}) {
 let state:TodoState={day:profile.seed(shanghaiDay(now())),completed:0,ready:false,saveState:'loading'}
 let pending:{day:TodoDay;operation:Operation}|undefined
 const publish=(next:TodoState)=>{state={...next,completed:next.day.items.filter(i=>i.done).length};change(state)}
 const failure=(error:string):Result=>({ok:false,error})
 function save(day:TodoDay,operation:Operation):Result {
  try {
   const raw=JSON.stringify(day),key=profile.key(day.date);port.setItem(key,raw)
   if(port.getItem(key)!==raw)throw Error('write not retained')
   pending=undefined;publish({day,ready:true,saveState:'saved',completed:0});if(typeof window!=='undefined')window.dispatchEvent(new Event('xiaoazi:records'));return {ok:true,operation}
  } catch {
   pending={day,operation};const error='保存失败，更改尚未确认保存。请重试。'
   publish({day,ready:true,saveState:'error',completed:0,error});return failure(error)
  }
 }
 function open():Result {
  const date=shanghaiDay(now())
  try {
   const raw=port.getItem(profile.key(date))
   if(raw===null)return save(profile.seed(date),'seed')
   const day:unknown=JSON.parse(raw)
   if(!validDay(day,date))throw Error('invalid local data')
   pending=undefined;publish({day:{...day,items:sorted(day.items.map(i=>({...i,title:todoItemTitle(i,day.source)})))},ready:true,saveState:'saved',completed:0});return {ok:true}
  } catch {
   pending=undefined;const error='本地清单暂时无法读取，未覆盖旧记录。请重试。'
   publish({day:profile.seed(date),ready:false,saveState:'error',completed:0,error});return failure(error)
  }
 }
 function guard():Result|undefined {
  if(shanghaiDay(now())!==state.day.date){open();return failure('日期已更新，请核对今日清单后重试。')}
  if(!state.ready)return failure(state.error||'清单尚未读取，请重试。')
 }
 function edit(patches:TodoEdit[],operation:'edit'|'hold'='edit'):Result {
  const blocked=guard();if(blocked)return blocked
  if(patches.length!==state.day.items.length||new Set(patches.map(i=>i.id)).size!==patches.length||patches.some(i=>!state.day.items.some(old=>old.id===i.id)))return failure('清单已变化，请重新编辑。')
  if(patches.some(i=>!CLOCK.test(i.time)))return failure('时间请填写00:00至23:59。')
  if(patches.some(i=>!i.title.trim()||i.title.trim().length>80))return failure('事项请填写1至80个字。')
  const items=state.day.items.map(i=>{const patch=patches.find(p=>p.id===i.id)!,title=patch.title.trim();return {...i,time:patch.time,title,...(title!==i.title||patch.time!==i.time?{origin:'user' as const}:{})}})
  return save({...state.day,items:sorted(items),confirmed:false,held:operation==='hold'},operation)
 }
 return {
  state:()=>state,open,edit,
  toggle(id:string):Result {const blocked=guard();if(blocked)return blocked;if(!state.day.items.some(i=>i.id===id))return failure('这项待办已变化，请重新打开。');return save({...state.day,items:state.day.items.map(i=>i.id===id?{...i,done:!i.done}:i)},'toggle')},
  confirm():Result {const blocked=guard();return blocked||save({...state.day,confirmed:true,held:false},'confirm')},
  hold():Result {const blocked=guard();return blocked||save({...state.day,held:true},'hold')},
  retry():Result {if(pending&&pending.day.date===shanghaiDay(now()))return save(pending.day,pending.operation);return open()},
 }
}
