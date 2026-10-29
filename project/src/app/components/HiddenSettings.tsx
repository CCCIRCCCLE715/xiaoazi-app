import {useEffect,useRef,useState} from 'react'
import {Settings2} from 'lucide-react'
import {createHiddenSettingsController} from '../lib/hidden-settings'
export function HiddenSettings({onOpen}:{onOpen:()=>void}){
 const [visible,setVisible]=useState(false),[keyboard,setKeyboard]=useState(false)
 const button=useRef<HTMLButtonElement>(null),open=useRef(onOpen);open.current=onOpen
 const controller=useRef<ReturnType<typeof createHiddenSettingsController>|null>(null)
 if(!controller.current)controller.current=createHiddenSettingsController({onOpen:()=>open.current(),onChange:setVisible})
 useEffect(()=>{const c=controller.current!;c.resume()
  const outside=(event:PointerEvent)=>{if(!button.current?.contains(event.target as Node))c.hide()}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')c.hide()}
  const hide=()=>c.hide()
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);window.addEventListener('pagehide',hide);window.addEventListener('xiaoazi:pause',hide)
  return()=>{c.dispose();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('pagehide',hide);window.removeEventListener('xiaoazi:pause',hide)}
 },[])
 return <button ref={button} type="button" className="court-hidden-settings" data-visible={visible} data-keyboard={keyboard} aria-label={visible?'打开模型与语音设置':'显示模型与语音设置'}
  onKeyDown={event=>{setKeyboard(true);if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault()}}
  onBlur={()=>controller.current?.hide()} onClick={event=>{setKeyboard(event.detail===0);controller.current?.activate()}}>
  <Settings2 size={20} aria-hidden="true"/>
 </button>
}
