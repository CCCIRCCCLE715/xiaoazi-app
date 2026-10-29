import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createSceneVoice } from '../src/app/lib/scene-voice.ts'
import { createMarchPresentation } from '../src/app/lib/march-presentation.ts'
import { createBackgroundMusic } from '../src/app/lib/background-music.ts'
const require=createRequire(import.meta.url)
const {buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/character-player.ts',import.meta.url).pathname)],bundle:true,platform:'node',format:'esm',write:false}).outputFiles[0].text
const {createCharacterPlayer}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))

// Deterministic media adapters: exercise production controllers, not codec/DOM rendering.
function setup(t){
 t.mock.timers.enable({apis:['setTimeout','setInterval']})
 const original={document:globalThis.document,performance:globalThis.performance,cancelAnimationFrame:globalThis.cancelAnimationFrame}
 let now=0
 const doc=new EventTarget();doc.hidden=false;doc.baseURI='https://app.local/'
 const pixels=new Uint8ClampedArray(48*48*4);for(let i=100;i<48*48;i++)pixels[i*4+3]=255
 doc.createElement=()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})
 globalThis.document=doc;globalThis.performance={now:()=>now};globalThis.cancelAnimationFrame=()=>{}
 class Media extends EventTarget{
  src='';currentSrc='';currentTime=0;readyState=0;videoWidth=1440;videoHeight=1440;paused=true;loop=false;playbackRate=1;plays=0;dataset={};ended=false
  load(){this.currentTime=0;this.readyState=0;this.currentSrc=new URL(this.src,doc.baseURI).href;this.ended=false}
  decode(){this.readyState=2;this.dispatchEvent(new Event('loadeddata'));this.dispatchEvent(new Event('canplay'))}
  play(){this.plays++;this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve()}
  pause(){if(!this.paused){this.paused=true;this.dispatchEvent(new Event('pause'))}}
  finish(){this.paused=true;this.ended=true;this.dispatchEvent(new Event('ended'))}
 }
 const videos=[new Media(),new Media()],audio=new Media(),bgm=new Media(),commits=[]
 const music=createBackgroundMusic(bgm,()=>doc.hidden);music.source('bgm.mp3');music.gesture()
 for(const event of ['playing','pause','ended','error'])audio.addEventListener(event,()=>music.duck(event==='playing'))
 const voice=createSceneVoice(audio,()=>{},()=>doc.hidden)
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden){voice.stop();music.suspend()}})
 const canvas={dataset:{},width:1440,height:1440,parentElement:{dataset:{}},getContext:()=>({drawImage:v=>commits.push({src:v.currentSrc,time:v.currentTime,wall:now})})}
 let ended=0,uiToken=1
 const uiPhases=[];const journey=createMarchPresentation(phase=>uiPhases.push(phase));journey.arm(uiToken)
 const player=createCharacterPlayer(canvas,videos,{idle:{src:'idle.webm',loop:true},scroll:{src:'scroll.webm',loop:false,displayHold:{at:3,ms:3200}},point:{src:'point.webm'}},{ended:()=>ended++,frame:key=>{voice.frame(key);if(key==='point')journey.frame(uiToken)},error:message=>assert.fail(message)})
 const start=(id=1)=>{voice.arm({src:'poem.mp3',id,action:'scroll'});player.request('scroll',undefined,true);const v=videos.find(v=>!v.paused||v.readyState===0&&v.src==='scroll.webm');v.decode();return v}
 const step=ms=>{for(let left=ms;left>0;){const dt=Math.min(40,left);left-=dt;now+=dt;for(const v of videos){if(!v.paused){v.currentTime+=dt/1000;const end=v.src==='point.webm'?3.75:6.5833333333;if(!v.loop&&v.currentTime>=end){v.currentTime=end;v.finish()}}}if(!audio.paused){audio.currentTime+=dt/1000;const end=audio.src==='march.mp3'?8.765578:9.493832;if(audio.currentTime>=end){audio.currentTime=end;audio.finish()}}t.mock.timers.tick(dt)}}
 t.after(()=>{journey.cancel();player.dispose();voice.stop();music.dispose();t.mock.timers.reset();for(const [k,v] of Object.entries(original))if(v===undefined)delete globalThis[k];else globalThis[k]=v})
 return {doc,videos,audio,bgm,voice,player,canvas,commits,start,step,uiPhases,armUI:id=>{uiToken=id;journey.arm(id)},ended:()=>ended}
}

