import test from 'node:test'
import assert from 'node:assert/strict'
import{createRequire}from'node:module'
import{fileURLToPath}from'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const build=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/document-import.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,external:['./document-worker?worker','pdfjs-dist/legacy/build/pdf.worker.min.mjs?url','./document-extract']}).outputFiles[0].text
const document={name:'中文.pdf',bytes:4,format:'pdf',text:'待办',units:[{sourceId:'page-1',label:'第1页',text:'待办'}]}
function setup(){
 let worker;class BoundaryWorker extends EventTarget{terminated=false;constructor(){super();worker=this}postMessage(v){this.request=v}terminate(){this.terminated=true}emit(data){const e=new MessageEvent('message',{data});this.dispatchEvent(e);this.onmessage?.(e)}}
 const m={exports:{}};new Function('require','module','exports',build)(name=>name.includes('?worker')?BoundaryWorker:name.includes('?url')?'/assets/pdf.worker.mjs':{DOCUMENT_LIMITS:{bytes:10485760}},m,m.exports);globalThis.document={baseURI:'https://appassets.androidplatform.net/'};return{extract:m.exports.extractDocument,worker:()=>worker}
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()}
const file={name:'中文.pdf',size:4,arrayBuffer:async()=>new ArrayBuffer(4)}
function result(w,body){return{channel:'xiaoazi.document.v1',kind:'result',requestId:w.request.requestId,...body}}
test('PDF internal ready and unrelated messages precede real application result without terminating parser',async()=>{
 const h=setup(),c=new AbortController();let settled=false;const p=h.extract(file,c.signal).finally(()=>settled=true);p.catch(()=>{});await flush();const w=h.worker();w.emit({sourceName:'worker',targetName:'main',action:'ready',data:null});w.emit({ok:false,error:'foreign message'});await flush();assert.equal(settled,false);assert.equal(w.terminated,false)
 w.emit({...result(w,{ok:true,document}),requestId:'obsolete'});await flush();assert.equal(settled,false)
 w.emit(result(w,{ok:true,document}));assert.deepEqual(await p,document);assert.equal(w.terminated,true)
})
test('only matching explicit error terminates with visible nonempty explanation; malformed matching result fails clearly',async()=>{
 for(const body of [{ok:false,error:'PDF 已加密，请先解密后重试。'},{ok:false},{ok:true,document:{}}]){const h=setup(),c=new AbortController(),p=h.extract(file,c.signal);await flush();const w=h.worker();w.emit(result(w,body));await assert.rejects(p,e=>e.message.length>0);assert.equal(w.terminated,true)}
})
test('cancel ignores later matching application result and terminates exactly this worker',async()=>{
 const h=setup(),c=new AbortController(),p=h.extract(file,c.signal);await flush();const w=h.worker();c.abort();await assert.rejects(p,/cancelled/);w.emit(result(w,{ok:true,document}));assert.equal(w.terminated,true)
})
test('outer parser preserves another library global handler and ignores non-app incoming handshakes',async()=>{
 const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/document-worker.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,external:['./document-extract']}).outputFiles[0].text
 const self=new EventTarget(),original=()=>{},sent=[];let calls=0;self.onmessage=original;self.postMessage=v=>sent.push(v);globalThis.self=self
 const m={exports:{}};new Function('require','module','exports',code)(()=>({extractBytes:async()=>{calls++;return document}}),m,m.exports)
 assert.equal(self.onmessage,original);self.dispatchEvent(new MessageEvent('message',{data:{sourceName:'worker',targetName:'main',action:'ready'}}));await flush();assert.equal(calls,0)
 self.dispatchEvent(new MessageEvent('message',{data:{channel:'xiaoazi.document.v1',kind:'extract',requestId:'document-7',name:'中文.pdf',bytes:new ArrayBuffer(4),pdfWorker:'https://appassets.androidplatform.net/assets/pdf.worker.mjs'}}));await flush();assert.equal(calls,1);assert.equal(sent[0].requestId,'document-7');assert.equal(sent[0].kind,'result');assert.equal(sent[0].ok,true)
})
