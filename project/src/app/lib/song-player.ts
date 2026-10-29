export type SongPhase='idle'|'ready'|'starting'|'playing'|'paused'|'blocked'|'ended'|'error'|'missing'
export interface SongState {phase:SongPhase;currentTime:number;duration:number;failure?:'autoplay'|'decode'|'network'|'unsupported'|'aborted'|'unknown';mediaErrorCode?:number;readyState?:number;networkState?:number}
/** A local audio element owns actual transport. Tokens only authorize future cues. */
export function createSongPlayer(audio:HTMLAudioElement,change:(state:SongState)=>void,isHidden=()=>document.hidden){
 let generation=0,token:number|undefined,armed=false,wanted=false,disposed=false,voiceActive=false
 let tween:ReturnType<typeof setInterval>|undefined,state:SongState={phase:'idle',currentTime:0,duration:0}
 const cancelTween=()=>{clearInterval(tween);tween=undefined}
 const gain=()=>voiceActive?.08:.6
 function update(phase=state.phase){
  state={...state,phase,readyState:audio.readyState??0,networkState:audio.networkState??0,mediaErrorCode:audio.error?.code??0,currentTime:Number.isFinite(audio.currentTime)?audio.currentTime:0,duration:Number.isFinite(audio.duration)?audio.duration:0};change({...state})
 }
 function pause(){generation++;armed=false;wanted=false;cancelTween();audio.pause();update(token===undefined?'idle':'paused')}
 function play(){
  if(disposed||token===undefined||isHidden()||!audio.src)return
  armed=false;wanted=true;const epoch=++generation;cancelTween();audio.volume=gain();update('starting')
  void audio.play().then(()=>{if(epoch!==generation&&!wanted)audio.pause()}).catch((error)=>{if(epoch!==generation||disposed||isHidden())return;wanted=false;const name=error?.name==='Error'?error?.message:error?.name;state.failure=name==='NotAllowedError'?'autoplay':name==='NotSupportedError'?'unsupported':name==='AbortError'?'aborted':'unknown';update(state.failure==='autoplay'?'blocked':'error')})
 }
 const playing=()=>{if(!wanted||disposed||isHidden()){audio.pause();return}update('playing')}
 const paused=()=>{if(state.phase==='playing'||state.phase==='starting')update('paused')}
 const time=()=>update()
 const ended=()=>{wanted=armed=false;cancelTween();update('ended')}
 const error=()=>{wanted=armed=false;cancelTween();state.failure=audio.error?.code===3?'decode':audio.error?.code===2?'network':audio.error?.code===4?'unsupported':audio.error?.code===1?'aborted':'unknown';audio.pause();update('error')}
 const waiting=()=>{if(wanted)update('starting')}
 const listeners:Record<string,()=>void>={playing,pause:paused,timeupdate:time,durationchange:time,loadedmetadata:time,ended,error,waiting,stalled:waiting}
 for(const [event,fn] of Object.entries(listeners))audio.addEventListener(event,fn)
 return{
  begin(next:number,source?:string){pause();token=next;armed=Boolean(source);audio.loop=false;audio.volume=gain();try{audio.currentTime=0}catch{};if(source){audio.src=source;audio.load()}else audio.removeAttribute('src');state={phase:source?'ready':'missing',currentTime:0,duration:0};change({...state})},
  cue(next:number){if(token===next&&armed&&!isHidden())play()},
  manualPlay(){if(!disposed&&audio.src&&token===undefined){token=-1;armed=false}if(state.phase==='error')audio.load();if(state.phase==='ended')try{audio.currentTime=0}catch{};play()},
  pause,
  cancel(){pause();token=undefined;update('idle')},
  voice(active:boolean){voiceActive=active;cancelTween();const to=gain();if(active||!wanted){audio.volume=to;return}const from=audio.volume,start=performance.now();tween=setInterval(()=>{const t=Math.min(1,(performance.now()-start)/350);audio.volume=from+(to-from)*t;if(t===1)cancelTween()},16)},
  snapshot:()=>({...state}),
  dispose(){if(disposed)return;pause();disposed=true;token=undefined;for(const [event,fn]of Object.entries(listeners))audio.removeEventListener(event,fn)},
 }
}
