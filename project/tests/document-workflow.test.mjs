import test from 'node:test'
import assert from 'node:assert/strict'
import {createDocumentWorkflow} from '../src/app/lib/document-workflow.ts'
const doc={name:'a.txt',bytes:4,format:'txt',text:'交稿',units:[{sourceId:'line-1',label:'行1',text:'交稿'}]};const result={category:'todo',items:[{title:'交稿',dueLabel:null,sourceId:'line-1',quote:'交稿'}]}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()}
test('work selection forwards metadata only; no file body API, extraction, analysis or preview',async()=>{
 let selected,extracts=0,analyses=0
 const h=host({extract:async()=>{extracts++;throw Error('must not extract')},analyze:async()=>{analyses++;throw Error('must not analyze')},selectWorkPlan:async metadata=>{selected=metadata}})
 const file={name:'今日工作安排.pdf',type:'application/pdf',size:2048,arrayBuffer(){throw Error('must not read')},text(){throw Error('must not read')},stream(){throw Error('must not stream')}}
 h.c.open();h.c.choosing();await h.c.select(file);await h.c.analyze()
 assert.deepEqual(selected,{name:file.name,type:file.type,bytes:file.size});assert.equal(extracts,0);assert.equal(analyses,0);assert.equal(h.c.state().phase,'closed');assert.equal(h.c.state().document,undefined)
})
function host(overrides={}){let calls=0,shown=[],starts=0;const c=createDocumentWorkflow({extract:async()=>doc,analyze:async()=>{calls++;return result},onAnalyzeStart:()=>++starts,present:async(r,d,t)=>shown.push([r,d,t]),cancelCurrent(){},failure:async()=>{},change(){},...overrides});return {c,calls:()=>calls,shown,starts:()=>starts}}
test('preview stays local, explicit confirmation sends once and presents real items',async()=>{const h=host();h.c.open();await h.c.select({name:'a.txt'});assert.equal(h.c.state().phase,'preview');assert.equal(h.calls(),0);const q=h.c.analyze();await h.c.analyze();await q;assert.equal(h.calls(),1);assert.equal(h.shown[0][0],result);assert.equal(h.c.state().phase,'closed')})
test('SAF selecting survives expected background; reading/analyzing background cancels and ignores late results',async()=>{
 const h=host();h.c.open();h.c.choosing();h.c.background();assert.equal(h.c.state().phase,'selecting');await h.c.select({name:'a.txt'});assert.equal(h.c.state().phase,'preview')
 let resolve;const late=host({analyze:()=>new Promise(r=>resolve=r)});await late.c.select({name:'a.txt'});const p=late.c.analyze();await flush();late.c.background();resolve(result);await p;assert.equal(late.shown.length,0);assert.equal(late.c.state().phase,'closed')
})
test('delete/new command/new file invalidates parse/model and retry preserves explicit confirmation',async()=>{
 let done;const h=host({extract:()=>new Promise(r=>done=r)});const p=h.c.select({name:'a.txt'});h.c.cancel();done(doc);await p;assert.equal(h.c.state().phase,'closed')
 let fail=true;const r=host({analyze:async()=>{if(fail)throw new Error('authentication');return result}});await r.c.select({name:'a.txt'});await r.c.analyze();assert.equal(r.c.state().phase,'error');assert.equal(r.shown.length,0);fail=false;await r.c.analyze();assert.equal(r.shown.length,1)
})
