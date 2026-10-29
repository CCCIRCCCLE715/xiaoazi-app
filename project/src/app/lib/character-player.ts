import { createPlaybackGate } from './playback-gate'
export interface Clip { src:string; loop?:boolean; next?:string; displayHold?:{at:number;ms:number} }
type Slot={video:HTMLVideoElement;generation:number;token:number;key:string;callback:number;raf:number;timer?:ReturnType<typeof setTimeout>;pump?:ReturnType<typeof setInterval>;cancel?:()=>void;cancelHold?:()=>void;holding?:boolean;suspend?:()=>void;resume?:()=>void}
/** Two bounded decoders, a persistent surface, and promotion only on actual new frames. */
export function createCharacterPlayer(canvas:HTMLCanvasElement,videos:HTMLVideoElement[],clips:Record<string,Clip>,callbacks:{ended():void;error(message:string):void;frame?(key:string,requestToken?:number):void}) {
 const context=canvas.getContext('2d',{alpha:true})!,gate=createPlaybackGate()
 const probe=document.createElement('canvas');probe.width=probe.height=48
 const probeContext=probe.getContext('2d',{willReadFrequently:true})!,alpha=new Map<string,boolean>()
 const slots:Slot[]=videos.slice(0,2).map(video=>({video,generation:0,token:0,key:'',callback:0,raf:0}))
 let active:Slot|undefined,pending:Slot|undefined,disposed=false,requestedAt=0
 const suspensions=new Set<string>(document.hidden?['document']:[])
 const suspended=()=>suspensions.size>0
 let deferred:{slot:Slot;key:string;token:number}|undefined
 const followups=new Map<number,string>()
 const samples:object[]=[],stats={requests:0,merged:0,frames:0,switches:0,errors:0,alpha:{} as Record<string,boolean>,samples}
 ;(canvas as HTMLCanvasElement & {playbackStats:typeof stats}).playbackStats=stats
 const record=(event:string,slot?:Slot,extra={})=>{samples.push({event,key:slot?.key,time:Math.round(performance.now()),...extra});if(samples.length>120)samples.shift()}
 function stop(slot:Slot){++slot.generation;slot.cancelHold?.();slot.cancelHold=undefined;slot.cancel?.();slot.cancel=undefined;if(slot.callback&&slot.video.cancelVideoFrameCallback)slot.video.cancelVideoFrameCallback(slot.callback);cancelAnimationFrame(slot.raf);clearTimeout(slot.timer);clearInterval(slot.pump);slot.pump=undefined;slot.callback=slot.raf=0;slot.suspend=slot.resume=undefined;slot.video.pause();if(slot.video.src){slot.video.removeAttribute('src');slot.video.load()}}
 function transparent(video:HTMLVideoElement,key:string){const cached=alpha.get(video.src);if(cached!==undefined)return cached;probeContext.globalCompositeOperation='copy';probeContext.drawImage(video,0,0,48,48);const pixels=probeContext.getImageData(0,0,48,48).data;let clear=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]<8)clear++;if(pixels[i]>180)solid++}const valid=clear>48&&solid>16;alpha.set(video.src,valid);stats.alpha[key]=valid;return valid}
 function fail(slot:Slot,generation:number,reason:string){if(disposed||generation!==slot.generation)return;const relevant=gate.isActive(slot.token)||gate.isPending(slot.token);gate.fail(slot.token);stop(slot);if(pending===slot)pending=undefined;if(active===slot)active=undefined;if(!relevant)return;stats.errors++;record('error',slot,{reason});canvas.dataset.playbackError=reason;callbacks.error('动作暂未加载，点一下重试。');if(clips.idle&&slot.key!=='idle')request('idle')}
 function arm(slot:Slot,generation:number){clearTimeout(slot.timer);slot.timer=setTimeout(()=>fail(slot,generation,'frame-timeout'),10000)}
 function load(slot:Slot,key:string,token:number){
  stop(slot);slot.token=token;slot.key=key
  const generation=slot.generation,video=slot.video,clip=clips[key]
  let lastMediaTime=-1,first=true,fallbackStart=-1
  let holdUsed=false,holdTimer:ReturnType<typeof setTimeout>|undefined,playRevision=0,released=false,restoreTime:number|undefined
  video.muted=true;video.controls=false;video.playsInline=true;video.loop=Boolean(clip.loop);video.playbackRate=1;video.disablePictureInPicture=true;video.disableRemotePlayback=true
  const valid=()=>!disposed&&generation===slot.generation
  slot.cancelHold=()=>{holdUsed=true;clearTimeout(holdTimer);holdTimer=undefined;slot.holding=false}
  const present=(mediaTime:number)=>{
   if(!valid()||suspended()||video.seeking||video.readyState<2||!video.videoWidth||mediaTime===lastMediaTime)return
   if(!transparent(video,key)){fail(slot,generation,'decoded-alpha-unavailable');return}
   if(!gate.frame(token,true))return
   if(first){const old=active;active=slot;pending=undefined;first=false;if(old&&old!==slot)stop(old);stats.switches++;record('first-frame',slot,{latencyMs:Math.round(performance.now()-requestedAt),width:video.videoWidth,height:video.videoHeight});delete canvas.dataset.playbackError}
   context.globalCompositeOperation='copy';context.drawImage(video,0,0,canvas.width,canvas.height)
   lastMediaTime=mediaTime;stats.frames++;canvas.dataset.frames=String(stats.frames);canvas.dataset.frameTime=String(mediaTime);canvas.dataset.frameSource=video.currentSrc;canvas.dataset.action=key;if(canvas.parentElement)canvas.parentElement.dataset.painted='true';callbacks.frame?.(key,slot.token);arm(slot,generation)
   // Preserve the original opening and closing at 1x. Only the already painted,
   // readable open-scroll pose is held; the voice and independent BGM keep time.
   if(clip.displayHold&&!holdUsed&&mediaTime>=clip.displayHold.at){
    holdUsed=true;slot.holding=true;video.pause();clearTimeout(slot.timer)
    record('display-hold',slot,{mediaTime,ms:clip.displayHold.ms})
    holdTimer=setTimeout(()=>{
     holdTimer=undefined;slot.holding=false
     if(!valid()||suspended()||!gate.isActive(token)||pending)return
     record('display-resume',slot,{mediaTime:video.currentTime});arm(slot,generation)
     play()
    },clip.displayHold.ms)
   }
  }
  // Hidden/occluded video presentation callbacks can be throttled even when decoding is 24fps.
  // First-frame fences: fresh loadeddata (matching src + alpha probe), or rVFC.
  // Then sample advancing media-time textures at source cadence; prefetch counters are not frame indices.
  const next=()=>{if(!valid()||suspended()||!first)return;if(typeof video.requestVideoFrameCallback==='function')slot.callback=video.requestVideoFrameCallback((_now,metadata)=>{present(metadata.mediaTime);next()})}
  const pump=()=>{if(slot.pump!==undefined)return;slot.pump=setInterval(()=>{
   if(!valid()||suspended()||video.paused||video.seeking||video.readyState<2)return
   if(first){
    if(typeof video.requestVideoFrameCallback==='function')return
    if(fallbackStart<0){fallbackStart=video.currentTime;return}
    if(video.currentTime>fallbackStart)present(video.currentTime)
   } else if(Math.floor(video.currentTime*24)!==Math.floor(lastMediaTime*24))present(video.currentTime)
  },1000/24)}
  const decoded=()=>{if(valid() && first && video.currentSrc===new URL(clip.src,document.baseURI).href)present(video.currentTime)}
  const restore=()=>{if(!valid()||restoreTime===undefined)return;const at=restoreTime;restoreTime=undefined;video.currentTime=Number.isFinite(video.duration)&&video.duration>0?Math.min(at,Math.max(0,video.duration-.001)):at}
  const play=()=>{if(!valid()||suspended()||slot.holding||!gate.isActive(token)&&!gate.isPending(token))return;const revision=++playRevision;void video.play().catch(()=>{if(revision===playRevision&&!suspended())fail(slot,generation,'play-rejected')})}
  slot.suspend=()=>{++playRevision;slot.cancelHold?.();video.pause();clearTimeout(slot.timer);clearInterval(slot.pump);slot.pump=undefined;if(slot.callback&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(slot.callback);slot.callback=0;restoreTime=Number.isFinite(video.currentTime)?video.currentTime:0;released=true;video.removeAttribute('src');video.load()}
  slot.resume=()=>{if(!valid()||suspended()||!gate.isActive(token)&&!gate.isPending(token))return;if(released){released=false;video.src=clip.src;video.load()}pump();next();arm(slot,generation);if(video.readyState>=2)play()}
  const ended=()=>{if(!valid())return;clearTimeout(slot.timer);if(!gate.complete(token))return;const q=video.getVideoPlaybackQuality?.();record('ended',slot,{quality:q&&{dropped:q.droppedVideoFrames,total:q.totalVideoFrames}});active=undefined;stop(slot);const followup=followups.get(token);followups.delete(token);if(followup&&clips[followup])request(followup);else{callbacks.ended();if(clips.idle)request('idle')}}
  const error=()=>fail(slot,generation,'media-error-'+video.error?.code)
  video.addEventListener('loadedmetadata',restore);video.addEventListener('loadeddata',decoded);video.addEventListener('canplay',play);video.addEventListener('ended',ended);video.addEventListener('error',error)
  slot.cancel=()=>{video.removeEventListener('loadedmetadata',restore);video.removeEventListener('loadeddata',decoded);video.removeEventListener('canplay',play);video.removeEventListener('ended',ended);video.removeEventListener('error',error)}
  // Never seek and immediately copy an old decoded frame.
  video.src=clip.src;video.load();slot.resume();record('load',slot)
 }
 function request(key:string,followup?:string,restart=false):number|undefined{if(disposed)return;const clip=clips[key];if(!clip){if(key!=='idle'&&clips.idle)return request('idle');return}stats.requests++;const result=gate.request(key,restart);followups.clear();if(followup)followups.set(result.token,followup);else followups.delete(result.token);if(result.merged){stats.merged++;if(active?.key===key&&pending){stop(pending);pending=undefined;deferred=undefined}return result.token}if(active?.holding){gate.fail(active.token);stop(active)}else active?.cancelHold?.();requestedAt=performance.now();if(pending)stop(pending);pending=slots.find(slot=>slot!==active)!;if(suspended())deferred={slot:pending,key,token:result.token};else{deferred=undefined;load(pending,key,result.token)}return result.token}
 function suspend(reason:string,value:boolean){if(disposed)return;const before=suspended();if(value)suspensions.add(reason);else suspensions.delete(reason);if(before===suspended())return;if(suspended())slots.forEach(slot=>slot.suspend?.());else{const waiting=deferred;deferred=undefined;if(waiting)load(waiting.slot,waiting.key,waiting.token);slots.forEach(slot=>{if(slot!==waiting?.slot)slot.resume?.()})}record(suspended()?'pause':'resume',undefined,{reason})}
 const visibility=()=>suspend('document',document.hidden)
 const nativePause=()=>suspend('native',true),nativeResume=()=>suspend('native',false)
 const pageHide=()=>suspend('page',true),pageShow=()=>suspend('page',false)
 const menu=(event:Event)=>suspend('menu',Boolean((event as CustomEvent<boolean>).detail))
 const events:Record<string,(event:Event)=>void>={'xiaoazi:pause':nativePause,'xiaoazi:resume':nativeResume,pagehide:pageHide,pageshow:pageShow,'xiaoazi:menu-state':menu}
 document.addEventListener('visibilitychange',visibility)
 for(const [name,listener]of Object.entries(events))window.addEventListener(name,listener)
 return {request,stats,dispose(){if(disposed)return;disposed=true;deferred=undefined;gate.invalidate();slots.forEach(stop);document.removeEventListener('visibilitychange',visibility);for(const [name,listener]of Object.entries(events))window.removeEventListener(name,listener)}}
}
