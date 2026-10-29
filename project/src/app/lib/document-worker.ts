/// <reference lib="webworker" />
import {extractBytes} from './document-extract'
import {DOCUMENT_CHANNEL,isExtractRequest} from './document-worker-protocol'
// Register only our channel; never replace PDF.js or another library's global message handler.
self.addEventListener('message',async(event:MessageEvent<unknown>)=>{
 if(!isExtractRequest(event.data))return
 const request=event.data
 try{const document=await extractBytes(request.name,new Uint8Array(request.bytes),undefined,request.pdfWorker);self.postMessage({channel:DOCUMENT_CHANNEL,kind:'result',requestId:request.requestId,ok:true,document})}
 catch(error){self.postMessage({channel:DOCUMENT_CHANNEL,kind:'result',requestId:request.requestId,ok:false,error:error instanceof Error&&error.message?error.message:'无法解析文件。'})}
})
