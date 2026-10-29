import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const out=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/native-assistant.ts',import.meta.url).pathname)],bundle:true,format:'esm',platform:'node',write:false}).outputFiles[0].text
const {routeNativeIntent,cancelModelReply}=await import('data:text/javascript;base64,'+Buffer.from(out).toString('base64'))
test('native configured path sends classifier request (not free chat), cancellation discards late route result',async()=>{
 const host=new EventTarget();const sent=[];let pending
 function emit(id,data){const event=new Event('xiaoazi:native');event.detail={id,ok:true,data};host.dispatchEvent(event)}
 host.XiaoaziNative={postMessage(raw){const q=JSON.parse(raw);sent.push(q);if(q.method==='status')queueMicrotask(()=>emit(q.id,{enabled:true,keySaved:true}));else if(q.method==='model.route')pending=q}}
 globalThis.window=host
 const request=routeNativeIntent('今天我们要干什么','music');await new Promise(r=>setImmediate(r));assert.equal(pending.method,'model.route');assert.deepEqual(pending.payload,{text:'今天我们要干什么',scene:'music'});assert.ok(!sent.some(q=>q.method==='model.complete'));cancelModelReply();await assert.rejects(request,/cancelled/);emit(pending.id,{text:'过期回答'});delete globalThis.window
})
