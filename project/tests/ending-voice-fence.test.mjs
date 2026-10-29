import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
function load(name){const m={exports:{}};const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/'+name+'.ts',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text;new Function('require','module','exports',code)(require,m,m.exports);return m.exports}
const {createEndingVoiceFence}=load('ending-voice-fence'),{createSceneVoice}=load('scene-voice')
class Audio extends EventTarget{dataset={};currentTime=0;plays=0;pauses=0;load(){}pause(){this.pauses++}async play(){this.plays++}}
test('repeated apology cannot start the next recording from old same-key frames; only the new request token owns the cue',async()=>{
 const audio=new Audio(),voice=createSceneVoice(audio,()=>{},()=>false),fence=createEndingVoiceFence(),action='ending-apology'
 voice.arm({src:'original.mp3',id:1,action});fence.arm(action);fence.requested(action,41)
 function frame(key,token){if(fence.accepts(key,token))voice.frame(key)}
 frame(action,41);assert.equal(audio.plays,1)
 voice.arm({src:'original.mp3',id:2,action});fence.arm(action);frame(action,41);assert.equal(audio.plays,1,'an old moving frame cannot jump the fresh-request fence');fence.requested(action,42);frame(action,41);frame('idle',42);assert.equal(audio.plays,1);frame(action,42);frame(action,42);assert.equal(audio.plays,2)
 const pauses=audio.pauses;frame('idle',43);assert.equal(audio.pauses,pauses,'natural action completion must not stop the longer recording');voice.stop();frame(action,42);assert.equal(audio.plays,2);voice.dispose()
})
test('unrelated frame cannot start a recording and missing request token never releases armed action',()=>{const f=createEndingVoiceFence();f.arm('ending-apology');f.requested('ending-apology',undefined);assert.equal(f.accepts('ending-apology',12),false);f.arm('point');assert.equal(f.accepts('point',undefined),false);assert.equal(f.accepts('scroll',8),true)})
test('v13 point guard and idle reply recordings reject old same-action tokens',()=>{
 for(const action of ['point','protect','reply']){const f=createEndingVoiceFence();f.arm(action);assert.equal(f.accepts(action,10),false);f.requested(action,11);assert.equal(f.accepts(action,10),false);assert.equal(f.accepts(action,11),true);f.arm(action);assert.equal(f.accepts(action,11),false);f.requested(action,12);assert.equal(f.accepts(action,12),true)}
})
