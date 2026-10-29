import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {setup} from './court-harness.mjs'
test('malformed long model output is never shown, and leaving clears the preset clarification',async()=>{
 const host=setup(async()=> '光是一种电磁波。'.repeat(160));let court=host.render()
 await court.submit('讲讲光是什么');court=host.render()
 assert.equal(court.modelReply,false);assert.ok(court.line.length<80);assert.equal(court.action,'reply')
 court.leave();court=host.render()
 assert.equal(court.modelReply,false);assert.equal(court.line,'','old long reply must not become an unconstrained ordinary bubble')
 const page=readFileSync(new URL('../src/app/pages/CourtPage.tsx',import.meta.url),'utf8')
 assert.match(page,/onBeforeListen\(\)\{courtRef\.current\.leave\(\)/)
 assert.match(page,/<HiddenSettings onOpen=[^\n]*court\.leave\(\)/)
})
test('leaving while a model reply is pending clears the bubble and rejects late completion',async()=>{
 let complete;const host=setup(()=>new Promise(resolve=>complete=resolve));let court=host.render()
 const pending=court.submit('讲讲光是什么');court=host.render();assert.equal(court.line,'');assert.equal(court.action,'think');assert.equal(court.replyPending,true)
 court.leave();complete('迟到的长回复。'.repeat(160));await pending;court=host.render()
 assert.equal(court.line,'');assert.equal(court.modelReply,false);assert.ok(host.cancels()>=2)
})

test('configured semantic route runs before known keywords; local fallback handles todo and clears music',async()=>{
 const calls=[];const host=setup(async(text)=>{calls.push(text);return undefined});let court=host.render()
 await court.submit('听曲');court=host.render();assert.equal(court.card.kind,'music')
 await court.submit('今天我们要干什么');court=host.render();assert.equal(court.card.kind,'todo');assert.notEqual(court.action,'idle');assert.equal(calls.length,2)
})
test('new message and stop preempt a slow semantic result without scene or card overwrite',async()=>{
 let release;let first=true;const host=setup(async()=>{if(first){first=false;return await new Promise(resolve=>release=resolve)}return undefined});let court=host.render()
 const old=court.submit('听曲');court=host.render();await court.submit('今天我们要干什么');court=host.render();assert.equal(court.card.kind,'todo')
 release(JSON.stringify({scene:'music',confidence:.99,slots:{},clarify:false}));await old;court=host.render();assert.equal(court.card.kind,'todo')
 await court.submit('停止');court=host.render();assert.equal(court.card,undefined);assert.equal(court.action,'idle')
})
test('classifier low confidence, explicit clarify and service errors all use local scene fallback',async()=>{
 for(const result of [JSON.stringify({scene:'todo',confidence:.2,slots:{},clarify:false}),JSON.stringify({scene:'clarify',confidence:.99,slots:{},clarify:true}),'raw injected answer']){
  const host=setup(async()=>result);await host.render().submit('今天我们要干什么');assert.equal(host.render().card.kind,'todo');assert.match(host.render().voiceCue.src,/todo-present/)
 }
 const host=setup(async()=>{throw new Error('network')});await host.render().submit('今天我们要干什么');assert.equal(host.render().card.kind,'todo')
})
