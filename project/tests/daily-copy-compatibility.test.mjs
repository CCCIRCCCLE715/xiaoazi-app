import test from 'node:test'
import assert from 'node:assert/strict'
import {createTodoSession,exampleTodoDay,todoKey} from '../src/app/lib/todo-day.ts'
import {createCourtRecords} from '../src/app/lib/court-records.ts'
import {createMemorialSession} from '../src/app/lib/memorial-session.ts'

const date='2026-10-26',legacyTitle='拍摄手机演示镜头'
function fixture(source='example-local',origin){
 const day=exampleTodoDay(date),item=day.items[2]
 day.source=source;day.confirmed=true;item.title=legacyTitle;item.done=true
 if(origin)item.origin=origin
 const saved=JSON.stringify(day),data=new Map([[todoKey(date),saved]]),writes=[]
 const port={getItem:k=>data.get(k)??null,setItem(k,v){data.set(k,v);writes.push(k)},key:i=>[...data.keys()][i]??null,get length(){return data.size}}
 return {day,item,saved,data,writes,port,session:createTodoSession(port,()=>new Date('2026-10-26T04:00:00Z')),records:createCourtRecords(port)}
}
test('legacy seeded title is readable in both daily views without rewriting stored records',()=>{
 const f=fixture();assert.equal(f.session.open().ok,true)
 assert.equal(f.session.state().day.items[2].title,'拍摄手机素材')
 assert.equal(f.records.day(date).items[2].title,'拍摄手机素材')
 assert.equal(f.session.state().day.items[2].id,f.item.id)
 assert.equal(f.session.state().day.items[2].done,true)
 assert.equal(f.session.state().day.confirmed,true)
 assert.equal(f.data.get(todoKey(date)),f.saved);assert.equal(f.writes.length,0)
})
test('user-authored titles keep their original words in both views',()=>{
 for(const [source,origin] of [['user-local',undefined],['example-local','user']]){
  const f=fixture(source,origin);f.session.open()
  assert.equal(f.session.state().day.items[2].title,legacyTitle)
  assert.equal(f.records.day(date).items[2].title,legacyTitle)
  assert.equal(f.data.get(todoKey(date)),f.saved);assert.equal(f.writes.length,0)
 }
})
test('calendar edit keeps an explicit user title across both daily views and execution records',()=>{
 const f=fixture(),row=f.records.day(date).items.find(i=>i.id===f.item.id)
 f.records.update(row,{title:legacyTitle,time:row.time,done:row.done})
 assert.equal(f.records.day(date).items.find(i=>i.id===row.id).title,legacyTitle)
 assert.equal(f.session.open().ok,true)
 assert.equal(f.session.state().day.items.find(i=>i.id===row.id).title,legacyTitle)
 const memorial=createMemorialSession(f.port,{key:'day:'+date,ids:[row.id]})
 memorial.open();assert.equal(memorial.decide(row.id,'approved').ok,true)
 assert.equal(f.records.executions()[0].title,legacyTitle)
 assert.equal(f.records.day(date).items.find(i=>i.id===row.id).done,true)
})
test('todo edit keeps an explicit user title after reopening and in calendar and execution records',()=>{
 const f=fixture();assert.equal(f.session.open().ok,true)
 const patches=f.session.state().day.items.map(({id,time,title})=>({id,time,title:id===f.item.id?legacyTitle:title}))
 assert.equal(f.session.edit(patches).ok,true)
 assert.equal(f.session.open().ok,true)
 assert.equal(f.session.state().day.items.find(i=>i.id===f.item.id).title,legacyTitle)
 assert.equal(f.records.day(date).items.find(i=>i.id===f.item.id).title,legacyTitle)
 const memorial=createMemorialSession(f.port,{key:'day:'+date,ids:[f.item.id]})
 memorial.open();assert.equal(memorial.decide(f.item.id,'approved').ok,true)
 assert.equal(f.records.executions()[0].title,legacyTitle)
 assert.equal(f.records.day(date).items.find(i=>i.id===f.item.id).done,true)
 assert.equal(JSON.parse(f.data.get(todoKey(date))).items[0].origin,undefined)
})
test('past decisions use the same legacy display title and retain completion and decision status',()=>{
 const f=fixture(),scope={key:'day:'+date,ids:[f.item.id]},memorial=createMemorialSession(f.port,scope)
 memorial.open();assert.equal(memorial.decide(f.item.id,'approved').ok,true)
 const row=f.records.executions()[0]
 assert.equal(row.title,'拍摄手机素材');assert.equal(row.statusLabel,'已准奏')
 assert.equal(f.data.get(todoKey(date)),f.saved)
 assert.equal(f.records.day(date).items[2].done,true)
})
test('new daily schedule uses ordinary life and work titles',()=>{
 const day=exampleTodoDay(date)
 assert.equal(day.items.length,9);assert.equal(day.items[2].title,'拍摄手机素材')
 assert.ok(day.items.every(i=>!/示例|演示|测试/.test(i.title)))
})
