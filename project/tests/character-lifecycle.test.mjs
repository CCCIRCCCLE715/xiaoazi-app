import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild'),module={exports:{}}
new Function('module','exports',buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/character-player.ts',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text)(module,module.exports)

// Keep the production playback controller; substitute only browser media/canvas I/O.
function setup(hidden=false){
 const old={document:globalThis.document,window:globalThis.window,cancelAnimationFrame:globalThis.cancelAnimationFrame}
 const pixels=new Uint8ClampedArray(48*48*4);for(let i=0;i<256;i++)pixels[i*4+3]=255
 const context={drawImage(){},getImageData:()=>({data:pixels})}
 globalThis.document=Object.assign(new EventTarget(),{hidden,baseURI:'https://appassets.androidplatform.net/',createElement:()=>({getContext:()=>context})})
 globalThis.window=new EventTarget();globalThis.cancelAnimationFrame=()=>{}
 class Video extends EventTarget {
  paused=true;readyState=2;seeking=false;videoWidth=720;videoHeight=720;currentTime=0;currentSrc='';src='';loads=0;plays=0
  load(){this.loads++;this.currentSrc=this.src?new URL(this.src,document.baseURI).href:''}
  play(){this.paused=false;this.plays++;return Promise.resolve()}
  pause(){this.paused=true}
  removeAttribute(name){if(name==='src')this.src=''}
 }
 const videos=[new Video(),new Video()],canvas={width:720,height:720,dataset:{},parentElement:{dataset:{}},getContext:()=>context}
 const errors=[],player=module.exports.createCharacterPlayer(canvas,videos,{idle:{src:'/idle.webm',loop:true},greet:{src:'/greet.webm'}},{ended(){},error:e=>errors.push(e)})
 const event=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}))
 return {videos,canvas,player,errors,event,start(){player.request('idle');videos[0].dispatchEvent(new Event('loadeddata'));videos[0].dispatchEvent(new Event('canplay'))},close(){player.dispose();Object.assign(globalThis,old)}}
}

test('opening the menu pauses decoding and drawing without frame-timeout errors; closing resumes',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const h=setup()
 try{h.start();assert.equal(h.videos[0].paused,false);const frames=h.player.stats.frames
 h.event('xiaoazi:menu-state',true);assert.equal(h.videos[0].paused,true)
 h.videos[0].currentTime=1;t.mock.timers.tick(11000);assert.equal(h.player.stats.frames,frames);assert.deepEqual(h.errors,[])
 h.event('xiaoazi:menu-state',false);assert.equal(h.videos[0].paused,false)
 }finally{h.close();t.mock.timers.reset()}
})
test('closing a menu cannot resume a natively paused or hidden app',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const h=setup()
 try{h.start();h.event('xiaoazi:menu-state',true);h.event('xiaoazi:pause');h.event('xiaoazi:menu-state',false)
 assert.equal(h.videos[0].paused,true);document.hidden=true;document.dispatchEvent(new Event('visibilitychange'))
 h.event('xiaoazi:resume');assert.equal(h.videos[0].paused,true)
 document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(h.videos[0].paused,false)
 }finally{h.close();t.mock.timers.reset()}
})
test('requests made while hidden load only the latest requested clip on return',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const h=setup(true)
 try{h.player.request('idle');h.player.request('greet');assert.equal(h.videos.reduce((n,v)=>n+v.loads,0),0)
 document.hidden=false;document.dispatchEvent(new Event('visibilitychange'))
 assert.equal(h.videos.reduce((n,v)=>n+v.loads,0),1);assert.equal(h.videos.find(v=>v.src).src,'/greet.webm')
 }finally{h.close();t.mock.timers.reset()}
})
test('suspension releases the decoder surface and returning restores the previous playback position',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const h=setup()
 try{h.start();const v=h.videos[0];v.currentTime=1.25;h.event('xiaoazi:menu-state',true)
 assert.equal(v.src,'');v.currentTime=0
 h.event('xiaoazi:menu-state',false);assert.equal(v.src,'/idle.webm');v.dispatchEvent(new Event('loadedmetadata'))
 assert.equal(v.currentTime,1.25);assert.deepEqual(h.errors,[])
 }finally{h.close();t.mock.timers.reset()}
})
test('promoting a new action releases the obsolete decoder only after its first frame is ready',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const h=setup()
 try{h.start();const old=h.videos[0];h.player.request('greet');assert.equal(old.src,'/idle.webm')
 h.videos[1].dispatchEvent(new Event('loadeddata'));assert.equal(old.src,'');assert.equal(h.canvas.dataset.action,'greet')
 }finally{h.close();t.mock.timers.reset()}
})
test('unmount releases decoder sources and late native resume cannot restart playback',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const h=setup()
 try{h.start();h.player.dispose();assert.ok(h.videos.every(v=>!v.src&&v.paused));h.event('xiaoazi:resume');t.mock.timers.tick(11000);assert.deepEqual(h.errors,[])
 }finally{h.close();t.mock.timers.reset()}
})
