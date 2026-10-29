import test from 'node:test'
import assert from 'node:assert/strict'
// Browser media playback is externally provided; assertions target the cue lifecycle.
let createSceneVoice
try { ({ createSceneVoice } = await import('../src/app/lib/scene-voice.ts')) } catch {}
const setup=()=>{
 assert.equal(typeof createSceneVoice,'function','mainline needs an independent scene audio lifecycle')
 const calls=[];let reject
 const audio={src:'',currentTime:0,loop:false,dataset:{},pause(){calls.push('pause')},load(){},play(){calls.push('play');return reject?Promise.reject(reject):Promise.resolve()}}
 const blocked=[];const player=createSceneVoice(audio,b=>blocked.push(b),()=>false)
 return {audio,calls,blocked,player,reject:e=>reject=e}
}
test('voice waits for a matching painted action and starts once across think-point-idle',async()=>{
 const {player,calls}=setup();player.arm({src:'meal.mp3',id:1,action:'think'});player.frame('idle');assert.equal(calls.filter(x=>x==='play').length,0)
 player.frame('think');player.frame('think');player.frame('point');player.frame('idle');await Promise.resolve();assert.equal(calls.filter(x=>x==='play').length,1)
})
test('new command cancels old recording and repeated scene arms one fresh recording',async()=>{
 const {player,calls,audio}=setup();player.arm({src:'meal.mp3',id:1,action:'think'});player.frame('think');audio.currentTime=12
 player.arm({src:'meal.mp3',id:2,action:'think'});assert.equal(audio.currentTime,0);player.frame('think');await Promise.resolve();assert.equal(calls.filter(x=>x==='play').length,2)
 player.arm(undefined);player.frame('think');assert.equal(calls.filter(x=>x==='play').length,2)
})
test('background cancellation prevents late frames or retry restarting sound',()=>{
 const {player,calls}=setup();player.arm({src:'meal.mp3',id:1,action:'think'});player.frame('think');player.stop();player.frame('think');player.retry();assert.equal(calls.filter(x=>x==='play').length,1)
})
test('autoplay rejection offers retry and an obsolete failure cannot reappear',async()=>{
 const {player,calls,blocked,reject}=setup();reject(new Error('NotAllowedError'));player.arm({src:'meal.mp3',id:1,action:'think'});player.frame('think');await Promise.resolve();await Promise.resolve();assert.equal(blocked.at(-1),true)
 reject(null);player.retry();await Promise.resolve();assert.equal(calls.filter(x=>x==='play').length,2);assert.equal(blocked.at(-1),false)
 player.arm({src:'meal.mp3',id:2,action:'think'});reject(new Error('old'));player.frame('think');player.stop();await Promise.resolve();await Promise.resolve();assert.equal(blocked.at(-1),false)
})

test('late play completion cannot revive a cancelled voice; natural end is observable',async()=>{
 let resolve;const events=[],audio=new EventTarget()
 Object.assign(audio,{src:'',currentTime:0,loop:false,paused:true,dataset:{},load(){},pause(){this.paused=true},play(){this.paused=false;return new Promise(r=>resolve=r)}})
 const v=createSceneVoice(audio,()=>{},()=>false,s=>events.push(s))
 v.arm({src:'intro.mp3',id:3,action:'idle'});v.frame('idle');v.stop();audio.paused=false;resolve();await Promise.resolve();assert.equal(audio.paused,true)
 v.arm({src:'intro.mp3',id:4,action:'idle'});v.frame('idle');resolve();await Promise.resolve();audio.dispatchEvent(new Event('ended'));assert.equal(events.at(-1).state,'ended');assert.equal(events.at(-1).id,4);v.dispose()
})

test('a full home greeting continues after reply animation returns to idle until explicitly stopped',async()=>{
 const {player,audio,calls}=setup();player.arm({src:'home-greeting.mp3',id:7,action:'reply'});player.frame('reply');await Promise.resolve()
 const pauses=calls.filter(x=>x==='pause').length;audio.currentTime=5;player.frame('idle');audio.currentTime=9.84;player.frame('idle')
 assert.equal(calls.filter(x=>x==='pause').length,pauses);assert.equal(calls.filter(x=>x==='play').length,1);assert.equal(audio.currentTime,9.84);assert.equal(audio.dataset.voiceState,'playing')
 player.stop();assert.equal(audio.currentTime,0);assert.equal(audio.dataset.voiceState,'idle')
})
