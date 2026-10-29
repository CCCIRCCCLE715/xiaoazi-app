import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve()}
function clock(){let now=10000,n=0;const timers=new Map();return {now:()=>now,schedule(fn,ms){const id=++n;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){const end=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush()}now=end;await flush()}}}
function host(answer=async()=>undefined){const time=clock(),h=setup(answer,{},time);h.render();return {h,time}}
async function send(h,time,text){const p=h.render().submit(text);await flush();await time.advance(1500);await p;return h.render()}
test('boss phrase punctuation variants select guard despite conflicting model result',async()=>{
 for(const text of ['黄白，你的稿子呢？','黄 白 你 的 稿 子 呢','黄白,你的稿子呢!']){const {h,time}=host(async()=>JSON.stringify({scene:'todo',confidence:.98,slots:{},clarify:false}));const c=await send(h,time,text);assert.equal(c.context.sceneId,'protect',text);assert.equal(c.action,'protect');assert.equal(c.card,undefined);assert.match(c.line,/大胆.*跟陛下说话/);assert.match(c.voiceCue?.src??'',/protect-help/)}
})
test('negative quote explanation and unrelated boss sentence cannot trigger guard recording',async()=>{
 for(const text of ['不要说黄白，你的稿子呢？','他说“黄白，你的稿子呢？”','“黄白，你的稿子呢？”是什么意思','黄白你的稿子呢这句话怎么读','谁敢相信今天这么热']){const {h,time}=host();const c=await send(h,time,text);assert.notEqual(c.context.sceneId,'protect',text);assert.equal(c.voiceCue,undefined,text)}
})
test('travel query chooser and voice then fresh second ride token/card at1500',async()=>{
 const {h,time}=host();const q=await send(h,time,'我要出行去公司');assert.equal(q.context.sceneId,'march');assert.equal(q.action,'point');assert.equal(q.card.stage,'choose');assert.equal(q.card.destination,'公司');assert.equal(q.line,'陛下，今日如何出行？');assert.match(q.voiceCue.src,/march-query/);const old=q.voiceCue.id
 const p=h.render().submit('御驾亲蹬');await flush();await time.advance(1499);assert.equal(h.render().card.stage,'choose');assert.equal(h.render().voiceCue,undefined);await time.advance(1);await p;const c=h.render();assert.equal(c.card.kind,'march');assert.equal(c.card.mode,'骑行');assert.equal(c.card.destination,'公司');assert.match(c.voiceCue.src,/march-ride/);assert.notEqual(c.voiceCue.id,old)
})
test('natural second round and explicit first mode/standalone royal ride reachable',async()=>{
 for(const second of ['骑车','骑行','我想骑自行车']){const {h,time}=host();await send(h,time,'摆驾');const c=await send(h,time,second);assert.equal(c.card.mode,'骑行');assert.equal(c.card.destination,null)}
 for(const text of ['骑行去图书馆','御驾亲蹬','御驾亲蹬去公司']){const {h,time}=host();const c=await send(h,time,text);assert.equal(c.card.kind,'march',text);assert.equal(c.card.mode,'骑行');if(c.card.destination)assert.match(c.voiceCue.src,/march-ride/);else {assert.equal(c.card.stage,'choose');assert.equal(c.voiceCue,undefined)}}
})
test('destination scoped to current trip, scene/stop/background clear, recording leave preserves query',async()=>{
 for(const interrupt of ['听曲','停止','pause','leave']){const {h,time}=host();await send(h,time,'骑行去旧公司');await send(h,time,'我要出行去图书馆');if(interrupt==='pause')window.dispatchEvent(new Event('xiaoazi:pause'));else if(interrupt==='leave')h.render().leave();else await send(h,time,interrupt);const c=await send(h,time,'御驾亲蹬');assert.equal(c.card.destination,interrupt==='leave'?'图书馆':null,interrupt)}
 const {h,time}=host();await send(h,time,'骑行去旧公司');await send(h,time,'我要出行');const c=await send(h,time,'骑车');assert.equal(c.card.destination,null)
})
test('negative quoted second round has no route; newer query rejects stale async destination',async()=>{
 for(const text of ['不要骑车','他说御驾亲蹬','御驾亲蹬是什么意思']){const {h,time}=host();await send(h,time,'我要出行去公司');const c=await send(h,time,text);assert.equal(c.card.stage,'choose',text);assert.equal(c.card.mode,null,text);assert.equal(c.voiceCue,undefined,text)}
 let release;const {h,time}=host(text=>text.includes('旧公司')?new Promise(r=>release=r):Promise.resolve(undefined));const old=h.render().submit('出行去旧公司');await flush();await time.advance(300);await send(h,time,'我要出行去图书馆');release(undefined);await old;assert.equal((await send(h,time,'骑车')).card.destination,'图书馆')
})
test('idle rapid tap replaces voice deadline and business card cannot be hijacked',async()=>{
 const {h,time}=host();h.render().react();await flush();await time.advance(1000);h.render().react();await flush();await time.advance(1499);assert.equal(h.render().voiceCue,undefined);await time.advance(1);let c=h.render();assert.equal(c.line,'陛下有何吩咐？');assert.equal(c.voiceCue.action,'reply');assert.match(c.voiceCue.src,/idle-greeting/)
 c=await send(h,time,'点份饭');const card=c.card,voice=c.voiceCue;h.render().react();await time.advance(2000);assert.equal(h.render().card,card);assert.equal(h.render().voiceCue,voice)
})
test('tap wait cancelled by send/recording/background without old voice resurrection',async()=>{
 for(const op of ['leave','pause','send']){const {h,time}=host();h.render().react();await flush();await time.advance(500);if(op==='send')await send(h,time,'我要出行');else if(op==='leave')h.render().leave();else window.dispatchEvent(new Event('xiaoazi:pause'));await time.advance(5000);if(op==='send')assert.match(h.render().voiceCue.src,/march-query/);else assert.equal(h.render().voiceCue,undefined)}
})
test('preset travel phrase cannot be overridden by a conflicting model scene; definitions stay noncommands even with model protect',async()=>{
 const model=async()=>JSON.stringify({scene:'todo',confidence:.98,slots:{},clarify:false});const {h,time}=host(model);const c=await send(h,time,'我要出行');assert.equal(c.context.sceneId,'march');assert.equal(c.card.stage,'choose')
 const other=host(async()=>JSON.stringify({scene:'protect',confidence:.98,slots:{},clarify:false}));const n=await send(other.h,other.time,'黄白你的稿子呢是什么意思');assert.notEqual(n.context.sceneId,'protect');assert.equal(n.voiceCue,undefined)
})
