import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({stdin:{contents:"export * from './src/app/lib/work-plan';export * from './src/app/lib/court-records'",resolveDir:decodeURIComponent(new URL('..',import.meta.url).pathname)},bundle:true,format:'esm',platform:'node',write:false}).outputFiles[0].text
const {createWorkPlanSession,workPlanKey,WORK_PLAN,createCourtRecords}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
function host(){const data=new Map([['app.court.todo.2026-10-27',JSON.stringify({version:1,date:'2026-10-27',source:'user-local',items:[{id:'old',time:'08:30',title:'我的旧日程',category:'生活',done:true}],confirmed:false,held:false})]]);let fail=false;const port={getItem:k=>data.get(k)??null,setItem(k,v){if(fail)throw Error('quota');data.set(k,v)},get length(){return data.size},key:i=>[...data.keys()][i]};return{data,port,fail:v=>fail=v,session:()=>createWorkPlanSession(port,()=>new Date('2026-10-27T02:00:00Z'))}}
test('work completion, edits, hold and reopen persist independently of old records and appear in calendar',()=>{
 const h=host(),old=h.data.get('app.court.todo.2026-10-27'),s=h.session();assert.ok(s.open().ok);assert.equal(s.state().day.items.length,6);const first=s.state().day.items[0];assert.ok(s.toggle(first.id).ok)
 const patches=s.state().day.items.map(i=>({id:i.id,time:i.time,title:i.id===first.id?'整理三个选题候选':i.title}));assert.ok(s.edit(patches).ok);assert.ok(s.hold().ok);const restored=h.session();restored.open();assert.equal(restored.state().completed,1);assert.equal(restored.state().day.items[0].title,'整理三个选题候选');assert.equal(restored.state().day.held,true);assert.equal(h.data.get('app.court.todo.2026-10-27'),old)
 const rows=createCourtRecords(h.port).day('2026-10-27').items;assert.equal(rows.length,7);assert.ok(rows.some(i=>i.title==='我的旧日程'&&i.done));assert.ok(rows.some(i=>i.title==='整理三个选题候选'&&i.done&&i.storeKey===workPlanKey('2026-10-27')))
})
test('failed save reports unsaved state; retry retains completion and existing stored values',()=>{
 const h=host(),s=h.session();s.open();const before=h.data.get(workPlanKey('2026-10-27'));h.fail(true);assert.equal(s.toggle(s.state().day.items[0].id).ok,false);assert.equal(s.state().saveState,'error');assert.equal(h.data.get(workPlanKey('2026-10-27')),before);h.fail(false);assert.ok(s.retry().ok);assert.equal(s.state().completed,1);const r=h.session();r.open();assert.equal(r.state().completed,1)
})
test('shared six-task content is practical and does not invent analysis, client or deadlines',()=>{
 assert.equal(WORK_PLAN.tasks.length,6);for(const task of WORK_PLAN.tasks){assert.ok(task.title&&task.description&&task.deliverable);assert.match(task.time,/^\d\d:\d\d$/)}assert.doesNotMatch(JSON.stringify(WORK_PLAN),/测试|示例|模拟|演示|拍摄素材|已读取|分析成功|客户公司|约定交付/)
})
