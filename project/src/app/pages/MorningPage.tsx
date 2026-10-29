import {ChevronLeft} from 'lucide-react'
import {useEffect,useRef,useState} from 'react'
import {useNavigate,useSearchParams} from 'react-router-dom'
import wakeupVoice from '@/assets/audio/wakeup.wav'
import {CharacterStage} from '../components/CharacterStage'
import {CharacterShadow} from '../components/CharacterShadow'
import {createAlarmDismiss} from '../lib/alarm-dismiss'

export function MorningPage(){
 const nav=useNavigate(),[params]=useSearchParams(),requestedTime=params.get('time')
 const time=requestedTime&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(requestedTime)?requestedTime:undefined
 const [now,setNow]=useState(Date.now),[ringing,setRinging]=useState(false),[action,setAction]=useState<'greet'|'idle'>('idle'),[error,setError]=useState(''),[x,setX]=useState(0)
 const audio=useRef<HTMLAudioElement>(null),stop=useRef(()=>{}),active=useRef(false)
 const thumb=useRef<HTMLButtonElement>(null),track=useRef<HTMLDivElement>(null),drag=useRef<{pointer:number;start:number;travel:number}|undefined>(undefined)
 const dismiss=useRef(createAlarmDismiss(()=>{stop.current();nav('/court',{replace:true})})).current
 useEffect(()=>{
  const voice=audio.current!
  active.current=true;setRinging(false);setAction('idle');setError('');setX(0);setNow(Date.now())
  window.dispatchEvent(new CustomEvent('xiaoazi:music-exclusive',{detail:true}))
  // This deadline starts at page mount, independently of the formal-send reply delay.
  const timer=setTimeout(()=>{void voice.play().catch(()=>{if(active.current)setError('声音未能播放，请点按重试。')})},5000)
  const clock=setInterval(()=>setNow(Date.now()),1000)
  stop.current=()=>{active.current=false;clearTimeout(timer);clearInterval(clock);dismiss.cancel();voice.pause();voice.currentTime=0}
  const leave=()=>{stop.current();nav('/court',{replace:true})}
  const hide=()=>{if(document.hidden)leave()}
  window.addEventListener('pagehide',leave);window.addEventListener('xiaoazi:pause',leave);document.addEventListener('visibilitychange',hide)
  return()=>{stop.current();window.removeEventListener('pagehide',leave);window.removeEventListener('xiaoazi:pause',leave);document.removeEventListener('visibilitychange',hide);window.dispatchEvent(new CustomEvent('xiaoazi:music-exclusive',{detail:false}))}
 },[time])
 const cancelDrag=()=>{drag.current=undefined;dismiss.cancel();setX(0)}
 return <section className="palace-morning" data-ringing={ringing}>
  <audio ref={audio} src={wakeupVoice} loop preload="auto" onPlaying={()=>{if(active.current){setRinging(true);setAction('greet');setError('')}}}/>
  <button className="morning-back" aria-label="返回对话" disabled><ChevronLeft size={24}/></button>
  <header><p>{time?'晨起时辰':new Date(now).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'})}</p><time>{time??new Date(now).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time><small>{ringing?'陛下，该起了':'晨起闹铃'}</small></header>
  <div className="morning-character character-shell"><CharacterShadow/><CharacterStage action={action} hideVoiceRetry onActionEnd={()=>setAction('idle')}/></div>
  <div className="alarm-dismiss-track" data-dragging={Boolean(drag.current)} ref={track}><span>向右滑动，结束晨起</span><button ref={thumb} aria-label="向右滑动结束闹钟" style={{transform:`translateX(${x}px)`}} onPointerDown={e=>{const travel=track.current!.clientWidth-thumb.current!.offsetWidth-12;drag.current={pointer:e.pointerId,start:e.clientX,travel};e.currentTarget.setPointerCapture(e.pointerId);dismiss.begin(e.pointerId,e.clientX,travel,'page','foreground')}} onPointerMove={e=>{const d=drag.current;if(d?.pointer===e.pointerId)setX(Math.max(0,Math.min(d.travel,e.clientX-d.start)))}} onPointerUp={e=>{const ended=dismiss.end(e.pointerId,e.clientX,'page','foreground');drag.current=undefined;if(!ended)setX(0)}} onPointerCancel={cancelDrag} onLostPointerCapture={()=>{if(drag.current)cancelDrag()}}>››</button></div>
  {error&&<div className="morning-error" role="alert">{error}<button onClick={()=>void audio.current!.play().catch(()=>setError('声音未能播放，请检查声音设置。'))}>重试播放</button></div>}
 </section>
}
