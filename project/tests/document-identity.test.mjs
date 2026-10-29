import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
let documentIdentity
try{({documentIdentity}=await import('../src/app/lib/document-identity.ts'))}catch{}
const doc={name:'待办.txt',bytes:40,format:'txt',text:'[line-1 第1行] 明天交稿\n[line-2 第2行] 带样机',units:[{sourceId:'line-1',label:'第1行',text:'明天交稿'},{sourceId:'line-2',label:'第2行',text:'带样机'}]}
test('document identity uses a versioned SHA-256 of the exact bounded source, independent of property order and container byte count',async()=>{
 assert.equal(typeof documentIdentity,'function')
 const expected='document-sha256-v1-'+createHash('sha256').update(JSON.stringify({version:1,name:doc.name,format:doc.format,text:doc.text,units:doc.units.map(({sourceId,label,text})=>({sourceId,label,text}))})).digest('hex')
 assert.equal(await documentIdentity(doc),expected)
 assert.equal(await documentIdentity({units:doc.units.map(u=>({text:u.text,label:u.label,sourceId:u.sourceId,ignored:'metadata'})),text:doc.text,format:doc.format,bytes:5000,name:doc.name,lastModified:123}),expected)
 assert.deepEqual(doc.units.map(u=>u.text),['明天交稿','带样机'])
})
test('different body or source-unit text never shares an identity even with the same name and format',async()=>{
 assert.equal(typeof documentIdentity,'function');const id=await documentIdentity(doc)
 assert.notEqual(await documentIdentity({...doc,text:doc.text+'。'}),id)
 assert.notEqual(await documentIdentity({...doc,units:[{...doc.units[0],text:'今天交稿'},doc.units[1]]}),id)
 assert.notEqual(await documentIdentity({...doc,units:[...doc.units].reverse()}),id)
})
test('file name, format and source labels remain part of the identity without normalizing original whitespace',async()=>{
 assert.equal(typeof documentIdentity,'function');const id=await documentIdentity(doc)
 for(const d of [{...doc,name:'另一份.txt'},{...doc,format:'md'},{...doc,text:doc.text+' '},{...doc,units:[{...doc.units[0],label:'第3行'},doc.units[1]]}])assert.notEqual(await documentIdentity(d),id)
})
test('a missing secure local digest fails closed rather than reverting to a request counter',async()=>{
 assert.equal(typeof documentIdentity,'function');const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto')
 try{Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});await assert.rejects(documentIdentity(doc),/指纹/)}finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto}
})
