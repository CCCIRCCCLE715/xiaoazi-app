import {useEffect,useState} from 'react'
import type {TodoCard} from '../lib/scenes'
import {WorkTaskBoard} from './WorkTaskBoard'
import {notifyCourtRecords} from '../lib/memories'
import {documentItemId,documentItemScope,documentItemStoreKey,readDocumentItemEdits,encodeDocumentItemEdits} from '../lib/document-items'
/** File scope stays independent. Only editable fields are restored; evidence remains original. */
export function DocumentTodoCard({card,onClose}:{card:TodoCard;onClose:(s:string,token?:number)=>void;onNotice:(s:string,token?:number)=>void}){
 const source=card.document!,original=source.items.map(i=>({...i,id:documentItemId(i),done:false})),[items,setItems]=useState(original),[editing,setEditing]=useState<string>(),[draft,setDraft]=useState<(typeof original)[number]>(),[error,setError]=useState(''),[ready,setReady]=useState(false)
 const key=documentItemStoreKey(source.id),order=JSON.stringify(original.map(i=>i.id))
 function open(){try{const raw=localStorage.getItem(key),saved=readDocumentItemEdits(raw,source.name);if(raw===null){const encoded=encodeDocumentItemEdits(source.name,saved,original);localStorage.setItem(key,encoded);if(localStorage.getItem(key)!==encoded)throw Error();notifyCourtRecords()}setItems(original.filter(i=>!saved.get(i.id)?.deleted).map(i=>({...i,...saved.get(i.id)})));setReady(true);setError('')}catch{setReady(false);setError('文件事项暂时无法读取，旧记录未被覆盖。请重试。')}}
 useEffect(()=>{setEditing(undefined);setDraft(undefined);open()},[source.id,order])
 function save(next:typeof items,hold=false,token?:number){if(!ready)return false;if(next.some(i=>!i.title.trim()||i.title.length>80||(i.dueLabel?.length??0)>40)){setError('事项请填1至80字，日期最多40字。');return false}try{const value=encodeDocumentItemEdits(source.name,readDocumentItemEdits(localStorage.getItem(key),source.name),next);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error();setItems(next);notifyCourtRecords();setError('');setEditing(undefined);setDraft(undefined);if(hold)onClose('文件事项已留存。',token);return true}catch{setError('本地保存失败，请重试。');return false}}
 function revise(id:string){const item=items.find(i=>String(i.id)===id);if(item){setEditing(item.id);setDraft({...item});setError('')}}
 return <WorkTaskBoard scope={documentItemScope(source.id)} items={items.map(i=>({id:i.id,title:i.title,dateLabel:i.dueLabel||'未标日期',category:'文件事项',source:source.name,done:i.done,quote:i.quote,label:i.label}))} ready={ready} editingId={editing} error={error}
  editor={draft&&<><label>事项<textarea maxLength={80} aria-label="任务事项" value={draft.title} onChange={e=>setDraft({...draft,title:e.currentTarget.value})}/></label><label>日期原文<input maxLength={40} aria-label="任务日期原文" value={draft.dueLabel??''} placeholder="未标日期" onChange={e=>setDraft({...draft,dueLabel:e.currentTarget.value||null})}/></label></>}
  onRevise={revise} onSave={()=>{if(draft)save(items.map(i=>i.id===draft.id?{...draft,title:draft.title.trim()}:i))}} onCancelEdit={()=>{setEditing(undefined);setDraft(undefined);setError('')}} onHold={token=>save(editing!==undefined&&draft?items.map(i=>i.id===draft.id?draft:i):items,true,token)} onToggle={id=>save(items.map(i=>String(i.id)===id?{...i,done:!i.done}:i))} onRetry={open} command={card.command} commandNonce={card.commandNonce}/>
}
