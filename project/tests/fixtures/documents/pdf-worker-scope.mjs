// Test-only Worker-like Node realm: PDF.js must not depend on DOM globals for text/CMap extraction.
import {parentPort,workerData} from 'node:worker_threads'
import {readFile} from 'node:fs/promises'
const events=new EventTarget();globalThis.self=globalThis;globalThis.onmessage=null;globalThis.addEventListener=events.addEventListener.bind(events);globalThis.removeEventListener=events.removeEventListener.bind(events);globalThis.postMessage=data=>parentPort.postMessage({libraryMessage:data})
const nativeFetch=globalThis.fetch;globalThis.fetch=async input=>String(input).startsWith('file:')?new Response(await readFile(new URL(String(input))),{status:200}):nativeFetch(input)
globalThis.process=undefined
try{const {extractBytes}=await import(workerData.module);const d=await extractBytes('中文.pdf',new Uint8Array(await readFile(workerData.pdf)),undefined,workerData.worker);parentPort.postMessage({done:true,document:d,hasDOM:typeof document!=='undefined'})}catch(e){parentPort.postMessage({done:true,error:e.message,hasDOM:typeof document!=='undefined'})}
