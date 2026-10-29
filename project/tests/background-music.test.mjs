import test from 'node:test'
import assert from 'node:assert/strict'
let createBackgroundMusic
try{({createBackgroundMusic}=await import('../src/app/lib/background-music.ts'))}catch{}
const setup=()=>{assert.equal(typeof createBackgroundMusic,'function','background track must have its own lifecycle');const calls=[];const audio={src:'',currentTime:0,loop:false,muted:false,volume:1,pause(){calls.push('pause')},load(){calls.push('load')},play(){calls.push('play');return Promise.resolve()}};let hidden=false;return{audio,calls,player:createBackgroundMusic(audio,()=>hidden),hide:()=>hidden=true}}
test('BGM starts only with gesture, loops and same source does not restart across scenes',()=>{const{player,calls,audio}=setup();player.source('music.mp3');assert.equal(calls.filter(x=>x==='play').length,0);player.gesture();audio.currentTime=8;player.source('music.mp3');assert.equal(audio.currentTime,8);assert.equal(audio.loop,true);assert.equal(calls.filter(x=>x==='play').length,1)})
test('voice ducks music; end restores it; mute and background stop cannot be bypassed',async()=>{const{player,calls,audio,hide}=setup();player.source('music.mp3');player.gesture();const normal=audio.volume;player.duck(true);await new Promise(r=>setTimeout(r,180));assert.ok(audio.volume<normal);player.duck(false);await new Promise(r=>setTimeout(r,390));assert.equal(audio.volume,normal);player.mute(true);assert.equal(audio.muted,true);const n=calls.filter(x=>x==='play').length;player.gesture();assert.equal(calls.filter(x=>x==='play').length,n);player.mute(false);assert.equal(calls.filter(x=>x==='play').length,n+1);hide();player.suspend();player.gesture();assert.equal(calls.filter(x=>x==='play').length,n+1)})
test('duck retargets smoothly; suspension and disposal cancel the one active volume transition',async()=>{
 const {player,audio}=setup();player.source('music.mp3');player.gesture();player.duck(true);assert.equal(audio.volume,.16,'voice must not produce an instantaneous music jump');await new Promise(r=>setTimeout(r,55));assert.ok(audio.volume<.16&&audio.volume>.035)
 player.duck(false);await new Promise(r=>setTimeout(r,50));player.duck(true);await new Promise(r=>setTimeout(r,190));assert.ok(Math.abs(audio.volume-.035)<.00001)
 player.duck(false);await new Promise(r=>setTimeout(r,40));player.suspend();const stopped=audio.volume;await new Promise(r=>setTimeout(r,70));assert.equal(audio.volume,stopped)
 player.dispose();await new Promise(r=>setTimeout(r,40));assert.equal(audio.volume,stopped)
})

test('exclusive music scene suppresses global track and preserves mute and foreground gesture state',()=>{
 const {player,calls,audio}=setup();player.source('bgm.mp3');player.gesture();audio.currentTime=7
 player.exclusive(true);const n=calls.filter(x=>x==='play').length;player.gesture();assert.equal(calls.filter(x=>x==='play').length,n)
 player.exclusive(false);assert.equal(calls.filter(x=>x==='play').length,n+1);assert.equal(audio.currentTime,7)
 player.exclusive(true);player.mute(true);player.exclusive(false);assert.equal(calls.filter(x=>x==='play').length,n+1)
 player.exclusive(true);player.mute(false);player.suspend();player.exclusive(false);assert.equal(calls.filter(x=>x==='play').length,n+1)
 player.dispose()
})
