import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {setup} from './court-harness.mjs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/intent-router.ts',import.meta.url))],bundle:true,format:'esm',platform:'node',write:false,outdir:'/tmp/client-ending-test',alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},loader:{'.mp3':'file','.wav':'file','.m4a':'file','.webm':'file'}}).outputFiles.find(f=>f.path.endsWith('.js')).text
const {localDecision,validateDecision,decisionReply,presetVoiceAllowed}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const phrases=['在群里我不是皇上吗']
const empty={sceneId:'idle',stage:'idle'}
test('client complaint fallback selects dedicated character-only preset, never old ending or business UI',()=>{
 for(const text of phrases){const d=localDecision(text);assert.equal(d.scene,'client-ending',text);const r=decisionReply(d,text,empty,{kind:'music'});assert.equal(r.context.sceneId,'client-ending');assert.equal(r.text,'');assert.equal(r.card,undefined);assert.equal(r.task,undefined);assert.equal(r.action,'ending-apology','dedicated full new motion');assert.equal(presetVoiceAllowed('client-ending',text),true)}
})
test('clear new-demand and difficult-client synonyms enter the same local preset without widening negatives or action requests',async t=>{
 const q=JSON.stringify({scene:'client-ending',confidence:.96,slots:{},clarify:false})
 for(const text of ['甲方又提新需求了','甲方又加需求了','客户真难伺候','客户太难伺候了','甲方又追加需求了','客户又新增需求了'])await t.test(text,()=>{
  const d=localDecision(text);assert.equal(d.scene,'work');assert.equal(validateDecision(JSON.stringify({scene:'work',confidence:.96,slots:{},clarify:false}),text)?.scene,'work');assert.equal(validateDecision(q,text),undefined)
  const r=decisionReply(d,text,empty,{kind:'music'});assert.equal(r.card?.kind,'work');assert.equal(r.action,'ending-apology')
 })
 for(const text of ['甲方是谁','客户没有催稿','甲方没有提新需求','甲方没加需求','甲方又不加需求了','客户不难伺候','客户没那么难伺候','不要说客户真难伺候','他说甲方又加需求了','“甲方又提新需求了”'])await t.test(text,()=>{
  assert.notEqual(localDecision(text).scene,'client-ending');assert.equal(validateDecision(q,text),undefined)
 })
 for(const [text,scene]of [['去客户公司导航','march'],['甲方又加需求了，导航去客户公司','march'],['客户真难伺候，点份饭','kitchen'],['甲方又提新需求了，明天八点叫醒我','morning'],['客户真难伺候，我要睡了','ending']])await t.test(text,()=>{
  assert.equal(localDecision(text).scene,scene);assert.equal(validateDecision(q,text),undefined)
 })
 for(const text of ['甲方又确认需求了','客户又解释需求了','甲方又取消需求了'])await t.test(text,()=>assert.notEqual(localDecision(text).scene,'client-ending'))
})
test('model whitelist accepts dedicated scene only with grounded complaint; raw free text and wrong semantic presets fall back',()=>{
 const q=scene=>JSON.stringify({scene,confidence:.96,slots:{},clarify:false})
 assert.equal(validateDecision(q('client-ending'),phrases[0])?.scene,'client-ending')
 for(const scene of ['protect','ending','memorial'])assert.equal(validateDecision(q(scene),phrases[0]),undefined)
 assert.equal(validateDecision('在群里您是臣',phrases[0]),undefined)
 for(const text of ['今天的天气如何','甲方是谁','不要说甲方好烦啊','他说甲方好烦啊','“客户又催稿了”','客户催稿是什么意思'])assert.equal(validateDecision(q('client-ending'),text),undefined,text)
})
test('explicit navigation, food and wake actions retain priority; rest keeps its existing ending branch without apology voice',()=>{
 for(const [text,scene]of [['甲方好烦啊，导航去公司','march'],['客户又催稿了，给我点份饭','kitchen'],['甲方又改一版，明天八点叫醒我','morning'],['晚安','ending'],['我要睡了','ending'],['回寝宫','ending'],['甲方好烦，我要睡了','ending']]){assert.equal(localDecision(text).scene,scene,text);assert.equal(validateDecision(JSON.stringify({scene:'client-ending',confidence:.9,slots:{},clarify:false}),text),undefined);const r=decisionReply(localDecision(text),text,empty);if(scene==='ending'){assert.equal(r.action,'ending');assert.match(r.text,/歇息/);assert.equal(presetVoiceAllowed('client-ending',text),false)}}
 for(const text of ['甲方是谁','甲方今天很配合','客户没有催稿','不要甲方好烦啊','他说甲方好烦啊','“甲方又发来要求了”'])assert.notEqual(localDecision(text).scene,'client-ending',text)
})
test('complaint clears prior music/card immediately while semantic request is pending, silence has no extra text, stop/new command wins',async()=>{
 let release,slow=false;const h=setup(async()=>{if(slow)return await new Promise(r=>release=r);return undefined});let c=h.render();await c.submit('听曲');c=h.render();assert.equal(c.card.kind,'music');let stops=0;window.addEventListener('xiaoazi:voice-stop',()=>stops++);slow=true;const pending=c.submit(phrases[0]);c=h.render();assert.equal(c.card,undefined);assert.equal(c.context.sceneId,'client-ending');assert.equal(c.line,'');assert.equal(c.action,'think');assert.equal(c.replyPending,true);assert.equal(c.voiceCue,undefined);assert.ok(stops>0)
 slow=false;await c.submit('停止');release(undefined);await pending;c=h.render();assert.equal(c.context.sceneId,'idle');assert.equal(c.voiceCue,undefined)
 await c.submit('在群里我不是皇上吗');c=h.render();assert.equal(c.context.sceneId,'client-ending');c.onActionEnd();c=h.render();assert.equal(c.action,'idle');assert.equal(c.line,'');await c.submit('导航去公司');assert.equal(h.render().card.stage,'choose');assert.match(h.render().voiceCue.src,/march-query/);await h.render().submit('骑车');assert.equal(h.render().card.kind,'march')
})
test('current speech binding remains exact while the dedicated full action retains its character-only binding',()=>{
 const root=new URL('../../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('audio-source-manifest.json',root),'utf8'))
 assert.equal(manifest.originalDurationSec,9.264512);assert.equal(manifest.previewEnabled,true);assert.equal(manifest.durationSec,8.924512)
 const retainedWav=readFileSync(new URL('../src/assets/audio/client-ending-apology.wav',import.meta.url));assert.equal(createHash('sha256').update(retainedWav).digest('hex'),JSON.parse(readFileSync(new URL('audio-tail-runtime-manifest.json',root),'utf8')).files.find(x=>x.runtime.includes('client-ending')).runtimeSha256)
 const gesture=readFileSync(new URL('../src/app/lib/ending-apology-config.ts',import.meta.url),'utf8');assert.doesNotMatch(gesture,/actions-v4\/ending|actions-v4\/reply|displayHold|playbackRate:\s*(?!1)/)
 const page=readFileSync(new URL('../src/app/pages/CourtPage.tsx',import.meta.url),'utf8');assert.match(page,/characterOnly/);assert.match(page,/hideVoiceRetry=\{characterOnly\|\|fullpage\}/);assert.match(page,/!characterOnly&&<PresencePanel/)
})

test('fresh repeated complaint restarts dedicated cue, natural full action completion returns idle without clipping voice',async()=>{const h=setup(async()=>undefined);let c=h.render();await c.submit('在群里我不是皇上吗');c=h.render();assert.equal(c.action,'ending-apology');assert.equal(c.voiceCue?.action,'ending-apology');const first=c.voiceCue.id;c.onActionEnd();c=h.render();assert.equal(c.action,'idle');assert.equal(c.voiceCue.id,first);assert.equal(c.card,undefined);assert.equal(c.line,'');await c.submit('在群里我不是皇上吗');c=h.render();assert.equal(c.action,'ending-apology');assert.notEqual(c.voiceCue.id,first);await c.submit('停止');c=h.render();assert.equal(c.voiceCue,undefined)})
