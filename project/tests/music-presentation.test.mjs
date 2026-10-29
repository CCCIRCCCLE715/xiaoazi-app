import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createMusicCue} from '../src/app/lib/music-cue.ts'
import {createSongPlayer} from '../src/app/lib/song-player.ts'
import {createSceneVoice,sceneVoiceIsForeground} from '../src/app/lib/scene-voice.ts'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/character-player.ts',import.meta.url).pathname)],bundle:true,platform:'node',format:'esm',write:false}).outputFiles[0].text
const {createCharacterPlayer}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
function setup(t,kind='music'){
 const action=kind==='todo'?'ending-apology':'music-tap',clipSource=kind==='todo'?'todo.webm':'music.webm',voiceDuration=kind==='todo'?8.743991:10.498798
 t.mock.timers.enable({apis:['setTimeout','setInterval']});let now=0,request=0
 const saved={document:globalThis.document,window:globalThis.window,performance:globalThis.performance,cancelAnimationFrame:globalThis.cancelAnimationFrame}
 const doc=new EventTarget();doc.hidden=false;doc.baseURI='https://app.local/'
 const pixels=new Uint8ClampedArray(48*48*4);for(let i=100;i<48*48;i++)pixels[i*4+3]=255
 doc.createElement=()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})});globalThis.document=doc;globalThis.window=new EventTarget();globalThis.performance={now:()=>now};globalThis.cancelAnimationFrame=()=>{}
 class Media extends EventTarget{
  src='';currentSrc='';currentTime=0;duration=30;readyState=0;videoWidth=1440;videoHeight=1440;paused=true;loop=false;plays=0;dataset={};volume=1
  removeAttribute(name){if(name==='src')this.src=''}
  load(){this.currentTime=0;this.readyState=0;this.currentSrc=new URL(this.src,doc.baseURI).href}
  decode(){this.readyState=2;this.dispatchEvent(new Event('loadeddata'));this.dispatchEvent(new Event('canplay'))}
  play(){this.plays++;this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve()}
  pause(){if(!this.paused){this.paused=true;this.dispatchEvent(new Event('pause'))}}
  end(){this.paused=true;this.dispatchEvent(new Event('ended'))}
 }
 const videos=[new Media(),new Media()],intro=new Media(),song=new Media(),canvas={dataset:{},width:1440,height:1440,parentElement:{dataset:{}},getContext:()=>({drawImage(){}})}
 const songs=createSongPlayer(song,()=>{},()=>doc.hidden),voice=createSceneVoice(intro,()=>{},()=>doc.hidden,s=>songs.voice(sceneVoiceIsForeground(s.state)))
 const fired=[],cue=createMusicCue(token=>{fired.push(token);songs.cue(token)})
 const player=createCharacterPlayer(canvas,videos,{idle:{src:'idle.webm',loop:true},[action]:{src:clipSource,loop:false}},{ended(){},error:assert.fail,frame:action=>{voice.frame(action);cue.frame({token:request,action,source:canvas.dataset.frameSource,time:Number(canvas.dataset.frameTime)})}})
 const start=id=>{request=id;songs.begin(id,'preview.m4a');voice.arm({id,src:'intro.mp3',action});if(kind==='music')cue.arm(id,{source:'https://app.local/music.webm',action,at:2.625,previewEnabled:true});player.request(action,undefined,true);return videos.find(v=>v.src===clipSource&&v.readyState===0)}
 const step=ms=>{for(let left=ms;left>0;){const dt=Math.min(40,left);left-=dt;now+=dt;for(const v of videos)if(!v.paused){v.currentTime+=dt/1000;if(!v.loop&&v.currentTime>=(kind==='todo'?10.125:124/24))v.end()}for(const a of [intro,song])if(!a.paused){a.currentTime+=dt/1000;if(a.currentTime>=(a===intro?voiceDuration:30))a.end()}t.mock.timers.tick(dt);for(const v of videos)if(v.src==='idle.webm'&&v.readyState===0)v.decode()}}
 const cancel=()=>{cue.cancel();songs.cancel();voice.stop()};doc.addEventListener('visibilitychange',()=>{if(doc.hidden)cancel()})
 t.after(()=>{cue.cancel();songs.dispose();voice.dispose();player.dispose();t.mock.timers.reset();for(const [k,v] of Object.entries(saved))if(v===undefined)delete globalThis[k];else globalThis[k]=v})
 return{videos,intro,song,songs,cue,voice,player,start,step,cancel,doc,fired}
}
test('real presented2.625s cue starts song once;5.167s motion ends but10.499s original intro continues',t=>{
 const x=setup(t),v=x.start(1);v.decode();assert.equal(x.intro.plays,1);x.step(2600);assert.equal(x.song.plays,0)
 x.step(80);assert.equal(x.song.plays,1);assert.deepEqual(x.fired,[1]);assert.equal(x.song.volume,.08)
 x.step(2600);assert.equal(x.player.stats.samples.filter(s=>s.event==='ended'&&s.key==='music-tap').length,1);assert.equal(x.intro.paused,false);assert.equal(x.intro.plays,1)
 x.step(5650);assert.equal(x.intro.paused,true);assert.equal(x.song.volume,.6);assert.equal(x.song.plays,1)
})
test('moving same-source replay cannot cue from old frames; background cancels pending tap across resume',t=>{
 const x=setup(t),old=x.start(1);old.decode();x.step(2800);assert.equal(x.song.plays,1)
 const fresh=x.start(2);x.step(1000);assert.equal(x.intro.plays,1);assert.equal(x.song.plays,1);fresh.decode();assert.equal(x.intro.plays,2)
 x.step(1200);x.doc.hidden=true;x.doc.dispatchEvent(new Event('visibilitychange'));x.doc.hidden=false;x.doc.dispatchEvent(new Event('visibilitychange'));x.step(4000);assert.equal(x.song.plays,1);assert.equal(x.intro.paused,true)
})

test('current Todo full action continues after8.744s voice, ends once at10.125s, fresh entry restarts both',t=>{
 const x=setup(t,'todo'),v=x.start(1);v.decode();assert.equal(x.intro.plays,1)
 x.step(8900);assert.equal(x.intro.paused,true);assert.equal(x.player.stats.samples.filter(s=>s.event==='ended'&&s.key==='ending-apology').length,0)
 x.step(1300);assert.equal(x.player.stats.samples.filter(s=>s.event==='ended'&&s.key==='ending-apology').length,1);assert.equal(x.song.plays,0)
 const fresh=x.start(2);fresh.decode();assert.equal(x.intro.plays,2);assert.ok(x.intro.currentTime<.1)
 x.step(1000);x.cancel();x.step(3000);assert.equal(x.intro.paused,true);assert.equal(x.intro.plays,2)
})
