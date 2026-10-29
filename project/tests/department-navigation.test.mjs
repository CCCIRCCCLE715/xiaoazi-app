import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=10000,next=0;const timers=new Map();return{now:()=>now,schedule(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){const end=now+ms;while(true){const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush()}now=end;await flush()},size:()=>timers.size}}
test('four department selections navigate immediately through existing cards without model, voice or device execution',()=>{
 let models=0,devices=0;const h=setup(async()=>{models++},{openMeituan:async()=>{devices++}});h.render()
 for(const [target,kind] of [['kitchen','kitchen'],['todo','todo'],['march','march'],['home',undefined]]){assert.equal(h.render().navigateDepartment(target),true);const c=h.render();assert.equal(c.card?.kind,kind);assert.equal(c.line,'');assert.equal(c.action,'idle');assert.equal(c.voiceCue,undefined);assert.equal(c.replyPending,false);assert.equal(c.localNavigation,true)}
 assert.equal(models,0);assert.equal(devices,0);h.unmount()
})
test('choosing the active department is a no-op retaining card, destination, edits and request token',()=>{
 const h=setup(async()=>assert.fail('menu must not call a model'));h.render().navigateDepartment('kitchen');let c=h.render();c.updateKitchen({address:'本地编辑地址'});c.reportDraftState(true,false);c=h.render();const before={card:c.card,context:c.context,nonce:c.reactionNonce,message:c.messageNonce,cancels:h.cancels()};assert.equal(c.navigateDepartment('kitchen'),false);c=h.render();assert.equal(c.card,before.card);assert.equal(c.context,before.context);assert.equal(c.reactionNonce,before.nonce);assert.equal(c.messageNonce,before.message);assert.equal(c.draftState.dirty,true);assert.equal(h.cancels(),before.cancels);h.unmount()
})
test('local navigation cancels an outstanding reply and obsolete document/Todo callbacks cannot reopen it',async()=>{
 let resolveModel;const time=clock(),h=setup(()=>new Promise(r=>resolveModel=r),{},time);const old=h.render().submit('讲个新故事');await flush();assert.equal(h.render().replyPending,true);const docToken=h.render().startDocument();h.render().navigateDepartment('march');resolveModel?.(undefined);await old;await time.advance(10000);await h.render().failDocument(new Error('old'),docToken);await h.render().todoNotice('旧确认',docToken);const c=h.render();assert.equal(c.card.kind,'march');assert.equal(c.card.stage,'choose');assert.equal(c.line,'');assert.equal(c.voiceCue,undefined);assert.equal(time.size(),0);h.unmount()
})
test('menu travel is ready without a voice-frame gate; subsequent two-turn voice keeps the1500ms contract',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);h.render().navigateDepartment('march');let c=h.render();assert.equal(c.localNavigation,true);assert.equal(c.card.stage,'choose');assert.equal(c.card.mode,null);assert.equal(c.card.destination,null)
 const pending=c.submit('我要去公司');await flush();await time.advance(1499);assert.equal(h.render().replyPending,true);await time.advance(1);await pending;c=h.render();assert.equal(c.card.destination,'公司');assert.equal(c.card.stage,'choose');assert.equal(c.localNavigation,false)
 const ride=c.submit('御驾亲蹬');await flush();await time.advance(1500);await ride;c=h.render();assert.equal(c.card.stage,'route');assert.equal(c.card.mode,'骑行');assert.equal(c.card.destination,'公司');assert.equal(c.voiceCue.action,'point');h.unmount()
})
test('home navigation cancels a pending document even while its scene context is idle',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);const token=h.render().startDocument();assert.equal(h.render().replyPending,true);assert.equal(h.render().navigateDepartment('home'),true);await h.render().failDocument(new Error('late'),token);await time.advance(10000);assert.equal(h.render().line,'');assert.equal(h.render().replyPending,false);assert.equal(h.render().card,undefined);h.unmount()
})
