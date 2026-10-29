import DocumentWorker from './document-worker?worker'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import {DOCUMENT_LIMITS,type ImportedDocument} from './document-extract'
import {DOCUMENT_CHANNEL,readExtractResult,type ExtractRequest} from './document-worker-protocol'
export {DOCUMENT_LIMITS};export type {ImportedDocument,DocumentUnit} from './document-extract'
let requestCounter=0
/** Dedicated worker is terminated on cancel/timeout, including ZIP/PDF parsing. */
export async function extractDocument(file:File,signal:AbortSignal):Promise<ImportedDocument>{
 if(signal.aborted)throw new Error('cancelled');if(file.size>DOCUMENT_LIMITS.bytes)throw new Error('文件超过10MiB，请拆分后重试。')
 const bytes=await file.arrayBuffer();if(signal.aborted)throw new Error('cancelled')
 const requestId=`document-${++requestCounter}`
 return new Promise((resolve,reject)=>{
  const worker=new DocumentWorker();let finished=false
  const finish=(error?:Error,value?:ImportedDocument)=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);worker.removeEventListener('message',message);worker.removeEventListener('error',failure);worker.terminate();error?reject(error):resolve(value!)}
  const cancel=()=>finish(new Error('cancelled')),failure=()=>finish(new Error('本地解析失败，请换文件重试。'))
  const message=(event:MessageEvent<unknown>)=>{const result=readExtractResult(event.data,requestId);if(result){if('error'in result)finish(result.error);else finish(undefined,result.document)}}
  const timer=setTimeout(()=>finish(new Error('本地解析超时，请拆分文件后重试。')),30000)
  signal.addEventListener('abort',cancel,{once:true});worker.addEventListener('message',message);worker.addEventListener('error',failure)
  const request:ExtractRequest={channel:DOCUMENT_CHANNEL,kind:'extract',requestId,name:file.name,bytes,pdfWorker:new URL(pdfWorker,document.baseURI).href}
  worker.postMessage(request,[bytes])
 })
}
