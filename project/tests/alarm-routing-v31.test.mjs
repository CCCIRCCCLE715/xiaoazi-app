import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=0,id=0;const timers=new Map();return{now:()=>now,schedule(fn,ms){timers.set(++id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){now+=ms;for(const [id,t] of timers)if(t.at<=now){timers.delete(id);t.fn()}await flush()}}}
// Removing the local alarm branch would wait for the cloud and fail these deadlines.
for(const text of ['喊小A子叫我起床','把闹钟功能调出来','叫醒我','现在响闹钟','提醒我起身'])test(text+' opens fullscreen at 2000ms without cloud or old scene voice',async()=>{
 const time=clock();let requests=0;const h=setup(async()=>{requests++;return undefined},{},time)
 const pending=h.render().submit(text);await flush();await time.advance(1999)
 assert.equal(h.render().alarmRequest,undefined);assert.equal(h.render().voiceCue,undefined);assert.equal(h.render().replyPending,true)
 await time.advance(1);await pending
 assert.equal(typeof h.render().alarmRequest?.id,'number');assert.equal(h.render().voiceCue,undefined);assert.equal(h.render().action,'idle');assert.equal(h.render().card,undefined);assert.equal(requests,0)
 h.unmount()
})
test('future wall time opens the page with its explicit time and never writes a native schedule',async()=>{
 const time=clock();let writes=0;const h=setup(async()=>undefined,{nativeRequest:async()=>writes++},time)
 const p=h.render().submit('明天早上八点叫醒我');await flush();await time.advance(2000);await p
 const c=h.render();assert.equal(typeof c.alarmRequest?.id,'number');assert.equal(c.alarmRequest.time,'08:00');assert.equal(c.card,undefined);assert.equal(c.context.pending,false);assert.equal(c.voiceCue,undefined);assert.equal(writes,0);h.unmount()
})
for(const method of ['leave','reset','pause','hidden','unmount','stop'])test(method+' cancels a pending immediate ring',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);const p=h.render().submit('把闹钟调出来');await flush();await time.advance(1000)
 if(method==='unmount')h.unmount();else if(method==='pause')window.dispatchEvent(new Event('xiaoazi:pause'));else if(method==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'))}else if(method==='stop'){void h.render().submit('停止');await flush()}else h.render()[method]()
 await time.advance(5000);await p;assert.equal(h.render().alarmRequest,undefined);assert.equal(h.render().voiceCue,undefined);h.unmount()
})
for(const text of ['不要叫醒我','别开闹钟','他说“把闹钟调出来”','闹钟是什么','如何设置闹钟','不要设置闹铃','取消闹铃','关闭闹钟'])test(text+' does not ring',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time),p=h.render().submit(text);await flush();await time.advance(2000);await p;assert.equal(h.render().alarmRequest,undefined);h.unmount()
})

for(const text of ['明天28点叫我起床','明天叫我起床','十分钟后叫醒我'])test(text+' opens the foreground page without inventing a display time',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time),p=h.render().submit(text);await flush();await time.advance(2000);await p;assert.equal(typeof h.render().alarmRequest?.id,'number');assert.equal(h.render().alarmRequest.time,undefined);h.unmount()
})
