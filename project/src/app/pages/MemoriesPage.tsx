import {PalaceDialog} from '../components/PalaceDialog'
import {useEffect,useState} from 'react'
import {PalacePage} from '../components/PalacePage'
import {listMemories,saveMemory,deleteMemory,type MemoryRecord} from '../lib/memories'
export function MemoriesPage(){const [rows,setRows]=useState<MemoryRecord[]>([]),[error,setError]=useState(''),[editing,setEditing]=useState<MemoryRecord|null|undefined>(),[text,setText]=useState(''),[deleting,setDeleting]=useState<MemoryRecord>()
 function run(change?:()=>void){
  try{
   change?.()
   setRows(listMemories())
   setError('')
  }catch(error){setError((error as Error).message)}
 }
 useEffect(()=>{run()},[])
 const edit=(row:MemoryRecord|null)=>{setEditing(row);setText(row?.text??'')}
 return <PalacePage active="memories" title="记忆列表"><p className="palace-caption">只记住陛下主动留下的偏好。</p><button className="palace-primary" onClick={()=>edit(null)}>添一条记忆</button>{error&&<p role="alert">{error}<button onClick={()=>run()}>重试</button></p>}{!rows.length&&!error&&<p className="palace-empty">尚无记忆</p>}<ul className="palace-record-list">{rows.map(row=><li key={row.id}><p>{row.text}</p><div className="palace-row-actions"><button onClick={()=>edit(row)}>编辑</button><button onClick={()=>setDeleting(row)}>删除</button></div></li>)}</ul>{editing!==undefined&&<PalaceDialog label="编辑记忆" onClose={()=>setEditing(undefined)}><div><div role="status">{error}</div><h2>{editing?'编辑记忆':'添一条记忆'}</h2><textarea autoFocus value={text} maxLength={300} onChange={e=>setText(e.target.value)} aria-label="记忆内容"/><div className="palace-row-actions"><button onClick={()=>setEditing(undefined)}>取消</button><button onClick={()=>run(()=>{saveMemory({id:editing?.id,text});setEditing(undefined)})}>保存</button></div></div></PalaceDialog>}{deleting&&<PalaceDialog label="确认删除记忆" onClose={()=>setDeleting(undefined)}><div><div role="status">{error}</div><h2>删去这条记忆？</h2><p>{deleting.text}</p><div className="palace-row-actions"><button autoFocus onClick={()=>setDeleting(undefined)}>保留</button><button onClick={()=>run(()=>{deleteMemory(deleting.id);setDeleting(undefined)})}>确认删除</button></div></div></PalaceDialog>}</PalacePage>}
