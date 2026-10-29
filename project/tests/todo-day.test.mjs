import test from 'node:test'
import assert from 'node:assert/strict'
import { createTodoSession, shanghaiDay, todoKey } from '../src/app/lib/todo-day.ts'
function fixture(){let at=new Date('2026-10-23T15:30:00Z'), failRead=false, failWrite=false;const values=new Map(),writes=[];const port={getItem:k=>{if(failRead)throw Error('blocked');return values.get(k)??null},setItem:(k,v)=>{if(failWrite)throw Error('quota');values.set(k,v);writes.push(k)}};const changes=[];const make=()=>createTodoSession(port,()=>at,s=>changes.push(s));return {values,writes,make,changes,now:d=>at=new Date(d),readFailure:b=>failRead=b,writeFailure:b=>failWrite=b}}
test('Shanghai date key, whole nine-item day, no replacement on re-entry or refresh',()=>{
 const f=fixture(),s=f.make();assert.equal(shanghaiDay(new Date('2026-10-23T16:01:00Z')),'2026-10-24');s.open();let d=s.state().day;assert.equal(d.date,'2026-10-23');assert.equal(d.items.length,9);assert.equal(d.items[0].time,'08:30');assert.equal(d.items[8].time,'21:30');assert.equal(s.state().completed,0);assert.equal(f.writes.length,1)
 s.toggle(d.items[1].id);const saved=f.values.get(todoKey(d.date));const fresh=f.make();fresh.open();assert.equal(fresh.state().completed,1);assert.equal(f.values.get(todoKey(d.date)),saved);assert.equal(f.writes.length,2)
})
test('check and uncheck persist; edit sorts by time and preserves IDs/completion',()=>{
 const f=fixture(),s=f.make();s.open();const d=s.state().day,id=d.items[1].id;s.toggle(id);assert.equal(s.state().completed,1);s.toggle(id);assert.equal(s.state().completed,0);s.toggle(id)
 const edits=d.items.map(i=>({id:i.id,time:i.id===id?'07:00':i.time,title:i.id===id?'修改后的脚本':i.title}));assert.equal(s.edit(edits).ok,true);const next=s.state().day;assert.equal(next.items[0].id,id);assert.equal(next.items[0].done,true);assert.equal(next.items[0].title,'修改后的脚本');assert.equal(new Set(next.items.map(i=>i.id)).size,9)
 const old=JSON.stringify(next);assert.equal(s.edit(edits.map(i=>({...i,time:'25:01'}))).ok,false);assert.equal(JSON.stringify(s.state().day),old)
 assert.equal(s.edit(edits.map(i=>({...i,title:''}))).ok,false)
})
test('approve confirms current day without completing all; hold retains full day and unfinished data',()=>{
 const f=fixture(),s=f.make();s.open();const id=s.state().day.items[0].id;s.toggle(id);assert.equal(s.confirm().ok,true);assert.equal(s.state().completed,1);assert.equal(s.state().day.confirmed,true);assert.equal(s.hold().ok,true)
 const next=f.make();next.open();assert.equal(next.state().day.items.length,9);assert.equal(next.state().completed,1);assert.equal(next.state().day.held,true);assert.equal(next.state().day.items.filter(i=>!i.done).length,8)
})
test('midnight creates separate new example; stale edit cannot overwrite the prior date',()=>{
 const f=fixture(),s=f.make();s.open();const old=s.state().day;s.toggle(old.items[0].id);const saved=f.values.get(todoKey(old.date));f.now('2026-10-23T16:00:01Z');const r=s.edit(old.items.map(i=>({id:i.id,time:i.time,title:i.title})));assert.equal(r.ok,false);assert.equal(s.state().day.date,'2026-10-24');assert.equal(s.state().completed,0);assert.equal(f.values.get(todoKey(old.date)),saved)
})
test('save failure never claims saved or closes held list; retry preserves latest edit',()=>{
 const f=fixture(),s=f.make();s.open();const id=s.state().day.items[0].id;f.writeFailure(true);assert.equal(s.toggle(id).ok,false);assert.equal(s.state().saveState,'error');assert.equal(s.state().completed,1);assert.equal(s.hold().ok,false);assert.ok(s.state().error);f.writeFailure(false);const r=s.retry();assert.equal(r.ok,true);assert.equal(r.operation,'hold');const next=f.make();next.open();assert.equal(next.state().completed,1);assert.equal(next.state().day.held,true)
})
test('read failure and malformed saved data are not replaced; retry reads safely',()=>{
 const f=fixture();f.readFailure(true);const s=f.make();s.open();assert.equal(s.state().ready,false);assert.equal(s.confirm().ok,false);assert.equal(f.writes.length,0);f.readFailure(false);assert.equal(s.retry().ok,true)
 const key=todoKey(s.state().day.date);f.values.set(key,'{broken');const broken=f.make();assert.equal(broken.open().ok,false);assert.equal(f.values.get(key),'{broken');assert.equal(broken.state().ready,false)
})
