/** Global music owns a different audio element from the scene recording. */
export function createBackgroundMusic(audio:HTMLAudioElement,isHidden=()=>document.hidden) {
 let exclusive=false,generation=0
 let source='',muted=false,ducked=false,unlocked=false,disposed=false,tween:ReturnType<typeof setInterval>|undefined
 const cancel=()=>{clearInterval(tween);tween=undefined}
 const target=()=>ducked?.035:.16
 const volume=()=>{audio.volume=target();audio.muted=muted}
 const play=()=>{if(disposed||!source||muted||exclusive||!unlocked||isHidden())return;const token=generation;void audio.play().then(()=>{if(token!==generation&&(exclusive||muted||!unlocked||isHidden()))audio.pause()}).catch(()=>{/* next user gesture retries */})}
 function suspend(){generation++;cancel();audio.pause();unlocked=false}
 return {
  source(src?:string){if(disposed||source===(src??''))return;cancel();audio.pause();source=src??'';if(source){audio.src=source;audio.loop=true;volume();audio.load()}},
  gesture(){if(disposed)return;unlocked=true;play()},
  mute(value:boolean){if(disposed)return;cancel();muted=value;volume();if(muted)audio.pause();else play()},
  duck(value:boolean){
   if(disposed)return;cancel();ducked=value
   const from=audio.volume,to=target(),duration=value?150:350,start=performance.now()
   if(muted||!unlocked||isHidden()||from===to){audio.volume=to;return}
   // One retargetable linear gain ramp. Voice playback itself never waits for it.
   tween=setInterval(()=>{const progress=Math.min(1,(performance.now()-start)/duration);audio.volume=from+(to-from)*progress;if(progress===1)cancel()},16)
  },
  exclusive(value:boolean){if(disposed||exclusive===value)return;exclusive=value;generation++;cancel();if(value)audio.pause();else{volume();play()}},
  suspend,
  dispose(){disposed=true;suspend()},
 }
}
