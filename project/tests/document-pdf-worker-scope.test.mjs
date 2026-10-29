import test from 'node:test'
import assert from 'node:assert/strict'
import{Worker}from'node:worker_threads'
import{readdirSync}from'node:fs'
import{fileURLToPath}from'node:url'
test('actual PDF.js fake-worker handshake may arrive first; Chinese PDF still extracts in no-DOM worker realm using local CMaps',async()=>{
 const dist=new URL('../dist-standalone/assets/',import.meta.url),pdfWorker=readdirSync(dist).find(n=>/^pdf\.worker\.min-.*\.mjs$/.test(n));assert.ok(pdfWorker)
 const w=new Worker(new URL('./fixtures/documents/pdf-worker-scope.mjs',import.meta.url),{workerData:{module:new URL('../src/app/lib/document-extract.ts',import.meta.url).href,pdf:fileURLToPath(new URL('./fixtures/documents/chinese-cmap-two-pages.pdf',import.meta.url)),worker:new URL(pdfWorker,dist).href}})
 try{const messages=[];const result=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('PDF worker realm timeout')),20000);w.on('message',m=>{messages.push(m);if(m.done){clearTimeout(t);resolve(m)}});w.on('error',reject)});assert.equal(result.error,undefined);assert.equal(result.hasDOM,false);assert.equal(result.document.units.length,2);assert.match(result.document.text,/交稿|分镜|样机/);assert.ok(messages.some(m=>m.libraryMessage?.action==='ready'))}finally{await w.terminate()}
})
