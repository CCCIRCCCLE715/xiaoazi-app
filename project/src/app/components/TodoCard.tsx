import {DocumentTodoCard} from './DocumentTodoCard'
import {useEffect,useMemo,useState} from 'react'
import {createTodoSession,shanghaiDay,type TodoEdit,type TodoState} from '../lib/todo-day'
import {TaskMemorialDeck} from './TaskMemorialDeck'
import {createMemorialCommandScope} from '../lib/memorial-session'
import type {TodoCard as Card} from '../lib/scenes'
function DailyTodoCard({card,onClose}:{card:Card;onClose:(message:string,token?:number)=>void;onNotice:(message:string,token?:number)=>void}){
 const [state,setState]=useState<TodoState>(),[editing,setEditing]=useState<string>(),[draft,setDraft]=useState<TodoEdit>(),[error,setError]=useState('')
 const session=useMemo(()=>createTodoSession({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},()=>new Date(),setState),[])
 const current=state||session.state(),day=current.day
 const commandScope=useMemo(createMemorialCommandScope,[]),commandNonce=commandScope(`day:${day.date}`,card.commandNonce)
 useEffect(()=>{session.open();const tick=()=>{if(!document.hidden&&session.state().day.date!==shanghaiDay(new Date()))session.open()};const timer=setInterval(tick,30000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)}},[session])
 useEffect(()=>{setEditing(undefined);setDraft(undefined);setError('')},[day.date])
 function revise(id:string){const item=session.state().day.items.find(i=>i.id===id);if(!item)return;setEditing(id);setDraft({id,time:item.time,title:item.title});setError('')}
 function save(hold=false,token?:number){if(!draft)return;const patches=session.state().day.items.map(({id,time,title})=>id===draft.id?draft:{id,time,title}),result=session.edit(patches,hold?'hold':'edit');setError(result.error||'');if(result.ok){setEditing(undefined);setDraft(undefined);if(hold)onClose('未完成的待办已留存。',token)}}
 function hold(token?:number){if(editing){save(true,token);return}const result=session.hold();setError(result.error||'');if(result.ok)onClose('未完成的待办已留存。',token)}
 return <TaskMemorialDeck key={day.date} scope={`day:${day.date}`} items={day.items.map(i=>({id:i.id,title:i.title,dateLabel:`${day.date} · ${i.time}`,category:i.category,source:'今日安排',done:i.done}))} ready={current.ready&&current.saveState==='saved'} editing={Boolean(editing)} error={current.error||error}
  editor={draft&&<><label>时间<input type="time" step="60" value={draft.time} aria-label="奏折时间" onInput={e=>setDraft({...draft,time:e.currentTarget.value})} onChange={e=>setDraft({...draft,time:e.currentTarget.value})}/></label><label>事项<textarea value={draft.title} maxLength={80} aria-label="奏折事项" onChange={e=>setDraft({...draft,title:e.currentTarget.value})}/></label></>}
  onRevise={revise} onSave={()=>save()} onCancelEdit={()=>{setEditing(undefined);setDraft(undefined);setError('')}} onHold={hold} onToggle={id=>{const result=session.toggle(id);setError(result.error||'')}} onRetry={()=>{const result=session.retry();setError(result.error||'')}} command={card.command} commandNonce={commandNonce}/>
}
export function TodoCard(props:{card:Card;onClose:(message:string,token?:number)=>void;onNotice:(message:string,token?:number)=>void}){
 const commandScope=useMemo(createMemorialCommandScope,[]),nonce=commandScope(props.card.document?`document:${props.card.document.id}`:'daily',props.card.commandNonce)
 const safe=nonce===props.card.commandNonce?props:{...props,card:{...props.card,commandNonce:nonce}}
 return props.card.document?<DocumentTodoCard key={props.card.document.id} {...safe}/>:<DailyTodoCard {...safe}/>
}
