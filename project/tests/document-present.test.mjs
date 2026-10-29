import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
import {createMemorialSession,memorialKey} from '../src/app/lib/memorial-session.ts'
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve()}
function clock(){let now=10000,n=0;const timers=new Map();return {now:()=>now,schedule(fn,ms){const id=++n;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){const end=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush()}now=end;await flush()}}}
const doc={name:'实际日程.xlsx',bytes:1200,format:'xlsx',text:'无默认今天',units:[{sourceId:'sheet-1-row-2',label:'工作 第2行',text:'2026-10-26 16:00交稿'},{sourceId:'sheet-2-row-2',label:'生活 第2行',text:'带样机'}]}
const result={category:'work_message',items:[{sourceId:'sheet-1-row-2',title:'交稿',dueLabel:'2026-10-26 16:00',quote:'2026-10-26 16:00交稿'},{sourceId:'sheet-2-row-2',title:'带样机',dueLabel:null,quote:'带样机'}]}
test('file evidence waits at least1500ms then retains actual items, null date, Todo card and deadline cue',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);const token=h.render().startDocument(),p=h.render().presentDocument(result,doc,token);await flush();await time.advance(1499);assert.equal(h.render().card,undefined);assert.equal(h.render().voiceCue,undefined);await time.advance(1);await p;
 const c=h.render();assert.equal(c.action,'ending-apology');assert.equal(c.context.sceneId,'todo');assert.equal(c.card.kind,'todo');assert.equal(c.card.document.name,doc.name);assert.equal(c.card.document.items[1].dueLabel,null);assert.equal(c.card.document.items[1].label,'生活 第2行');assert.match(c.voiceCue.src,/todo-present/)
})
test('other document does not invent work and cancelled old result cannot restore card or voice',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);let t=h.render().startDocument();let p=h.render().presentDocument({category:'other',items:[]},doc,t);await time.advance(1500);await p;assert.equal(h.render().card,undefined);assert.equal(h.render().voiceCue,undefined);
 t=h.render().startDocument();p=h.render().presentDocument(result,doc,t);h.render().reset();await time.advance(2000);await p;assert.equal(h.render().card,undefined);assert.equal(h.render().voiceCue,undefined)
})
async function present(h,time,source=doc){const token=h.render().startDocument(),p=h.render().presentDocument(result,source,token);await time.advance(1500);await p;return {token,card:h.render().card.document}}
test('restarting with the same request token and a different file cannot inherit saved per-item decisions or legacy document-N content',async()=>{
 const data=new Map(),port={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}
 const legacyDecision=JSON.stringify({version:1,scope:'document:document-1',decisions:{0:'approved',1:'approved'},history:['0','1']})
 const legacyContent=JSON.stringify({name:doc.name,items:[{id:0,title:'旧文件',done:true}]})
 data.set(memorialKey('document:document-1'),legacyDecision);data.set('app.court.document.document-1',legacyContent)
 let time=clock(),h=setup(async()=>undefined,{},time);const first=await present(h,time)
 const prior=createMemorialSession(port,{key:`document:${first.card.id}`,ids:['0','1']});prior.open();prior.decide('0','approved');h.unmount()
 time=clock();h=setup(async()=>undefined,{},time)
 const other={...doc,name:'完全不同.xlsx',text:'不同正文',units:doc.units.map(u=>({...u,text:u.text+'不同内容'}))}
 const next=await present(h,time,other);assert.equal(next.token,first.token)
 assert.notEqual(next.card.id,first.card.id,'a new hook must not reuse persisted document identity when epoch restarts')
 const fresh=createMemorialSession(port,{key:`document:${next.card.id}`,ids:['0','1']});fresh.open();assert.equal(fresh.state().currentId,'0');assert.equal(fresh.state().approved,0)
 assert.equal(data.get(memorialKey('document:document-1')),legacyDecision);assert.equal(data.get('app.court.document.document-1'),legacyContent);h.unmount()
})
test('the same original document has a stable identity on a new request and after restart, so saved decisions resume',async()=>{
 const data=new Map(),port={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}
 let time=clock(),h=setup(async()=>undefined,{},time);const first=await present(h,time)
 const s=createMemorialSession(port,{key:`document:${first.card.id}`,ids:['0','1']});s.open();s.decide('0','declined')
 const repeated=await present(h,time,{...doc,bytes:9999});assert.notEqual(repeated.token,first.token);assert.equal(repeated.card.id,first.card.id)
 h.unmount();time=clock();h=setup(async()=>undefined,{},time);const reopened=await present(h,time,structuredClone(doc));assert.equal(reopened.card.id,first.card.id)
 const restored=createMemorialSession(port,{key:`document:${reopened.card.id}`,ids:['0','1']});restored.open();assert.equal(restored.state().currentId,'1');assert.equal(restored.state().declined,1);assert.equal(restored.undo().ok,true);assert.equal(restored.state().currentId,'0');h.unmount()
})
test('a digest that finishes after cancellation cannot restore an old card, voice or environment',async()=>{
 const subtle=globalThis.crypto.subtle,original=subtle.digest;let release,calls=0
 try{
  subtle.digest=function(...args){calls++;return new Promise(resolve=>{release=()=>original.apply(this,args).then(resolve)})}
  const time=clock(),h=setup(async()=>undefined,{},time),token=h.render().startDocument(),p=h.render().presentDocument(result,doc,token)
  await time.advance(1500);assert.equal(calls,1,'the production hook must await the local digest')
  h.render().navigateDepartment('kitchen');const before=h.render();await release();await p
  const after=h.render();assert.equal(after.card,before.card);assert.equal(after.card.kind,'kitchen');assert.equal(after.environment,before.environment);assert.equal(after.voiceCue,undefined);assert.equal(after.line,before.line);h.unmount()
 }finally{subtle.digest=original}
})
