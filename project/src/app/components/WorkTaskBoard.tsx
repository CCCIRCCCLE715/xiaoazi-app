import {useEffect,useRef,useState,type ReactNode} from 'react'
import {ChevronDown,FileUp,Check,Bookmark} from 'lucide-react'
export interface WorkTask {id:string;title:string;dateLabel:string;category:string;source:string;done:boolean;description?:string;deliverable?:string;quote?:string;label?:string}
interface Props {
 scope:string;items:WorkTask[];ready:boolean;editingId?:string;editor?:ReactNode;error?:string;sourceLabel?:string;selectionName?:string
 onRevise:(id:string)=>void;onSave:()=>void;onCancelEdit:()=>void;onHold:(token?:number)=>void;onToggle:(id:string)=>void;onRetry:()=>void;onConfirm?:(token?:number)=>void;onUpload?:()=>void
 command?:'approve'|'revise'|'hold';commandNonce?:number
}
export function WorkTaskBoard(props:Props){
 const {items,ready,editingId}=props,[expanded,setExpanded]=useState<string[]>([]),handled=useRef<number|undefined>(undefined)
 useEffect(()=>{if(editingId)setExpanded(old=>old.includes(editingId)?old:[...old,editingId])},[editingId])
 useEffect(()=>{if(!ready||props.commandNonce===undefined||handled.current===props.commandNonce)return;handled.current=props.commandNonce
  if(props.command==='hold')props.onHold(props.commandNonce)
  if(props.command==='approve')props.onConfirm?.(props.commandNonce)
  if(props.command==='revise'&&items[0])props.onRevise(items[0].id)
 },[ready,props.commandNonce,props.command,props.scope])
 const completed=items.filter(item=>item.done).length
 return <section className="imperial-card imperial-fullpage work-board" data-card="todo" data-scope={props.scope} aria-label="今日任务" data-save-state={ready?'saved':'loading'}>
  <header className="work-heading"><span aria-hidden/><div><h2>今日任务</h2><p>{completed} / {items.length} 已完成</p></div><span aria-hidden/></header>
  <div className="work-scroll scroll-y">
   <div className="work-progress"><div><span>{props.sourceLabel??'今日工作安排'}</span><strong>{completed===items.length&&items.length?'今日任务已完成':'今日进度'}</strong></div><progress max={items.length||1} value={completed} aria-label="今日任务完成进度"/></div>
   {props.selectionName&&<p className="work-selection">已选择 · {props.selectionName}</p>}
   {props.onUpload&&<button type="button" className="work-upload" onClick={props.onUpload}><FileUp size={18}/><span>选择工作文件</span><span aria-hidden>›</span></button>}
   {props.error&&<div className="work-error" role="alert"><p>{props.error}</p><button type="button" onClick={props.onRetry}>重试保存</button></div>}
   <div className="work-list">
    {items.map((item,index)=><article className="work-task" key={item.id} data-done={item.done} data-task-id={item.id}>
     <div className="work-task-top">
      <label className="work-check"><input type="checkbox" checked={item.done} disabled={!ready} aria-label={`完成${item.title}`} onChange={()=>props.onToggle(item.id)}/><span aria-hidden>{item.done?<Check size={19}/>:String(index+1).padStart(2,'0')}</span></label>
      <div className="work-task-title"><p>{item.dateLabel}<span>{item.done?'已完成':'待完成'}</span></p><h3>{item.title}</h3></div>
     </div>
     <details open={expanded.includes(item.id)} onToggle={e=>{const open=e.currentTarget.open;setExpanded(old=>open?old.includes(item.id)?old:[...old,item.id]:old.filter(id=>id!==item.id))}}>
      <summary aria-label={`${item.title}详情`}><span>{item.category}</span><span>任务详情 <ChevronDown size={16}/></span></summary>
      <div className="work-task-detail">
       {item.description&&<p>{item.description}</p>}
       {item.deliverable&&<div className="work-deliverable"><strong>交付内容</strong><p>{item.deliverable}</p></div>}
       {item.quote&&<blockquote><strong>{item.label} · 原文</strong><p>{item.quote}</p><cite>{item.source}</cite></blockquote>}
       {editingId===item.id?<div className="work-editor">{props.editor}<div><button type="button" onClick={props.onCancelEdit}>取消</button><button type="button" onClick={props.onSave}>保存修改</button></div></div>:<button type="button" className="work-edit" onClick={()=>props.onRevise(item.id)} disabled={!ready}>编辑任务</button>}
      </div>
     </details>
    </article>)}
   </div>
   <button type="button" className="work-hold" onClick={()=>props.onHold()} disabled={!ready}><Bookmark size={18}/>留存今日安排</button>
  </div>
 </section>
}
