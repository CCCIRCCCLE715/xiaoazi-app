import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {setup} from './court-harness.mjs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/domain-speech.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports)
const {normalizeDomainSpeech}=m.exports
const cases=JSON.parse(readFileSync(new URL('./fixtures/scene-routing-v34.json',import.meta.url),'utf8')).cases
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=10000,next=0;const timers=new Map();return {now:()=>now,schedule(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){const end=now+ms;while(true){const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush()}now=end;await flush()}}}
async function send(h,time,text){const p=h.render().submit(text);await flush();assert.equal(h.render().line,'','reply still waits for1500ms');await time.advance(1499);assert.equal(h.render().replyPending,true);await time.advance(/叫.*起床|叫醒|闹钟/.test(text)?501:1);await p;return h.render()}
function check(c,e,label){
 if(e.scene)assert.equal(c.context.sceneId,e.scene,label)
 if(e.mode)assert.equal(c.card?.mode,e.mode,label)
 for(const key of ['destination','budget','taste','address'])if(e[key]!==undefined)assert.equal(c.card?.[key],e[key],label+' '+key)
 if(e.ask){assert.equal(c.line,e.ask);assert.equal(c.card?.kind,'march');assert.equal(c.card?.stage,'choose');assert.equal(c.context.pending,false)}
 if(e.showMap===false){assert.equal(c.card?.kind,'march',label);assert.equal(c.card?.stage,'choose',label)}
 if(e.showCard===false||e.doNotLaunchScene)assert.equal(c.card,undefined,label)
 if(e.showCyclingCard)assert.equal(c.card?.kind,'march')
 if(e.voiceVariant){assert.ok(c.voiceCue,label+' voice');assert.match(c.voiceCue.src,/kitchen-meal/,label+' uses the food-list voice')}
 if(e.doNotSelectKitchen||e.doNotSelectKitchenAutomatically)assert.notEqual(c.card?.kind,'kitchen',label)
 if(e.doNotSelectCycling)assert.notEqual(c.card?.mode,'骑行',label)
 if(e.askOrderOrExecuteFoodFirst)assert.ok(c.card?.kind==='kitchen'||c.card===undefined,label)
 if(e.time)assert.equal(c.alarmRequest?.time,e.time)
 if(e.scene==='client-ending'){assert.equal(c.action,'ending-apology');assert.equal(c.line,'')}
}
for(const row of cases)test('declared production dialogue '+row.id,async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);h.render()
 try{
  if(row.context?.waitingForTravelMode)await send(h,time,'我要去公司')
  if(row.turns){for(const turn of row.turns)check(await send(h,time,turn.text),turn.expected,row.id);return}
  const raw=row.rawTranscript??row.text,e=row.expected,normalized=normalizeDomainSpeech(raw,row.context)
  if(e.canonical)assert.equal(normalized,e.canonical)
  if(e.canonicalContains)assert.ok(normalized.includes(e.canonicalContains))
  if(e.doNotNormalizeToCycling||e.preserveRawTranscript)assert.equal(normalized,raw)
  check(await send(h,time,raw),e,row.id)
  if(e.clearPendingTravel){const fresh=await send(h,time,'御驾亲蹬');assert.equal(fresh.card?.destination,null,'food interruption clears previous company destination')}
 }finally{h.unmount()}
})
test('context correction never rewrites expedition, quotes, negation or unrelated lights',()=>{
 for(const raw of ['御驾亲征','御驾亲征是什么意思','不要御驾亲灯','他说御驾亲灯','你刚才说御驾亲灯','帮我打开客厅的灯','“御驾亲灯”'])assert.equal(normalizeDomainSpeech(raw,{waitingForTravelMode:true}),raw)
 assert.equal(normalizeDomainSpeech('御驾亲灯'), '御驾亲灯','uncontextual homophone remains raw')
})
