import {ImperialRoof} from './ImperialRoof'
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode,type PointerEvent} from 'react'
import {Check,Clock3,RotateCcw,Undo2,Stamp,X,Lightbulb,FilePenLine,Camera,Clapperboard,Image as ImageIcon,FolderCheck,Paperclip} from 'lucide-react'
import {createMemorialSession,type MemorialState,type MemorialDecision} from '../lib/memorial-session'
import {createMemorialGesture,type PaperView,type PaperPoint} from '../lib/memorial-gesture'
export interface MemorialItem {id:string;title:string;dateLabel:string;category:string;source:string;done:boolean;quote?:string;label?:string;description?:string;deliverable?:string}
interface Props {variant?:'work';sourceLabel?:string;selectionName?:string;onUpload?:()=>void;scope:string;items:MemorialItem[];ready:boolean;editing:boolean;editor?:ReactNode;error?:string;onRetry():void;onRevise(id:string):void;onSave():void;onCancelEdit():void;onHold(token?:number):void;onToggle(id:string):void;command?:'revise'|'hold'|'approve';commandNonce?:number}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches
/** One interactive paper. Rear edges never contain hidden tasks or focusable controls. */
export function TaskMemorialDeck(props:Props){
 const {scope,items}=props,ids=items.map(i=>i.id).join('\u001f')
 const [stored,setStored]=useState<{owner:object;state:MemorialState}>(),[view,setView]=useState<PaperView>(),[reviewing,setReviewing]=useState<string>(),[localError,setLocalError]=useState('')
 const session=useMemo(()=>{const owner={};return{owner,api:createMemorialSession({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},{key:scope,ids:items.map(i=>i.id)},state=>setStored({owner,state}))}},[scope,ids])
 const state=stored?.owner===session.owner?stored.state:session.api.state()
 const node=useRef<HTMLElement>(null),title=useRef<HTMLHeadingElement>(null),latest=useRef({props,state,session,reviewing});latest.current={props,state,session,reviewing}
 const gesture=useMemo(()=>createMemorialGesture({
  current:()=>({scope:latest.current.props.scope,id:latest.current.state.currentId}),
  save(id,decision){const l=latest.current;if(!l.props.ready||l.props.editing||l.reviewing)return{ok:false};const result=l.session.api.decide(id,decision);setLocalError(result.error||'');return result},
  read(){const n=node.current;if(!n)return{x:0,y:0};const m=new DOMMatrixReadOnly(getComputedStyle(n).transform);return{x:m.m41,y:m.m42}},
  draw(point,hint,strength=0){if(node.current){node.current.style.transform=transform(point,reduced());node.current.style.opacity='1'}const stamps=node.current?.querySelectorAll<HTMLElement>('[data-decision-stamp]');stamps?.forEach(n=>n.style.opacity=n.dataset.decisionStamp===hint?String(strength):'0')},
  change:setView,
  animate(kind,point,reduce){
   let cancelled=false,animation:Animation|undefined,frame=0,resolve!:()=>void
   const finished=new Promise<void>(r=>resolve=r)
   // React swaps the single foreground's content before the next opacity entrance.
   frame=requestAnimationFrame(()=>{if(cancelled){resolve();return}const n=node.current;if(!n){resolve();return}
    const ease=getComputedStyle(n).getPropertyValue('--ease-out').trim()||'cubic-bezier(0.23,1,0.32,1)'
    const from={transform:reduce?'none':getComputedStyle(n).transform,opacity:kind==='enter'?0:Number(getComputedStyle(n).opacity)}
    let to:{transform:string;opacity:number}={transform:'none',opacity:1}
    if(kind==='exit'){const length=Math.max(1,Math.hypot(point.x,point.y)),distance=(Math.hypot(innerWidth,innerHeight)+Math.hypot(n.offsetWidth,n.offsetHeight))*1.2;to={transform:reduce?'none':transform({x:point.x/length*distance,y:point.y/length*distance},false),opacity:0}}
    if(kind==='enter'){from.transform='none';n.style.transform='none';n.style.opacity='0'}
    animation=n.animate([from,to],{duration:reduce?80:kind==='enter'?300:200,easing:ease,fill:'both'})
    void animation.finished.then(()=>{if(!cancelled){n.style.transform=to.transform;n.style.opacity=String(to.opacity);animation?.cancel()}resolve()},resolve)
   })
   return{finished,cancel(){cancelled=true;cancelAnimationFrame(frame);animation?.cancel();resolve()} }
  },
 }),[])
 useLayoutEffect(()=>{session.api.resume();gesture.resume();session.api.open();gesture.reset();return()=>{session.api.dispose();gesture.dispose()}},[session,gesture])
 useLayoutEffect(()=>{if(!view||view.scope!==scope||!['exiting','entering','dragging','settling'].includes(view.phase)){gesture.reset()}},[state.currentId,scope,session])
 useEffect(()=>{const cancel=()=>{gesture.reset();setReviewing(undefined)},hide=()=>{if(document.hidden)cancel()};document.addEventListener('visibilitychange',hide);for(const name of ['pagehide','xiaoazi:memorial-cancel','xiaoazi:pause','xiaoazi:voice-stop'])window.addEventListener(name,cancel);return()=>{document.removeEventListener('visibilitychange',hide);for(const name of ['pagehide','xiaoazi:memorial-cancel','xiaoazi:pause','xiaoazi:voice-stop'])window.removeEventListener(name,cancel)}},[gesture])
 useLayoutEffect(()=>{const area=node.current?.querySelector<HTMLElement>('[data-memorial-scroll]');if(!area)return;const measure=()=>area.dataset.scrollable=String(area.scrollHeight>area.clientHeight+1);measure();const observer=new ResizeObserver(measure);observer.observe(area);const details=area.querySelector('details');details?.addEventListener('toggle',measure);return()=>{observer.disconnect();details?.removeEventListener('toggle',measure)}},[view?.id,reviewing,props.editing,items])
 const handled=useRef<number|undefined>(undefined),currentId=view?.scope===scope?view.id:state.currentId,item=items.find(i=>i.id===(reviewing||currentId)),locked=Boolean(reviewing)||!state.ready||!props.ready||props.editing||view?.phase==='exiting'||view?.phase==='entering'
 useEffect(()=>{if(props.commandNonce===undefined||props.commandNonce===handled.current)return;handled.current=props.commandNonce;if(props.command==='hold'){gesture.reset();props.onHold(props.commandNonce)}else if(props.command==='revise'&&currentId){gesture.reset();props.onRevise(currentId)}else if(props.command==='approve'&&!props.editing&&!reviewing)gesture.decide('approved',true,reduced())},[props.commandNonce])
 function sample(e:PointerEvent){return{id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp,primary:e.isPrimary}}
 function excluded(target:EventTarget|null){if(!(target instanceof Element))return true;if(target.closest('button,a,input,textarea,select,label,details,[contenteditable=true],[data-memorial-no-drag]'))return true;const scroll=target.closest<HTMLElement>('[data-memorial-scroll]');return Boolean(scroll&&scroll.scrollHeight>scroll.clientHeight+1)}
 function down(e:PointerEvent<HTMLElement>){if(locked||e.button!==0||excluded(e.target))return;if(gesture.down(sample(e),e.currentTarget.clientWidth)){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)}}
 function release(e:PointerEvent<HTMLElement>){gesture.up(sample(e),reduced());if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
 function choose(d:MemorialDecision,keyboard:boolean){if(!locked)gesture.decide(d,keyboard,reduced())}
 function undo(){gesture.reset();setReviewing(undefined);const result=session.api.undo();setLocalError(result.error||'');gesture.reset()}
 const reviewed=state.approved+state.declined,error=state.error||props.error||localError
 return <section className="imperial-card imperial-fullpage memorial-deck" data-card={props.variant||'todo'} data-scope={scope} data-save-state={error?'error':state.ready?'saved':'loading'} data-editing={props.editing} aria-label={props.variant==='work'?'工作奏折':'批奏折'}>
  <header className="memorial-heading"><div aria-hidden/><div><h2>{props.variant==='work'?'工作奏折':'批奏折'}</h2><p>{reviewed} / {items.length} 已批</p></div><span aria-hidden/></header>
  <div className="memorial-stack">
   <div className="memorial-rear memorial-rear-back" aria-hidden="true"/><div className="memorial-rear memorial-rear-front" aria-hidden="true"/>
   <article ref={node} className="memorial-paper" data-task-id={item?.id} data-phase={view?.phase||'idle'} data-reviewed={reviewing?state.decisions[reviewing]:undefined} aria-labelledby="memorial-task-title" onPointerDownCapture={e=>{if(e.isPrimary)gesture.pointerStart()}} onPointerDown={down} onPointerMove={e=>{if(gesture.move(sample(e)))e.preventDefault()}} onPointerUp={release} onPointerCancel={()=>gesture.cancel(reduced())} onLostPointerCapture={()=>{if(gesture.view().phase==='dragging')gesture.cancel(reduced())}} onClickCapture={e=>{if(e.detail>0&&gesture.consumeClick()){e.preventDefault();e.stopPropagation()}}}>
    {props.variant==='work'&&<div className="work-memorial-ornament" aria-hidden="true"><ImperialRoof/></div>}
    <div className="memorial-stamp memorial-stamp-left" data-decision-stamp="declined" aria-hidden="true">不准</div><div className="memorial-stamp memorial-stamp-right" data-decision-stamp="approved" aria-hidden="true">准奏</div>
    <div className="memorial-paper-top"><span>奏</span><span>{props.variant==='work'&&item&&<WorkIcon id={item.id}/>}<span>{item?.category||'军机处'}</span></span><span>折</span></div>
    {item?<><div className="memorial-reading" data-memorial-scroll tabIndex={0} aria-label="奏折内容">
     <p className="memorial-date">{item.dateLabel}</p><h3 id="memorial-task-title" ref={title} tabIndex={-1}>{item.title}</h3><p className="memorial-source">{props.sourceLabel||item.source}</p>
     {props.editing?<div className="memorial-editor" data-memorial-no-drag>{props.editor}</div>:<label className="memorial-done"><input type="checkbox" checked={item.done} disabled={!props.ready} onChange={()=>props.onToggle(item.id)}/><Check size={16}/><span>{item.done?'已完成':'标记完成'}</span></label>}
     {!props.editing&&item.description&&<details className="memorial-evidence memorial-work-details" key={item.id}><summary>工作详情</summary><p>{item.description}</p>{item.deliverable&&<><h4>交付内容</h4><p>{item.deliverable}</p></>}</details>}
     {props.variant==='work'&&<div className="memorial-work-file" data-memorial-no-drag>{props.selectionName&&<p><Paperclip size={14}/><span>{props.selectionName}</span></p>}{props.onUpload&&<button type="button" onClick={props.onUpload}>{props.selectionName?'更换工作文件':'选择工作文件'}</button>}</div>}
     {item.quote&&<details className="memorial-evidence"><summary>{item.label||'文件'} · 原文</summary><p>{item.quote}</p></details>}
     {reviewing&&<p className="memorial-reviewed-label">{state.decisions[reviewing]==='approved'?'已准奏':'已批不准'}</p>}
    </div>
    <div className="memorial-decision-actions" data-memorial-no-drag>{props.editing?<><button type="button" onClick={props.onCancelEdit}>取消修改</button><button type="button" className="memorial-primary" onClick={props.onSave}><Check size={16}/>保存</button></>:reviewing?<button type="button" onClick={()=>setReviewing(undefined)}>返回待批</button>:<><button type="button" disabled={locked} aria-label="不准当前奏折" onClick={e=>choose('declined',e.detail===0)}><X size={16}/>不准</button><button type="button" disabled={locked} className="memorial-primary" aria-label="准奏当前奏折" onClick={e=>choose('approved',e.detail===0)}><Stamp size={16}/>准奏</button></>}</div>
    </>:<div className="memorial-finished" data-memorial-scroll><Stamp size={32}/><h3 id="memorial-task-title">{state.complete?'奏折已批完':state.empty?'暂无奏折':'奏折读取中'}</h3>{state.complete&&<p>准奏 {state.approved} · 不准 {state.declined}</p>}{state.complete&&<details><summary>查看已批</summary><ol>{items.map(i=><li key={i.id}><button type="button" onClick={()=>setReviewing(i.id)}><span>{i.title}</span><small>{state.decisions[i.id]==='approved'?'准奏':'不准'}</small></button></li>)}</ol></details>}</div>}
   </article>
  </div>
  {error&&<div className="memorial-error" role="alert"><span>{error}</span><button type="button" onClick={()=>{const result=session.api.retry();setLocalError(result.error||'');props.onRetry();gesture.reset()}}>重试</button></div>}
  <footer className="memorial-tools"><button type="button" disabled={!state.canUndo||view?.phase==='exiting'||props.editing} onClick={undo}><Undo2 size={16}/><span>撤回上一份</span></button><button type="button" disabled={!item||props.editing||view?.phase==='exiting'} onClick={()=>{gesture.reset();props.onRevise(item!.id)}}><RotateCcw size={16}/><span>重拟</span></button><button type="button" onClick={()=>{gesture.reset();props.onHold()}}><Clock3 size={16}/><span>留中</span></button></footer>
  <span className="memorial-live sr-only" role="status" aria-live="polite" aria-atomic="true">{state.ready?`${reviewed}/${items.length} 已批。${item?.title||'奏折已批完'}`:''}</span>
 </section>
}
function transform(p:PaperPoint,reduce:boolean){return `translate3d(${p.x}px,${p.y}px,0) rotate(${reduce?0:Math.max(-8,Math.min(8,p.x/24))}deg)`}

function WorkIcon({id}:{id:string}){
 const icons={topics:Lightbulb,script:FilePenLine,record:Camera,edit:Clapperboard,cover:ImageIcon,delivery:FolderCheck}
 const Icon=icons[id.slice(id.lastIndexOf('-')+1) as keyof typeof icons]||FilePenLine
 return <Icon size={18} aria-hidden="true"/>
}
