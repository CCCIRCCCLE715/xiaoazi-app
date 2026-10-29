import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Upload, X } from 'lucide-react'
import { createSongPlayer, type SongState } from '../lib/song-player'
import { recordMediaDiagnostic } from '../lib/native-assistant'
import { MUSIC_TRACK, MUSIC_GESTURE } from '../lib/music-config'
import { sceneVoiceIsForeground, type VoiceState } from '../lib/scene-voice'

const clock=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,seconds)%60).toString().padStart(2,'0')}`
/** Card transport is driven by audio events; no timers simulate a tap, progress or playing. */
export function MusicCard({requestToken,voiceId,tapToken,onClose,onCancelAuto}:{requestToken:number;voiceId?:number;tapToken?:number;onClose:()=>void;onCancelAuto?:()=>void}){
 const audio=useRef<HTMLAudioElement>(null),player=useRef<ReturnType<typeof createSongPlayer>|null>(null),file=useRef<HTMLInputElement>(null)
 const [state,setState]=useState<SongState>({phase:'ready',currentTime:0,duration:0})
 const [track,setTrack]=useState<{src:string;title:string;artist:string;kind:string}>({...MUSIC_TRACK})
 const playButton=useRef<HTMLButtonElement>(null),ripple=useRef<HTMLSpanElement>(null)
 const objectUrl=useRef<string|undefined>(undefined)
 // Native f63 right-lower tip: alpha>128 bottom band x1245.8/y1314 in1440 square.
 // Match the contained square, not the wider shell, so short screens remain aligned.
 useLayoutEffect(()=>{
  const button=playButton.current!,shell=button.closest('.court-screen')?.querySelector('.character-shell')
  if(!shell)return
  const resize=()=>{const rect=shell.getBoundingClientRect(),side=Math.min(rect.width,rect.height);button.style.left=`calc(50% + ${side*(1245.8/1440-.5)}px - 24px)`;button.style.top=`${6-side*(1-1314/1440)}px`}
  resize();const observer=new ResizeObserver(resize);observer.observe(shell);return()=>observer.disconnect()
 },[])

 const voiceIdRef=useRef(voiceId);voiceIdRef.current=voiceId
 const intro=useRef({id:voiceId,active:voiceId!==undefined});if(intro.current.id!==voiceId)intro.current={id:voiceId,active:voiceId!==undefined}
 useEffect(()=>{
  const controller=createSongPlayer(audio.current!,setState);player.current=controller
  const voice=(event:Event)=>{const value=(event as CustomEvent<VoiceState>).detail;if(value.id!==voiceIdRef.current)return;intro.current.active=sceneVoiceIsForeground(value.state);controller.voice(intro.current.active)}
  const cancel=()=>controller.cancel(),hide=()=>{if(document.hidden)cancel()}
  window.addEventListener('xiaoazi:scene-voice-state',voice);document.addEventListener('visibilitychange',hide)
  for(const event of ['pagehide','xiaoazi:pause','xiaoazi:voice-stop'])window.addEventListener(event,cancel)
  return()=>{controller.dispose();player.current=null;window.removeEventListener('xiaoazi:scene-voice-state',voice);document.removeEventListener('visibilitychange',hide);for(const event of ['pagehide','xiaoazi:pause','xiaoazi:voice-stop'])window.removeEventListener(event,cancel);if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)}
 },[])
 useEffect(()=>{player.current?.begin(requestToken,track.src);player.current?.voice(intro.current.active)},[requestToken,track.src,voiceId])
 useEffect(()=>{
  if(!MUSIC_GESTURE.previewEnabled||tapToken!==requestToken)return
  player.current?.cue(requestToken)
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
  const animations=[playButton.current?.animate(reduced?[{opacity:.75},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:140,easing:'cubic-bezier(0.23,1,0.32,1)'}),ripple.current?.animate(reduced?[{opacity:.6},{opacity:0}]:[{opacity:.6,transform:'scale(1)'},{opacity:0,transform:'scale(1.18)'}],{duration:200,easing:'cubic-bezier(0.23,1,0.32,1)'})]
  return()=>animations.forEach(a=>a?.cancel())
 },[tapToken,requestToken])
 useEffect(()=>{const active=state.phase==='playing';window.dispatchEvent(new CustomEvent('xiaoazi:music-exclusive',{detail:active}));recordMediaDiagnostic(state);return()=>{if(active)window.dispatchEvent(new CustomEvent('xiaoazi:music-exclusive',{detail:false}))}},[state.phase,state.failure])
 const playing=state.phase==='playing',starting=state.phase==='starting'
 const label=state.phase==='blocked'?'点按开始播放':state.phase==='error'?(state.failure==='decode'?'音频解码失败，可选本地曲目':state.failure==='unsupported'?'本机暂不支持此音频':state.failure==='network'?'音频读取失败，点按重试':'播放失败，点按重试'):state.phase==='ended'?(track.kind==='官方试听'?'试听结束':'播放结束'):state.phase==='missing'?'请选本地曲目':track.kind
 return <section className="imperial-card music-card" data-card="music" data-song-state={state.phase} aria-label="垂帘听曲">
  <div className="card-grabber" aria-hidden/>
  <header className="music-heading"><h2>垂帘听曲</h2><button ref={playButton} type="button" className="music-play" aria-label={playing||starting?'暂停':'播放'} data-playing={playing} onClick={()=>{onCancelAuto?.();if(playing||starting)player.current?.pause();else player.current?.manualPlay()}}><span ref={ripple} className="music-press-ring" aria-hidden/>{playing||starting?<Pause size={25}/>:<Play size={25}/>}</button><button className="court-icon-button" aria-label="收起听曲" onClick={onClose}><X size={19}/></button></header>
  <div className="music-summary">
   <div className="music-vinyl" data-playing={playing} aria-hidden><div className="music-label"><span>曲</span></div></div>
   <div className="music-title"><h3>{track.title}</h3><p>{track.artist}</p><span aria-live="polite">{label}</span></div>
  </div>
  <div className="music-progress"><progress aria-label="播放进度" max={state.duration||1} value={state.currentTime}/><div><time>{clock(state.currentTime)}</time><time>{clock(state.duration)}</time></div></div>
  <div className="music-controls"><button disabled aria-label="上一首" title="暂无其他曲目"><SkipBack size={23}/></button>

   <button disabled aria-label="下一首" title="暂无其他曲目"><SkipForward size={23}/></button></div>
  <footer className="music-footer"><span>仅一首</span><button type="button" onClick={()=>file.current?.click()}><Upload size={14}/>选本地曲目</button></footer>
  <input ref={file} type="file" accept="audio/*" className="sr-only" aria-label="选择本地音频" onChange={event=>{
   const selected=event.currentTarget.files?.[0];if(!selected)return
   onCancelAuto?.();player.current?.cancel();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)
   const src=URL.createObjectURL(selected);objectUrl.current=src;setTrack({src,title:selected.name.replace(/\.[^.]+$/,''),artist:'本地曲目',kind:'本次会话'});event.currentTarget.value=''
  }}/>
  <audio ref={audio} data-song-audio preload="metadata" hidden/>
 </section>
}
