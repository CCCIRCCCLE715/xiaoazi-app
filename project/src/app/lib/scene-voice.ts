export interface VoiceCue { src:string; id:number; action:string }
export interface VoiceState {id?:number;state:'idle'|'armed'|'starting'|'playing'|'blocked'|'ended'|'error'}
export const sceneVoiceIsForeground=(state:VoiceState['state'])=>['armed','starting','playing'].includes(state)
/** One recording per explicit command; visual followups never own its lifetime. */
export function createSceneVoice(audio:HTMLAudioElement,onBlocked:(blocked:boolean)=>void,isHidden=()=>document.hidden,onState?:(state:VoiceState)=>void) {
 let cue:VoiceCue|undefined,generation=0,armed=false,blocked=false,disposed=false,wanted=false
 const mark=(state:VoiceState['state'],id=cue?.id)=>{audio.dataset.voiceState=state;onState?.({state,id})}
 function stop(){const id=cue?.id;generation++;cue=undefined;armed=blocked=wanted=false;audio.pause();try{audio.currentTime=0}catch{};mark('idle',id);onBlocked(false)}
 function play(){
  if(!cue||disposed||isHidden())return
  const token=generation;armed=false;blocked=false;wanted=true;onBlocked(false);mark('starting')
  void audio.play().then(()=>{if(token===generation){mark('playing');onBlocked(false)}else if(!wanted)audio.pause()}).catch(()=>{
   if(token!==generation||disposed||isHidden())return
   wanted=false;blocked=true;mark('blocked');onBlocked(true)
  })
 }
 const playing=()=>{if(!wanted||disposed||isHidden())audio.pause();else mark('playing')}
 const ended=()=>{if(!cue)return;wanted=false;mark('ended')}
 const error=()=>{if(!cue)return;wanted=false;blocked=true;mark('error');onBlocked(true)}
 audio.addEventListener?.('playing',playing);audio.addEventListener?.('ended',ended);audio.addEventListener?.('error',error)
 return {
  arm(next:VoiceCue|undefined){stop();if(!next||disposed)return;cue=next;armed=true;audio.loop=false;audio.src=next.src;audio.load();audio.dataset.voiceCue=String(next.id);mark('armed')},
  frame(action:string){if(armed&&cue?.action===action)play()},
  retry(){if(blocked){if(audio.dataset.voiceState==='error')audio.load();play()}},
  stop,
  dispose(){stop();disposed=true;audio.removeEventListener?.('playing',playing);audio.removeEventListener?.('ended',ended);audio.removeEventListener?.('error',error)},
 }
}
