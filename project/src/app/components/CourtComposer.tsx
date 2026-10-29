import {useEffect,useRef} from 'react'
import {Keyboard,Mic,Paperclip} from 'lucide-react'
import {canSend} from '../lib/ime'
import type {ComposerController,ComposerState} from '../lib/composer-controller'

export function CourtComposer({controller,state,onFocusChange,onAttach}:{controller:ComposerController;state:ComposerState;onFocusChange:(focus:boolean)=>void;onAttach:()=>void}){
 const input=useRef<HTMLInputElement>(null)
 const gesture=useRef<{id:number;x:number;y:number}|null>(null)
 const keyboardHeld=useRef(false)
 useEffect(()=>{
  const cancel=()=>{gesture.current=null;keyboardHeld.current=false;controller.holdCancel()},hide=()=>{if(document.hidden)cancel()}
  for(const event of ['blur','pagehide','xiaoazi:pause'])window.addEventListener(event,cancel)
  document.addEventListener('visibilitychange',hide)
  return()=>{cancel();for(const event of ['blur','pagehide','xiaoazi:pause'])window.removeEventListener(event,cancel);document.removeEventListener('visibilitychange',hide)}
 },[controller])
 useEffect(()=>{if(state.mode==='voice'){input.current?.blur();onFocusChange(false)}},[state.mode,onFocusChange])
 const phase=state.asr.phase,recording=['starting','listening','recognizing'].includes(phase)
 const hasDraft=canSend(state.draft)
 const label=state.holding?(phase==='starting'?'准备中 · 松手取消':'松开发送 · 上滑取消'):phase==='recognizing'?'正在识别…':state.submitting?'正在传旨…':'按住说话'
 function cancelGesture(){gesture.current=null;keyboardHeld.current=false;controller.holdCancel()}
 function textMode(){controller.switchMode('text');requestAnimationFrame(()=>input.current?.focus())}
 return <div className="court-dock" data-mode={state.mode} data-has-draft={hasDraft}>
  {state.mode==='voice'&&hasDraft&&<div className="composer-draft" role="status" aria-label="文字草稿">{state.draft}</div>}
  {recording&&state.asr.partial&&<div className="composer-draft composer-partial" role="status">{state.asr.partial}</div>}
  <form className="court-composer" onSubmit={event=>{event.preventDefault();void controller.submit()}}>
   <button type="button" className="composer-attach" aria-label="上传文档" onClick={onAttach}><Paperclip size={20}/></button>
   {state.mode==='voice'?<button type="button" className="composer-voice" aria-label={label} aria-pressed={Boolean(state.holding)} data-holding={Boolean(state.holding)} disabled={state.submitting}
    onContextMenu={event=>event.preventDefault()}
    onPointerDown={event=>{if(event.button!==0||!event.isPrimary||gesture.current)return;event.preventDefault();gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);void controller.holdStart()}}
    onPointerMove={event=>{const g=gesture.current;if(!g||g.id!==event.pointerId)return;if(event.clientY<g.y-56||Math.abs(event.clientX-g.x)>88||event.clientY>g.y+88)cancelGesture()}}
    onPointerUp={event=>{if(gesture.current?.id!==event.pointerId)return;gesture.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);void controller.holdEnd()}}
    onPointerCancel={event=>{if(gesture.current?.id===event.pointerId)cancelGesture()}}
    onLostPointerCapture={event=>{if(gesture.current?.id===event.pointerId)cancelGesture()}}
    onBlur={cancelGesture}
    onKeyDown={event=>{if(event.key==='Escape'){cancelGesture();return}if(event.key===' '||event.key==='Enter'){event.preventDefault();if(event.repeat||keyboardHeld.current)return;keyboardHeld.current=true;void controller.holdStart()}}}
    onKeyUp={event=>{if((event.key===' '||event.key==='Enter')&&keyboardHeld.current){event.preventDefault();keyboardHeld.current=false;void controller.holdEnd()}}}>
    <Mic size={20}/><span>{label}</span>
   </button>:<input ref={input} onFocus={()=>onFocusChange(true)} onBlur={()=>onFocusChange(false)} value={state.draft} onChange={event=>controller.edit(event.target.value)}
    onCompositionStart={()=>controller.compositionStart()} onCompositionEnd={()=>controller.compositionEnd()}
    onKeyDown={event=>{if(event.key==='Enter'&&event.shiftKey){event.preventDefault();return}const key={key:event.key,shiftKey:event.shiftKey,isComposing:event.nativeEvent.isComposing};if(controller.canEnter(key)){event.preventDefault();void controller.enter(key)}}}
    maxLength={4000} placeholder="陛下请下旨" aria-label="文字下旨" enterKeyHint="send" autoComplete="off"/>}
   <button type="button" className="composer-mode" aria-label={state.mode==='voice'?'切换键盘输入':'返回语音输入'} onClick={()=>{if(state.mode==='voice')textMode();else controller.switchMode('voice')}}>{state.mode==='voice'?<Keyboard size={21}/>:<Mic size={21}/>}</button>
  </form>
  {state.notice&&<p className={state.noticeAction?"composer-notice composer-media-notice":"composer-notice"} role="status">{state.notice}{state.noticeAction&&<button type="button" className="composer-retry" aria-label={state.noticeAction.label} onClick={state.noticeAction.run}>{state.noticeAction.label}</button>}</p>}
 </div>
}
