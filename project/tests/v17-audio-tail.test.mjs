import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const project=fileURLToPath(new URL('..',import.meta.url))
function activeAssets(root){
 const b=buildSync({stdin:{contents:"export {findSceneDefinition,MARCH_QUERY_VOICE,IDLE_GREETING_VOICE,MORNING_RING_VOICE} from './scene-config';export {BACKGROUND_MUSIC_SOURCE} from './audio-config'",resolveDir:path.join(root,'src/app/lib')},bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/v17-audio-test',alias:{'@':path.join(root,'src')},loader:{'.mp3':'file','.wav':'file','.png':'file','.webm':'file','.m4a':'file'}})
 const m={exports:{}};new Function('module','exports',b.outputFiles.find(f=>f.path.endsWith('.js')).text)(m,m.exports)
 return {api:m.exports,data(src){const f=b.outputFiles.find(f=>path.basename(f.path)===path.basename(src));assert.ok(f,'production cue resolves actual bundled media');return Buffer.from(f.contents)}}
}
const current=activeAssets(project),manifest=JSON.parse(readFileSync(new URL('../../audio-tail-runtime-manifest.json',import.meta.url),'utf8')),baseline=JSON.parse(readFileSync(new URL('../../qa/retained-audio-baseline.json',import.meta.url),'utf8'))
function pcm(data){const dir=mkdtempSync(path.join(os.tmpdir(),'v17-pcm-'));try{const file=path.join(dir,'input');writeFileSync(file,data);const p=spawnSync(process.env.FFMPEG ?? 'ffmpeg',['-v','error','-i',file,'-map','0:a:0','-ar','44100','-ac','1','-f','s16le','pipe:1'],{maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stderr?.toString());return p.stdout}finally{rmSync(dir,{recursive:true})}}
const sha=b=>createHash('sha256').update(b).digest('hex')
// Catch old imported assets, erased speech, changed duration, or cleaning an unused file.
const cases=[
 {scene:'march',name:'march-ride.mp3',frames:317813,mask:315315},
 {scene:'protect',name:'protect-help.mp3',frames:172405,mask:169785},
 {scene:'poem',name:'poem-praise.mp3',frames:418678,mask:415863},
 {scene:'client-ending',name:'client-ending-apology.wav',frames:393571,mask:391782},
]
for(const c of cases)test(`active ${c.scene} cue preserves every canonical PCM16 speech sample and full length while replacing only isolated terminal burst with silence`,()=>{
 const entry=manifest.files.find(x=>x.runtime.includes(c.scene==='client-ending'?'client-ending-apology':c.name.replace('.mp3','-tail-clean')));assert.ok(entry)
 const actual=pcm(current.data(current.api.findSceneDefinition(c.scene).voice.src))
 assert.equal(actual.length/2,c.frames,'full decoded sample count retained')
 assert.equal(sha(actual.subarray(0,c.mask*2)),entry.prefixPcm16Sha256,'all canonical speech prefix samples unchanged')
 assert.ok(actual.subarray(c.mask*2).every(x=>x===0),'terminal burst stays digital zero')
})
test('unaffected scene voices, query, greeting, food choices and BGM are byte-identical production assets',()=>{
 for(const scene of ['work','kitchen','music'])assert.equal(sha(current.data(current.api.findSceneDefinition(scene).voice.src)),baseline[{work:'todo-deadline.mp3',kitchen:'kitchen-meal.mp3',morning:'wakeup.wav',music:'music-intro.mp3'}[scene]],scene)
 assert.equal(sha(current.data(current.api.MORNING_RING_VOICE)),baseline['wakeup.wav'])
 for(const name of ['MARCH_QUERY_VOICE','IDLE_GREETING_VOICE','BACKGROUND_MUSIC_SOURCE'])assert.equal(sha(current.data(current.api[name])),baseline[{MARCH_QUERY_VOICE:'march-query.mp3',IDLE_GREETING_VOICE:'idle-greeting.mp3',BACKGROUND_MUSIC_SOURCE:'background-music.mp3'}[name]],name)
})
