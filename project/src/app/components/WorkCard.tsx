import {useEffect,useMemo,useState} from 'react'
import {shanghaiDay,type TodoEdit,type TodoState} from '../lib/todo-day'
import {TaskMemorialDeck} from './TaskMemorialDeck'
import {createWorkPlanSession,workTaskDetails,WORK_PLAN} from '../lib/work-plan'
import {createMemorialCommandScope} from '../lib/memorial-session'
import type {WorkCard as Card} from '../lib/scenes'
export function WorkCard({card,onClose,onUpload}:{card:Card;onClose:(message:string,token?:number)=>void;onNotice:(message:string,token?:number)=>void;onUpload?:()=>void}){
 const [state,setState]=useState<TodoState>(),[editing,setEditing]=useState<string>(),[draft,setDraft]=useState<TodoEdit>(),[error,setError]=useState('')
 const session=useMemo(()=>createWorkPlanSession({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},()=>new Date(),setState),[])
 const current=state||session.state(),day=current.day
 const commandScope=useMemo(createMemorialCommandScope,[]),commandNonce=commandScope(`day:${day.date}`,card.commandNonce)
 useEffect(()=>{session.open();const tick=()=>{if(!document.hidden&&session.state().day.date!==shanghaiDay(new Date()))session.open()};const timer=setInterval(tick,30000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)}},[session])
 useEffect(()=>{setEditing(undefined);setDraft(undefined);setError('')},[day.date])
 function revise(id:string){const item=session.state().day.items.find(i=>i.id===id);if(!item)return;setEditing(id);setDraft({id,time:item.time,title:item.title});setError('')}
 function save(hold=false,token?:number){if(!draft)return;const patches=session.state().day.items.map(({id,time,title})=>id===draft.id?draft:{id,time,title}),result=session.edit(patches,hold?'hold':'edit');setError(result.error||'');if(result.ok){setEditing(undefined);setDraft(undefined);if(hold)onClose('未完成的工作已留存。',token)}}
 function hold(token?:number){if(editing){save(true,token);return}const result=session.hold();setError(result.error||'');if(result.ok)onClose('未完成的工作已留存。',token)}
 return <TaskMemorialDeck variant="work" key={day.date} scope={`work:${day.date}`} sourceLabel={`${day.date} · ${WORK_PLAN.title}`} selectionName={card.selection?.name} onUpload={onUpload} items={day.items.map(i=>{const detail=workTaskDetails(i.id),original=detail?.title===i.title;return {id:i.id,title:i.title,dateLabel:`安排时间 ${i.time}`,category:i.category,source:WORK_PLAN.title,done:i.done,description:original?detail.description:i.title,deliverable:original?detail.deliverable:undefined}})} ready={current.ready&&current.saveState==='saved'} editing={Boolean(editing)} error={current.error||error}
  editor={draft&&<><label>时间<input type="time" step="60" value={draft.time} aria-label="任务时间" onInput={e=>setDraft({...draft,time:e.currentTarget.value})} onChange={e=>setDraft({...draft,time:e.currentTarget.value})}/></label><label>事项<textarea value={draft.title} maxLength={80} aria-label="任务事项" onChange={e=>setDraft({...draft,title:e.currentTarget.value})}/></label></>}
  onRevise={revise} onSave={()=>save()} onCancelEdit={()=>{setEditing(undefined);setDraft(undefined);setError('')}} onHold={hold} onToggle={id=>{const result=session.toggle(id);setError(result.error||'')}} onRetry={()=>{const result=session.retry();setError(result.error||'')}} command={card.command} commandNonce={commandNonce}/>
}
