import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const out=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/native-assistant.ts',import.meta.url).pathname)],bundle:true,format:'esm',platform:'node',write:false}).outputFiles[0].text
const {openAlipay,alipayFailure}=await import('data:text/javascript;base64,'+Buffer.from(out).toString('base64'))
test('browser cannot claim to open installed Alipay',async()=>{await assert.rejects(openAlipay(),/app_native_required/);assert.match(alipayFailure(Error('app_native_required')),/手机应用/);assert.match(alipayFailure(Error('app_missing')),/未安装支付宝/)})
test('Alipay adapter sends only empty payload fixed method and demands launch acknowledgement',async()=>{
 const host=new EventTarget(),sent=[];let started=false
 host.XiaoaziNative={postMessage(raw){const q=JSON.parse(raw);sent.push(q);queueMicrotask(()=>{const e=new Event('xiaoazi:native');e.detail={id:q.id,ok:true,data:{started}};host.dispatchEvent(e)})}};globalThis.window=host
 await assert.rejects(openAlipay(),/launch_failed/);started=true;await openAlipay();assert.equal(sent.length,2);for(const q of sent){assert.equal(q.method,'app.alipay.open');assert.deepEqual(q.payload,{})}delete globalThis.window
})
