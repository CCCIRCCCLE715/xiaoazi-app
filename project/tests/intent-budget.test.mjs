import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {setup} from './court-harness.mjs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const out=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/native-assistant.ts',import.meta.url).pathname)],bundle:true,format:'esm',platform:'node',write:false}).outputFiles[0].text
let generation=0
async function nativeAdapter(){return import('data:text/javascript;base64,'+Buffer.from(out).toString('base64')+'#'+(++generation))}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
function emit(host,id,data){const event=new Event('xiaoazi:native');event.detail={id,ok:true,data};host.dispatchEvent(event)}
test('five-second intent budget cancels native request, falls back locally, and late reply cannot replace a newer scene',async t=>{
 const native=await nativeAdapter();const host=setup(undefined,native,{now:()=>Date.now(),schedule:(fn,ms)=>setTimeout(fn,ms),clear:timer=>clearTimeout(timer)});const target=globalThis.window;const sent=[];let delayed
 target.XiaoaziNative={postMessage(raw){const q=JSON.parse(raw);sent.push(q);if(q.method==='status')queueMicrotask(()=>emit(target,q.id,{enabled:true,keySaved:true}));if(q.method==='model.route'){if(!delayed)delayed=q;else queueMicrotask(()=>emit(target,q.id,{text:JSON.stringify({scene:'march',confidence:.99,slots:{destination:'公司',mode:'骑行'},clarify:false})}))}}}
 t.mock.timers.enable({apis:['setTimeout','Date']});t.mock.method(performance,'now',()=>Date.now())
 const pending=host.render().submit('今天我们要干什么');await flush();assert.equal(host.render().line,'');assert.equal(host.render().action,'think');assert.equal(host.render().replyPending,true)
 t.mock.timers.tick(4999);await flush();assert.equal(host.render().line,'');assert.equal(host.render().action,'think');assert.equal(host.render().replyPending,true)
 t.mock.timers.tick(1);await flush();assert.equal(host.render().card?.kind,'todo','must use local decision after five seconds')
 await pending;assert.ok(sent.some(q=>q.method==='cancel'&&q.payload.target===delayed.id),'native model work must be cancelled')
 const fresh=host.render().submit('今天低调骑车去公司');await flush();t.mock.timers.tick(1500);await flush();await fresh;assert.equal(host.render().card.kind,'march')
 emit(target,delayed.id,{text:JSON.stringify({scene:'music',confidence:.99,slots:{},clarify:false})});await flush()
 assert.equal(host.render().card.kind,'march');assert.equal(host.render().card.destination,'公司')
 t.after(()=>{native.cancelModelReply();delete globalThis.window})
})
test('configuration status lookup shares the same total five-second intent budget',async t=>{
 const native=await nativeAdapter();const target=new EventTarget();globalThis.window=target;const sent=[];let status
 target.XiaoaziNative={postMessage(raw){const q=JSON.parse(raw);sent.push(q);if(q.method==='status')status=q}}
 t.mock.timers.enable({apis:['setTimeout','Date']});t.mock.method(performance,'now',()=>Date.now())
 const request=native.routeNativeIntent('看待办','idle');const rejected=assert.rejects(request,/timeout/)
 t.mock.timers.tick(5000);await flush();assert.ok(sent.some(q=>q.method==='cancel'&&q.payload.target===status.id))
 emit(target,status.id,{enabled:true,keySaved:true});await flush();assert.ok(!sent.some(q=>q.method==='model.route'));await rejected
 t.after(()=>{native.cancelModelReply();delete globalThis.window})
})
