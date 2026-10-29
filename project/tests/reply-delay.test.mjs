import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=10000,next=0;const timers=new Map();return {now:()=>now,schedule(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){const end=now+ms;while(true){const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush()}now=end;await flush()},size:()=>timers.size}}
function host(answer=async()=>undefined){const time=clock(),h=setup(answer,{},time);h.render();return {h,time}}
async function send(h,time,text){const pending=h.render().submit(text);await flush();await time.advance(1500);await pending;return h.render()}
function waiting(c){assert.equal(c.replyPending,true);assert.equal(c.action,'think');assert.equal(c.line,'');assert.equal(c.voiceCue,undefined)}
test('production send: immediate thought, nothing final at1499, scene/text/voice/card/environment released at1500',async()=>{
 const {h,time}=host();const initial=h.render().environment,pending=h.render().submit('点份饭');await flush();waiting(h.render());assert.equal(h.render().card,undefined);assert.equal(h.render().environment,initial)
 await time.advance(1499);waiting(h.render());assert.equal(h.render().card,undefined);assert.equal(h.render().environment,initial)
 await time.advance(1);await pending;const c=h.render();assert.equal(c.replyPending,false);assert.equal(c.card.kind,'kitchen');assert.ok(c.line);assert.ok(c.voiceCue);assert.notEqual(c.environment,initial);assert.equal(time.size(),0)
})
test('fast and slow native classification run concurrently:100ms result waits to1500;2800ms result renders at2800 without another delay',async()=>{
 for(const latency of [100,2800]){const time=clock();let calledAt;const h=setup(()=>{calledAt=time.now();return new Promise(r=>time.schedule(()=>r(undefined),latency))},{},time);const start=time.now(),p=h.render().submit('今天要干什么');await flush();assert.equal(calledAt,start);await time.advance(1499);waiting(h.render());await time.advance(Math.max(1500,latency)-1499);await p;assert.equal(h.render().card.kind,'todo');assert.equal(time.now()-start,Math.max(1500,latency));assert.equal(time.size(),0)}
})
test('all local scenes, malformed model fallback, and clarification obey the same deadline; complaint has no bubble/card',async()=>{
 for(const text of ['点份饭','听曲','今天要干什么','骑行去公司','作诗','护驾','晚安','在群里我不是皇上吗','讲讲光是什么']){
  const {h,time}=host(async()=> 'untrusted model output');const p=h.render().submit(text);await flush();await time.advance(1499);waiting(h.render());assert.equal(h.render().card,undefined,text);await time.advance(1);await p;assert.equal(h.render().replyPending,false,text);assert.ok(h.render().line||h.render().voiceCue,text)
  if(text==='在群里我不是皇上吗'){assert.equal(h.render().action,'ending-apology');assert.equal(h.render().line,'');assert.equal(h.render().card,undefined);assert.equal(h.render().voiceCue.action,'ending-apology')}
  if(text==='讲讲光是什么')assert.match(h.render().line,/用膳/)
 }
})
test('new send replaces the waiting request rather than queueing; slow old model cannot refill after replacement',async()=>{
 let release;const {h,time}=host(text=>text==='听曲'?new Promise(r=>release=r):Promise.resolve(undefined));const old=h.render().submit('听曲');await flush();await time.advance(1000);const fresh=h.render().submit('在群里我不是皇上吗');await flush();release(undefined);await old;await time.advance(1499);waiting(h.render());await time.advance(1);await fresh;assert.equal(h.render().action,'ending-apology');assert.equal(h.render().card,undefined);await time.advance(10000);assert.equal(h.render().action,'ending-apology')
})
test('stop cancels old voice/action immediately; its acknowledgment waits independently and cannot resurrect the old result',async()=>{
 const {h,time}=host();await send(h,time,'听曲');assert.ok(h.render().voiceCue);let stopped=0;window.addEventListener('xiaoazi:voice-stop',()=>stopped++);const p=h.render().submit('停止');await flush();assert.ok(stopped);assert.equal(h.render().voiceCue,undefined);assert.equal(h.render().card,undefined);assert.equal(h.render().action,'idle');assert.equal(h.render().line,'');await time.advance(1499);assert.equal(h.render().line,'');await time.advance(1);await p;assert.match(h.render().line,/收声/)
})
test('leave, recording entry, reset, native background, pagehide, hidden document and unmount reject both ready timers and late model results',async()=>{
 for(const cancel of ['leave','reset','native-pause','pagehide','hidden','unmount']){let release;const {h,time}=host(()=>new Promise(r=>release=r));const p=h.render().submit('听曲');await flush();await time.advance(500);if(cancel==='leave'||cancel==='reset')h.render()[cancel]();else if(cancel==='unmount')h.unmount();else if(cancel==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'))}else window.dispatchEvent(new Event(cancel==='native-pause'?'xiaoazi:pause':'pagehide'));release(undefined);await p;await time.advance(10000);const c=h.render();assert.equal(c.line,'',cancel);assert.equal(c.voiceCue,undefined,cancel);assert.equal(c.card,undefined,cancel);assert.equal(time.size(),0,cancel)}
 const page=readFileSync(new URL('../src/app/pages/CourtPage.tsx',import.meta.url),'utf8');assert.match(page,/onBeforeListen\(\)\{courtRef.current.leave\(\)/);assert.match(page,/async onSubmit[^\n]*void courtRef.current.submit\(text\)/,'accept draft immediately so recording/new send remains available during response wait');assert.match(page,/action=\{court.replyPending\?court.action:/);assert.match(page,/sequenceNext=\{!court.replyPending/)
})
test('character tap, revise, hold, revoke and ordinary approval failure replies cannot bypass the gate',async()=>{
 for(const operation of ['revise','hold','revoke','approve']){const {h,time}=host();await send(h,time,'点份饭');const priorCard=h.render().card;const p=h.render()[operation]();await flush();waiting(h.render());await time.advance(1499);assert.equal(h.render().line,'',operation);await time.advance(1);await p;assert.equal(h.render().replyPending,false,operation);assert.ok(h.render().line,operation);if(operation==='hold'||operation==='revoke')assert.equal(h.render().card,undefined);if(operation==='revise')assert.equal(h.render().card,priorCard)}
})
test('text pending revise/hold/revoke/approve branches use the original send deadline exactly once',async()=>{
 for(const text of ['重拟','留中','撤旨','准奏']){const {h,time}=host();await send(h,time,'点份饭');const start=time.now(),p=h.render().submit(text);await flush();waiting(h.render());await time.advance(1499);assert.equal(h.render().line,'');await time.advance(1);await p;assert.equal(h.render().replyPending,false);assert.ok(h.render().line,text);assert.equal(time.now()-start,1500,text)}
})
test('form data and checkbox-like edits stay immediate; their character acknowledgments wait and cancel cleanly',async()=>{
 const {h,time}=host();await send(h,time,'点份饭');h.render().updateKitchen({taste:'不要辣'});assert.equal(h.render().card.taste,'不要辣');waiting(h.render());await time.advance(1499);assert.equal(h.render().line,'');await time.advance(1);assert.match(h.render().line,/记下/)
 await send(h,time,'骑行去公司');h.render().updateMarch({destination:'图书馆'});assert.equal(h.render().card.destination,'图书馆');waiting(h.render());await time.advance(1500);assert.match(h.render().line,/图书馆/)
})
test('Todo button notice/hold gets a new deadline; a text-driven command callback shares its existing elapsed deadline',async()=>{
 const {h,time}=host();await send(h,time,'今天要干什么');const p=h.render().todoNotice('今日安排已确认。');await flush();waiting(h.render());await time.advance(1499);assert.equal(h.render().line,'');await time.advance(1);await p;assert.equal(h.render().line,'今日安排已确认。')
 const command=h.render().submit('准奏');await flush();await time.advance(1500);await command;const token=h.render().card.commandNonce;const start=time.now();await h.render().todoNotice('今日安排已确认。',token);assert.equal(time.now(),start);assert.equal(h.render().line,'今日安排已确认。');assert.equal(time.size(),0)
 const hold=h.render().closeTodo('未完成的待办已留存。');await flush();assert.equal(h.render().card,undefined);assert.equal(h.render().line,'');await time.advance(1500);await hold;assert.match(h.render().line,/留存/)
})
test('old action ended during thought cannot release the pending final action early',async()=>{const {h,time}=host();const p=h.render().submit('在群里我不是皇上吗');await flush();h.render().onActionEnd();waiting(h.render());await time.advance(1500);await p;assert.equal(h.render().action,'ending-apology')})

test('boss-context early answer and successful approval receipt obey the gate too',async()=>{
 const {h,time}=host();await send(h,time,'护驾');assert.equal(h.render().context.protectReady,true)
 const boss=h.render().submit('是老板');await flush();waiting(h.render());await time.advance(1499);assert.equal(h.render().line,'');await time.advance(1);await boss;assert.match(h.render().line,/请安/)
 const successful=host();window.mcp={callTool:async()=>({text:''})};const h2=successful.h,t2=successful.time;await send(h2,t2,'点份饭');h2.render().updateKitchen({selectedDish:h2.render().card.dishes[0].name,address:'示例收货地址',contactName:'测试收货人',phone:'13800000000'});await t2.advance(1500)
 const approved=h2.render().approve();await flush();waiting(h2.render());await t2.advance(1499);assert.equal(h2.render().line,'');await t2.advance(1);await approved;assert.match(h2.render().line,/已打开美团/)
})
test('stale Todo command callbacks cannot clear a newer scene card',async()=>{
 const {h,time}=host();await send(h,time,'今天要干什么');await send(h,time,'准奏');const token=h.render().card.commandNonce;await send(h,time,'点份饭');const card=h.render().card
 await h.render().closeTodo('旧留中',token);await h.render().todoNotice('旧准奏',token);assert.equal(h.render().card,card);assert.notEqual(h.render().line,'旧准奏')
})
