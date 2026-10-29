import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const bundle=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/native-assistant.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false})
const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports)
test('Meituan bridge sends only a merchant id and retains the standalone app launcher',async()=>{
 const {openMeituan}=module.exports;assert.equal(typeof openMeituan,'function')
 delete globalThis.window;await assert.rejects(openMeituan(),/app_native_required/)
 const requests=[];const target=new EventTarget();let missing=false
 target.XiaoaziNative={postMessage(raw){const q=JSON.parse(raw);requests.push(q);queueMicrotask(()=>target.dispatchEvent(new CustomEvent('xiaoazi:native',{detail:missing?{id:q.id,ok:false,code:'app_missing'}:{id:q.id,ok:true,data:{started:true}}})))}}
 globalThis.window=target
 await openMeituan();assert.equal(requests[0].method,'app.meituan.open');assert.deepEqual(requests[0].payload,{})
 await openMeituan('kfc');assert.deepEqual(requests[1].payload,{merchantId:'kfc'})
 missing=true;await assert.rejects(openMeituan(),/app_missing/)
 delete globalThis.window
})
