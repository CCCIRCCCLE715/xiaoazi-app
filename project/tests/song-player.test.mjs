import test from 'node:test'
import assert from 'node:assert/strict'
let createSongPlayer
try{({createSongPlayer}=await import('../src/app/lib/song-player.ts'))}catch{}
function setup(){
 assert.equal(typeof createSongPlayer,'function','production song player required')
 const audio=new EventTarget();let calls=0,loads=0,reject,resolve,hidden=false
 Object.assign(audio,{src:'',currentTime:0,duration:30,paused:true,volume:1,loop:false,dataset:{},load(){loads++},pause(){this.paused=true;this.dispatchEvent(new Event('pause'))},play(){calls++;if(reject)return Promise.reject(reject);this.paused=false;return new Promise(r=>resolve=r)}})
 const states=[];const player=createSongPlayer(audio,s=>states.push(s),()=>hidden)
 return{audio,player,states,calls:()=>calls,loads:()=>loads,playing:()=>{audio.dispatchEvent(new Event('playing'));resolve?.()},reject:e=>reject=e,resolve:()=>resolve?.(),hide:()=>hidden=true}
}
test('no synthetic auto cue; only matching source action request cues once and actual playing drives progress',async()=>{
 const x=setup();x.player.begin(1,'preview.m4a');assert.equal(x.calls(),0);x.player.cue(0);assert.equal(x.calls(),0)
 x.player.cue(1);x.player.cue(1);assert.equal(x.calls(),1);assert.notEqual(x.states.at(-1).phase,'playing')
 x.playing();await Promise.resolve();assert.equal(x.states.at(-1).phase,'playing');x.audio.currentTime=9;x.audio.dispatchEvent(new Event('timeupdate'));assert.equal(x.states.at(-1).currentTime,9);assert.equal(x.states.at(-1).duration,30)
 x.audio.dispatchEvent(new Event('ended'));assert.equal(x.states.at(-1).phase,'ended');x.player.dispose()
})
test('pause cancels pending automatic cue and a delayed old play cannot revive stopped audio',async()=>{
 const x=setup();x.player.begin(1,'a.m4a');x.player.pause();x.player.cue(1);assert.equal(x.calls(),0)
 x.player.manualPlay();x.player.cancel();x.audio.paused=false;x.resolve();await Promise.resolve();assert.equal(x.audio.paused,true);assert.notEqual(x.states.at(-1).phase,'playing');x.player.dispose()
})
test('rapid new request rejects old cue, hidden cancels cue, blocked/errors remain retryable',async()=>{
 const x=setup();x.player.begin(1,'a.m4a');x.player.begin(2,'a.m4a');x.player.cue(1);assert.equal(x.calls(),0)
 x.reject(new Error('NotAllowedError'));x.player.cue(2);await Promise.resolve();await Promise.resolve();assert.equal(x.states.at(-1).phase,'blocked')
 x.reject(null);x.player.manualPlay();x.playing();await Promise.resolve();assert.equal(x.states.at(-1).phase,'playing')
 x.audio.dispatchEvent(new Event('error'));assert.equal(x.states.at(-1).phase,'error');const loads=x.loads();x.player.manualPlay();assert.equal(x.loads(),loads+1,'retry reloads a failed media resource');x.hide();x.player.cancel();const n=x.calls();x.player.cue(2);x.player.manualPlay();assert.equal(x.calls(),n);x.player.dispose()
})
test('voice overlap uses low gain then smooth restore; new request cancels obsolete gain ramp',async()=>{
 const x=setup();x.player.begin(1,'a.m4a');x.player.voice(true);x.player.manualPlay();assert.equal(x.audio.volume,.08);x.playing();await Promise.resolve();x.player.voice(false);await new Promise(r=>setTimeout(r,400));assert.equal(x.audio.volume,.6)
 x.player.voice(true);assert.equal(x.audio.volume,.08);x.player.voice(false);x.player.cancel();const v=x.audio.volume;await new Promise(r=>setTimeout(r,400));assert.equal(x.audio.volume,v);x.player.dispose()
})

test('blocked intro releases foreground gain; trusted intro retry ducks again and natural end restores song',async()=>{
 const {createSceneVoice,sceneVoiceIsForeground}=await import('../src/app/lib/scene-voice.ts')
 assert.equal(typeof sceneVoiceIsForeground,'function')
 const x=setup(),intro=new EventTarget();let blocked=true
 Object.assign(intro,{currentTime:0,src:'',loop:false,dataset:{},load(){},pause(){},play(){return blocked?Promise.reject(new Error('NotAllowedError')):Promise.resolve()}})
 const voice=createSceneVoice(intro,()=>{},()=>false,s=>x.player.voice(sceneVoiceIsForeground(s.state)))
 x.player.begin(1,'preview.m4a');voice.arm({id:1,action:'music-tap',src:'intro.mp3'});voice.frame('music-tap');await Promise.resolve();await Promise.resolve()
 x.player.manualPlay();assert.equal(x.audio.volume,.6,'silent blocked narration must not indefinitely duck song')
 blocked=false;voice.retry();assert.equal(x.audio.volume,.08);await Promise.resolve();intro.dispatchEvent(new Event('ended'));await new Promise(r=>setTimeout(r,400));assert.equal(x.audio.volume,.6)
 voice.dispose();x.player.dispose()
})

test('explicit tap can restart retained local song after background or voice cancellation; stale auto cue cannot',async()=>{
 const x=setup();x.player.begin(7,'bundled.m4a');x.player.cue(7);x.playing();x.player.cancel();const before=x.calls()
 x.player.cue(7);assert.equal(x.calls(),before)
 x.player.manualPlay();assert.equal(x.calls(),before+1,'retained source must be re-authorized by explicit tap');x.playing();assert.equal(x.states.at(-1).phase,'playing');x.player.dispose()
})
test('real media decode and network failures stay distinct from blocked autoplay in safe diagnostics',async()=>{
 const x=setup();x.player.begin(1,'bundled.m4a');x.audio.error={code:3};x.audio.dispatchEvent(new Event('error'))
 assert.equal(x.states.at(-1).failure,'decode');assert.equal(x.states.at(-1).mediaErrorCode,3)
 x.audio.error=null;x.reject(Object.assign(new Error('redacted'),{name:'NotSupportedError'}));x.player.manualPlay();await Promise.resolve();await Promise.resolve();assert.equal(x.states.at(-1).failure,'unsupported');assert.equal(x.states.at(-1).phase,'error');x.player.dispose()
})
