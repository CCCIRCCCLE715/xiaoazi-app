import type {ImportedDocument} from './document-extract'
export const DOCUMENT_CHANNEL='xiaoazi.document.v1'
export interface ExtractRequest{channel:typeof DOCUMENT_CHANNEL;kind:'extract';requestId:string;name:string;bytes:ArrayBuffer;pdfWorker:string}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
export function isExtractRequest(v:unknown):v is ExtractRequest{return object(v)&&v.channel===DOCUMENT_CHANNEL&&v.kind==='extract'&&typeof v.requestId==='string'&&/^document-[0-9]+$/.test(v.requestId)&&typeof v.name==='string'&&v.bytes instanceof ArrayBuffer&&typeof v.pdfWorker==='string'}
function validDocument(v:unknown):v is ImportedDocument{
 return object(v)&&typeof v.name==='string'&&typeof v.bytes==='number'&&Number.isFinite(v.bytes)&&v.bytes>=0&&typeof v.format==='string'&&typeof v.text==='string'&&Array.isArray(v.units)&&v.units.length>0&&v.units.length<=2000&&v.units.every(u=>object(u)&&typeof u.sourceId==='string'&&typeof u.label==='string'&&typeof u.text==='string')
}
export function readExtractResult(v:unknown,requestId:string):{document:ImportedDocument}|{error:Error}|undefined{
 // PDF.js and future worker dependencies own their own protocols; none are application results.
 if(!object(v)||v.channel!==DOCUMENT_CHANNEL||v.kind!=='result'||v.requestId!==requestId)return
 if(v.ok===true&&validDocument(v.document))return {document:v.document}
 if(v.ok===false&&typeof v.error==='string'&&v.error.trim())return {error:new Error(v.error.slice(0,1000))}
 return {error:new Error('本地解析返回无效，请重试。')}
}
