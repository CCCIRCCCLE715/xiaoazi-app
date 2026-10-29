import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()}
function clock(){let now=0,id=0;const q=new Map();return{now:()=>now,schedule(fn,ms){q.set(++id,{at:now+ms,fn});return id},clear(i){q.delete(i)},async advance(ms){now+=ms;for(const [i,t]of q)if(t.at<=now){q.delete(i);t.fn()}await flush()}}}
function host(){const time=clock(),calls=[],h=setup(async()=>undefined,{openMeituan:async merchant=>calls.push(merchant)},time);h.render();return{h,time,calls}}
async function send(h,time,text){const p=h.render().submit(text);await flush();await time.advance(1500);await p;if(h.render().card?.kind==='kitchen')h.render().updateKitchen({address:'示例收货地址',contactName:'测试收货人',phone:'13800000000'});return h.render()}
test('kitchen shortcut waits 1500ms, overrides stale choice and opens first merchant once',async()=>{
 for(const phrase of ['老样子','照旧','还是老样子','就照旧吧']){const {h,time,calls}=host();await send(h,time,'用膳');h.render().updateKitchen({selectedDish:'香辣鸡腿堡套餐'});await time.advance(1500);h.render();const p=h.render().submit(phrase);await flush();await time.advance(1499);assert.deepEqual(calls,[]);await time.advance(1);await p;assert.deepEqual(calls,['pork-rice'],phrase);assert.equal(h.render().card.selectedDish,'猪脚饭');h.unmount()}
})
test('budget-filtered display chooses its first eligible merchant and empty menu never opens',async()=>{
 for(const [budget,merchant,dish]of [[20,'kfc','新奥尔良烤翅'],[10,undefined,null]]){const {h,time,calls}=host();await send(h,time,`用膳，预算${budget}元`);await send(h,time,'照旧');assert.deepEqual(calls,merchant?[merchant]:[]);assert.equal(h.render().card.selectedDish,dish);h.unmount()}
})
test('outside, negated, quoted and meta shortcuts cannot launch',async()=>{
 for(const phrase of ['老样子','照旧']){const {h,time,calls}=host();await send(h,time,phrase);assert.deepEqual(calls,[]);h.unmount()}
 for(const phrase of ['不要照旧','不用老样子','“照旧”','照旧是什么意思','他说照旧','别照旧，查看工作文件']){const {h,time,calls}=host();await send(h,time,'用膳');await send(h,time,phrase);assert.deepEqual(calls,[],phrase);h.unmount()}
})
test('scene switch or background during thinking cancels shortcut launch',async()=>{
 for(const background of [false,true]){const {h,time,calls}=host();await send(h,time,'用膳');const p=h.render().submit('老样子');await flush();await time.advance(800);let next;if(background){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'))}else next=h.render().submit('批奏折');await flush();await time.advance(1500);await p;if(next)await next;assert.deepEqual(calls,[]);h.unmount()}
})
test('manual selection and approval still target selected merchant',async()=>{const {h,time,calls}=host();await send(h,time,'用膳');h.render().updateKitchen({selectedDish:'农家小炒肉饭'});await time.advance(1500);await send(h,time,'准奏');assert.deepEqual(calls,['damixiansheng']);h.unmount()})
