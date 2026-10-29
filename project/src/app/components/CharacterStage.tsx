import {marchPointClip} from '../lib/march-point'
import { useEffect, useRef, useState } from 'react'
import { createCharacterPlayer, type Clip } from '../lib/character-player'
import {createEndingVoiceFence} from '../lib/ending-voice-fence'
import {ENDING_APOLOGY} from '../lib/ending-apology-config'
import { MUSIC_GESTURE } from '../lib/music-config'
import { createSceneVoice, type VoiceCue } from '../lib/scene-voice'
import { cn } from '@/shared/lib/cn'
import idlePoster from '@/assets/character/actions-v4/neutral.png'
import idleVideo from '@/assets/character/actions-v4/idle-alpha.webm'
import thinkVideo from '@/assets/character/actions-v4/think-alpha.webm'
import greetVideo from '@/assets/character/actions-v4/greet-alpha.webm'
import scrollVideo from '@/assets/character/actions-v4/scroll-alpha.webm'
import listenVideo from '@/assets/character/actions-v4/listen-alpha.webm'
import pointVideo from '@/assets/character/actions-v4/point-alpha.webm'
import protectVideo from '@/assets/character/actions-v4/protect-alpha.webm'
import replyVideo from '@/assets/character/actions-v4/reply-alpha.webm'
import endingVideo from '@/assets/character/actions-v4/ending-alpha.webm'
export type ActionId = 'ending-apology'| 'music-tap'|'idle'|'listen'|'think'|'greet'|'scroll'|'present'|'point'|'protect'|'cower'|'cheer'|'reply'|'ending'
const CLIPS:Record<string,Clip> = {
  ...(ENDING_APOLOGY.previewEnabled&&ENDING_APOLOGY.src?{'ending-apology':{src:ENDING_APOLOGY.src,loop:false}}:{}),
  'music-tap':{src:MUSIC_GESTURE.src,loop:false},
  idle: {src:idleVideo, loop:true},
  think: {src:thinkVideo, loop:false},
  greet: {src:greetVideo, loop:false},
  scroll: {src:scrollVideo, loop:false, displayHold:{at:3,ms:3200}},
  listen: {src:listenVideo, loop:false},
  point: {src:pointVideo, loop:false},
  protect: {src:protectVideo, loop:false},
  reply: {src:replyVideo, loop:false},
  ending: {src:endingVideo, loop:false},
  present:{src:replyVideo},
}
/** Candidate limitations are preserved in the delivery manifest, not presented as acceptance. */
export const ACTION_CAVEATS:Partial<Record<ActionId,string>>={'music-tap':'内部预览候选：星角拉长、强高光折痕和短暂扁眼；最终未验收',scroll:'持闭卷开始/结束，未完成背后取藏',protect:'v2仅内部审片：摆动入场晚、换向偏快、提前松腰，未完全验收',cower:'拒收段不播放',cheer:'拒收段不播放'}
export function CharacterStage({action,nonce=0,voiceCue,className,onActionEnd,onPlaybackError,onRecovery,sequenceNext,onFrame,restartPoint=false,restartAction=false,hideVoiceRetry=false,pointHold=false}: {
 pointHold?:boolean;onRecovery?:(kind:'voice'|'video',recovery?:{message:string;retry:()=>void})=>void;hideVoiceRetry?:boolean;action:ActionId;voiceCue?:VoiceCue;sequenceNext?:ActionId;nonce?:number;className?:string;onActionEnd?:()=>void;onPlaybackError?:(message:string)=>void;onFrame?:(key:string,mediaTime?:number,source?:string)=>void;restartPoint?:boolean;restartAction?:boolean
}) {
 const clips=useRef({...CLIPS});clips.current.point=marchPointClip(CLIPS.point,pointHold)
 const canvasRef=useRef<HTMLCanvasElement>(null),decoderA=useRef<HTMLVideoElement>(null),decoderB=useRef<HTMLVideoElement>(null)
 const audioRef=useRef<HTMLAudioElement>(null)
 const voice=useRef<ReturnType<typeof createSceneVoice>|null>(null)
 const [voiceBlocked,setVoiceBlocked]=useState(false)
 const latestCue=useRef(voiceCue);latestCue.current=voiceCue
 const posterReady=useRef(false)
 const player=useRef<ReturnType<typeof createCharacterPlayer>|null>(null)
 const endingVoiceFence=useRef(createEndingVoiceFence()).current
 const lastRequestNonce=useRef<number|undefined>(undefined)
 const desired=useRef({action,nonce,voiceCue,sequenceNext});desired.current={action,nonce,voiceCue,sequenceNext}
 const callbacks=useRef({onActionEnd,onPlaybackError,onFrame,onRecovery});callbacks.current={onActionEnd,onPlaybackError,onFrame,onRecovery}
 useEffect(()=>{
  const controller=createSceneVoice(audioRef.current!,blocked=>{setVoiceBlocked(blocked);callbacks.current.onRecovery?.('voice',blocked?{message:'配音未播放，请重试。',retry:()=>voice.current?.retry()}:undefined)},()=>document.hidden,state=>window.dispatchEvent(new CustomEvent('xiaoazi:scene-voice-state',{detail:state})));voice.current=controller
  const hide=()=>{if(document.hidden)stop()}
  const stop=()=>{controller.stop();callbacks.current.onRecovery?.('video')}
  document.addEventListener('visibilitychange',hide)
  for(const event of ['pagehide','xiaoazi:pause','xiaoazi:voice-stop'])window.addEventListener(event,stop)
  return()=>{controller.dispose();voice.current=null;document.removeEventListener('visibilitychange',hide);for(const event of ['pagehide','xiaoazi:pause','xiaoazi:voice-stop'])window.removeEventListener(event,stop)}
 },[])
 useEffect(()=>{endingVoiceFence.arm(voiceCue?.action);voice.current?.arm(voiceCue);if(voiceCue&&posterReady.current&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){voice.current?.frame(voiceCue.action);callbacks.current.onFrame?.(voiceCue.action)}},[voiceCue])
 useEffect(()=>{
  const canvas=canvasRef.current!
  const renderer=createCharacterPlayer(canvas,[decoderA.current!,decoderB.current!],clips.current,{
   frame:(key,token)=>{if(!endingVoiceFence.accepts(key,token))return;voice.current?.frame(key);callbacks.current.onFrame?.(key,Number(canvas.dataset.frameTime),canvas.dataset.frameSource)},ended:()=>callbacks.current.onActionEnd?.(),error:message=>{
    callbacks.current.onPlaybackError?.(message)
    if(!callbacks.current.onRecovery)return
    const failed=desired.current
    voice.current?.stop()
    callbacks.current.onRecovery('video',{message:'动作未加载，请重试。',retry(){
     const current=desired.current
     if(document.hidden||current.action!==failed.action||current.nonce!==failed.nonce||current.voiceCue?.id!==failed.voiceCue?.id)return
     endingVoiceFence.arm(current.voiceCue?.action);voice.current?.arm(current.voiceCue)
     const token=player.current?.request(current.action,current.sequenceNext,true);endingVoiceFence.requested(current.action,token)
    }})
   },
  });player.current=renderer
  let cancelled=false
  const image=new Image();image.src=idlePoster
  void image.decode().then(()=>{if(cancelled||Number(canvas.dataset.frames)>0)return;const context=canvas.getContext('2d')!;context.globalCompositeOperation='copy';context.drawImage(image,0,0,canvas.width,canvas.height);if(canvas.parentElement)canvas.parentElement.dataset.painted='true';posterReady.current=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches&&latestCue.current){voice.current?.frame(latestCue.current.action);callbacks.current.onFrame?.(latestCue.current.action)}}).catch(()=>undefined)
  return()=>{cancelled=true;renderer.dispose();player.current=null}
 },[])
 useEffect(()=>{
  const explicitRequest=lastRequestNonce.current!==undefined&&lastRequestNonce.current!==nonce
  callbacks.current.onRecovery?.('video')
  lastRequestNonce.current=nonce
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const token=player.current?.request(action,sequenceNext,(action==='scroll'||action==='point'&&restartPoint||restartAction)&&explicitRequest);endingVoiceFence.requested(action,token)}
 },[action,nonce,sequenceNext,restartPoint,restartAction,voiceCue?.id])
 return <><div className={cn('character-renderer',className)} aria-hidden>
  <img src={idlePoster} alt="" className="character-initial" />
  <canvas ref={canvasRef} width={720} height={720} className="character-canvas" />
  {[decoderA,decoderB].map((ref,index)=><video key={index} ref={ref} muted playsInline controls={false} preload="auto" disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback" tabIndex={-1} className="character-decoder" />)}
  <audio ref={audioRef} data-scene-audio preload="auto" hidden />
 </div>
 {!hideVoiceRetry&&voiceBlocked&&voiceCue&&<button type="button" className="card-save scene-voice-retry" onClick={()=>voice.current?.retry()}>播放配音</button>}</>
}
