import {PalaceDialog} from '../components/PalaceDialog'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {Bell,ChevronRight} from 'lucide-react'
import {PalacePage} from '../components/PalacePage'
import {createCourtRecords,type DayRecord} from '../lib/court-records'
import {shanghaiDay} from '../lib/todo-day'
export function CalendarPage(){const [date,setDate]=useState(()=>shanghaiDay(new Date())),[rows,setRows]=useState<DayRecord[]>([]),[undated,setUndated]=useState<DayRecord[]>([]),[error,setError]=useState(''),[editing,setEditing]=useState<DayRecord|null|undefined>(),[title,setTitle]=useState(''),[time,setTime]=useState('09:00'),[deleting,setDeleting]=useState<DayRecord>()
 const store=()=>createCourtRecords(localStorage)
 function run(change?:()=>void){
  try{
   change?.()
   const day=store().day(date)
   setRows(day.items)
   setUndated(day.undated)
   setError('')
  }catch(error){setError((error as Error).message)}
 }
 useEffect(()=>{
  const load=()=>run()
  load()
  window.addEventListener('xiaoazi:records',load)
  window.addEventListener('storage',load)
  return()=>{
   window.removeEventListener('xiaoazi:records',load)
   window.removeEventListener('storage',load)
  }
 },[date])
 const edit=(row:DayRecord|null)=>{setEditing(row);setTitle(row?.title??'');setTime(row?.time||'09:00')}
 return <PalacePage active="calendar" title="日历和日程"><div className="palace-toolbar"><label>日期<input type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value)}}/></label><Link to="/morning"><Bell size={18}/><span>晨起闹钟</span><ChevronRight size={16}/></Link></div><button className="palace-primary" onClick={()=>edit(null)}>添一件事</button>{error&&<p role="alert">{error}<button onClick={()=>run()}>重试</button></p>}{!rows.length&&!error&&<p className="palace-empty">这一天暂无日程</p>}<ul className="palace-record-list">{rows.map(row=><li className="calendar-record" data-completed={row.done} key={row.storeKey+row.id}><label className="palace-check"><input type="checkbox" checked={row.done} onChange={()=>run(()=>store().update(row,{title:row.title,time:row.time,done:!row.done}))}/><span><time className="calendar-record-time" dateTime={row.date+'T'+row.time}>{row.time}</time><strong>{row.title}</strong>{row.sourceKind==='document'&&<small>{row.source}</small>}</span></label><div className="palace-row-actions"><button onClick={()=>edit(row)}>编辑</button><button onClick={()=>setDeleting(row)}>删除</button></div></li>)}</ul>{undated.length>0&&<section><h2>日期待确认</h2><ul className="palace-record-list">{undated.map(row=><li key={row.storeKey+row.id}><p>{row.title}</p><small>{row.source}</small><button onClick={()=>edit(row)}>补日期</button></li>)}</ul></section>}{editing!==undefined&&<PalaceDialog label="编辑日程" onClose={()=>setEditing(undefined)}><form onSubmit={e=>{e.preventDefault();run(()=>{if(editing)store().update({...editing,date:editing.date||date},{title,time,done:editing.done});else store().add(date,{title,time});setEditing(undefined)})}}><div role="status">{error}</div><h2>日程</h2><label>事项<input autoFocus value={title} maxLength={80} required onChange={e=>setTitle(e.target.value)}/></label><label>时间<input type="time" value={time} required onChange={e=>setTime(e.target.value)}/></label><div className="palace-row-actions"><button type="button" onClick={()=>setEditing(undefined)}>取消</button><button>保存</button></div></form></PalaceDialog>}{deleting&&<PalaceDialog label="删除日程" onClose={()=>setDeleting(undefined)}><div><div role="status">{error}</div><h2>删去这件事？</h2><p>{deleting.title}</p><div className="palace-row-actions"><button autoFocus onClick={()=>setDeleting(undefined)}>保留</button><button onClick={()=>run(()=>{store().remove(deleting);setDeleting(undefined)})}>确认删除</button></div></div></PalaceDialog>}</PalacePage>}
