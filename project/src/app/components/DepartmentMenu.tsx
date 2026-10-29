import {DepartmentIcon} from './DepartmentIcon'
import {useLayoutEffect,useRef,useState} from 'react'
import {Menu,X} from 'lucide-react'
import {DEPARTMENTS,type Department} from '../lib/departments'
import {createDepartmentDrawer} from '../lib/department-drawer'

export function DepartmentMenu({active,onOpening,onSelect}:{active?:Department;onOpening:()=>void;onSelect:(destination:Department)=>void}){
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),pane=useRef<HTMLElement>(null)
 const controller=useRef<ReturnType<typeof createDepartmentDrawer>|null>(null)
 const current=useRef({active,onOpening,onSelect});current.current={active,onOpening,onSelect}
 const outsideDown=useRef<number|undefined>(undefined)
 const [expanded,setExpanded]=useState(false)
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches
 useLayoutEffect(()=>{
  const node=dialog.current!,panel=pane.current!
  controller.current=createDepartmentDrawer({
   isOpen:()=>node.open,show:()=>node.showModal(),hide:()=>node.close(),
   focusRow(){const row=panel.querySelector<HTMLButtonElement>(`[data-department="${current.current.active??'home'}"]`);row?.focus({preventScroll:true});row?.scrollIntoView({block:'nearest',inline:'nearest'})},
   restoreFocus(){if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true})},
   read(){return{opacity:Number(getComputedStyle(node).opacity),transform:getComputedStyle(panel).transform}},
   apply(frame){node.style.opacity=String(frame.opacity);panel.style.transform=frame.transform},
   animate(frames,options){
    // WAAPI does not resolve CSS var() in easing, so read the existing semantic token.
    const timing={...options,easing:getComputedStyle(node).getPropertyValue('--ease-out').trim()||'ease-out'}
    const a=node.animate(frames.map(({opacity})=>({opacity})),timing)
    const p=panel.animate(frames.map(({transform})=>({transform})),timing)
    // Remove any inline values left by immediate keyboard navigation.
    node.style.opacity='';panel.style.transform=''
    return{get playState(){return a.playState},finished:Promise.all([a.finished,p.finished]),cancel(){a.cancel();p.cancel()}}
   },
  },()=>current.current.onOpening(),setExpanded)
  return()=>{controller.current?.dispose();controller.current=null}
 },[])
 const close=(keyboard:boolean)=>{outsideDown.current=undefined;controller.current?.close(keyboard,reduced())}
 return <>
  <button ref={trigger} type="button" className="department-menu-trigger" aria-label="打开菜单" aria-haspopup="dialog" aria-controls="department-menu" aria-expanded={expanded} onClick={event=>controller.current?.open(event.detail===0,reduced())}><Menu size={24}/></button>
  <dialog ref={dialog} id="department-menu" className="department-menu-dialog" aria-labelledby="department-menu-title"
   onCancel={event=>{event.preventDefault();close(true)}}
   onPointerDown={event=>{outsideDown.current=event.target===event.currentTarget?event.pointerId:undefined}}
   onPointerCancel={()=>{outsideDown.current=undefined}}
   onClick={event=>{if(event.target===event.currentTarget&&outsideDown.current!==undefined)close(false);outsideDown.current=undefined}}>
   <aside ref={pane} className="department-menu-pane">
    <header><h2 id="department-menu-title">菜单</h2><button type="button" aria-label="关闭菜单" onClick={event=>close(event.detail===0)}><X size={20}/></button></header>
    <nav aria-label="内廷栏目">{DEPARTMENTS.map(item=><button key={item.id} data-department={item.id} type="button" aria-current={active===item.id?'page':undefined} onClick={event=>{current.current.onSelect(item.id);close(event.detail===0)}}><DepartmentIcon department={item.id}/><span>{item.label}</span></button>)}</nav>
   </aside>
  </dialog>
 </>
}