test('poem pauses once only after an open frame, holds it 3.2s and keeps audio advancing',t=>{
 const x=setup(t),v=x.start();x.step(3120)
 assert.equal(v.paused,true,'open-scroll display needs an intentional hold')
 const at=v.currentTime,frames=x.commits.length;assert.ok(at>=3&&at<3.1)
 v.dispatchEvent(new Event('canplay'));assert.equal(v.paused,true,'canplay must not bypass a display hold')
 x.step(2800);assert.equal(v.currentTime,at);assert.equal(x.commits.length,frames);assert.equal(x.audio.plays,1);assert.ok(x.audio.currentTime>5.8)
 assert.ok(x.bgm.volume<.04,'recording ducks independent BGM')
 x.step(480);assert.equal(v.paused,false);assert.ok(v.currentTime>at)
 assert.equal(v.playbackRate,1);assert.equal(v.loop,false)
})
test('repeated poem during display restarts one fresh video and voice, and cancels obsolete release',t=>{
 const x=setup(t),old=x.start();x.step(3120);assert.equal(old.paused,true)
 x.voice.arm({src:'poem.mp3',id:2,action:'scroll'});x.player.request('scroll',undefined,true)
 const fresh=x.videos.find(v=>v!==old);assert.equal(fresh.currentTime,0)
 assert.equal(x.audio.plays,1,'new audio must wait for new decoded frame')
 fresh.decode();assert.equal(x.audio.plays,2);assert.equal(x.audio.currentTime,0)
 x.step(3280);assert.equal(old.paused,true);assert.equal(fresh.paused,true);assert.equal(x.audio.plays,2)
})
test('scene switch while holding cannot resume or finish old scroll; previous pixels survive new decode',t=>{
 const x=setup(t),old=x.start();x.step(3120);const last=x.commits.at(-1)
 x.voice.arm(undefined);x.player.request('point');assert.deepEqual(x.commits.at(-1),last)
 old.dispatchEvent(new Event('canplay'));assert.equal(old.paused,true)
 x.step(4000);assert.equal(old.paused,true,'old display timer must not resume after switch')
 const next=x.videos.find(v=>v!==old);next.decode();assert.match(x.commits.at(-1).src,/point/);assert.equal(x.audio.plays,1);assert.equal(x.audio.paused,true)
})
test('background cancels voice and display release, and does not resurrect it on return',t=>{
 const x=setup(t),old=x.start();x.step(3120);x.doc.hidden=true;x.doc.dispatchEvent(new Event('visibilitychange'));x.step(5000)
 assert.equal(old.paused,true);assert.equal(x.audio.paused,true);assert.equal(x.audio.currentTime,0)
 x.doc.hidden=false;x.doc.dispatchEvent(new Event('visibilitychange'));x.step(1200);assert.equal(x.audio.plays,1)
})
test('natural presentation keeps the role until after voice end, then closes once and restores BGM',t=>{
 const x=setup(t),v=x.start();x.step(9600)
 assert.equal(x.audio.ended,true);assert.equal(x.audio.plays,1);assert.equal(x.ended(),0,'must not return to idle before voice finishes')
 x.step(600);assert.equal(x.ended(),1);assert.equal(x.player.stats.samples.filter(e=>e.event==='ended'&&e.key==='scroll').length,1);assert.ok(x.bgm.volume>=.159)
 const holds=x.player.stats.samples.filter(e=>e.event==='display-hold');assert.equal(holds.length,1)
 assert.equal(x.audio.plays,1)
})
test('stop during poem display prevents any delayed resume',t=>{
 const x=setup(t),old=x.start();x.step(3120);x.voice.stop();x.player.request('idle');x.step(5000)
 assert.equal(old.paused,true);assert.equal(x.audio.paused,true);assert.equal(x.audio.currentTime,0);assert.equal(x.audio.plays,1)
})
test('ordinary redundant scroll request merges without resetting its current display or voice',t=>{
 const x=setup(t),v=x.start();x.step(3120);const at=v.currentTime,loads=x.player.stats.switches
 x.player.request('scroll');x.step(200)
 assert.equal(v.currentTime,at);assert.equal(v.paused,true);assert.equal(x.player.stats.switches,loads);assert.equal(x.player.stats.merged,1);assert.equal(x.audio.plays,1)
})
test('explicit replay before display hold cannot start new voice from old advancing frames',t=>{
 const x=setup(t),old=x.start();x.step(1000)
 x.voice.arm({src:'poem.mp3',id:2,action:'scroll'});x.player.request('scroll',undefined,true)
 const last=x.commits.at(-1);x.step(500)
 assert.equal(x.audio.plays,1);assert.deepEqual(x.commits.at(-1),last)
 const fresh=x.videos.find(v=>v!==old);fresh.decode()
 assert.equal(fresh.currentTime,0);assert.equal(x.audio.currentTime,0);assert.equal(x.audio.plays,2);assert.equal(old.paused,true)
})
test('march points at1x for3.75s then idles while independent8.77s voice finishes naturally',t=>{
 const x=setup(t);x.voice.arm({src:'march.mp3',id:1,action:'point'});x.player.request('point',undefined,true)
 const point=x.videos.find(v=>v.src==='point.webm');assert.equal(x.audio.plays,0);point.decode();assert.equal(x.audio.plays,1)
 x.step(3800);assert.equal(x.ended(),1);assert.equal(x.audio.paused,false);assert.ok(x.audio.currentTime>3.7)
 const idle=x.videos.find(v=>v.src==='idle.webm');idle.decode();x.step(5500)
 assert.equal(x.audio.ended,true);assert.equal(x.audio.plays,1);assert.ok(x.bgm.volume>=.159)
 assert.equal(x.player.stats.samples.filter(e=>e.event==='display-hold'&&e.key==='point').length,0);assert.equal(point.playbackRate,1)
})
test('explicit march replay fences old point frames; stop cannot resurrect old voice',t=>{
 const x=setup(t);x.voice.arm({src:'march.mp3',id:1,action:'point'});x.player.request('point',undefined,true);const old=x.videos.find(v=>v.src==='point.webm');old.decode();x.step(1000)
 x.voice.arm({src:'march.mp3',id:2,action:'point'});x.player.request('point',undefined,true);x.step(200);assert.equal(x.audio.plays,1)
 const fresh=x.videos.find(v=>v!==old);fresh.decode();assert.equal(fresh.currentTime,0);assert.equal(x.audio.plays,2)
 x.voice.stop();x.player.request('idle');x.videos.find(v=>v.src==='idle.webm').decode();x.step(10000);assert.equal(x.audio.plays,2);assert.equal(x.audio.paused,true)
})

test('moving same-key replay holds the new voice and route until its own decoder frame',t=>{
 const x=setup(t);x.voice.arm({src:'march.mp3',id:1,action:'point'});x.player.request('point',undefined,true)
 const old=x.videos.find(v=>v.src==='point.webm');old.decode();x.step(500)
 x.voice.arm({src:'march.mp3',id:2,action:'point'});x.armUI(2);x.player.request('point',undefined,true)
 const last=x.commits.at(-1),fresh=x.videos.find(v=>v!==old);x.step(2200)
 assert.equal(old.paused,false,'old decoder is still moving while replacement loads')
 assert.equal(x.audio.plays,1);assert.equal(x.audio.paused,true)
 assert.equal(x.uiPhases.at(-1),'waiting','old same-key frames cannot start new route')
 assert.deepEqual(x.commits.at(-1),last,'visible prior pixels remain stable')
 fresh.decode();assert.equal(x.audio.plays,2);assert.equal(x.uiPhases.at(-1),'bike')
 x.step(40);assert.equal(x.audio.plays,2);assert.equal(x.uiPhases.filter(x=>x==='bike').length,2)
})
