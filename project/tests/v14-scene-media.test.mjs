import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve()}
function clock(){let now=10000,n=0;const timers=new Map();return {now:()=>now,schedule(fn,ms){const id=++n;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){const end=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush()}now=end;await flush()}}}
function host(answer=async()=>undefined){const time=clock(),h=setup(answer,{},time);h.render();return {h,time}}
async function send(h,time,text){const p=h.render().submit(text);await flush();await time.advance(1500);await p;return h.render()}
test('food requests share one merchant list and one standard food voice',async()=>{
 for(const text of ['小A子，给朕弄份猪脚饭，三十以内','来份猪脚饭，预算30元','点外卖','美食列表','美食清单','想吃肯德基','想吃大米先生']){
  const {h,time}=host();try{const c=await send(h,time,text);assert.equal(c.card.kind,'kitchen');assert.match(c.voiceCue.src,/kitchen-meal/);assert.equal(c.card.variant,undefined);assert.equal(c.card.dishes.length,12);assert.deepEqual([...new Set(c.card.dishes.map(d=>d.merchantId))],['pork-rice','kfc','damixiansheng']);assert.equal(c.card.address,'')}finally{h.unmount()}
 }
})
test('daily memorial uses retained scroll action and original daily voice but retains Todo scene/card',async()=>{
 const {h,time}=host();const c=await send(h,time,'呈上今天的奏折');assert.equal(c.context.sceneId,'todo');assert.equal(c.card.kind,'todo');assert.equal(c.action,'scroll');assert.match(c.voiceCue.src,/todo-present/);assert.equal(c.voiceCue.action,'scroll')
 const ending=await send(h,time,'甲方又要改稿');assert.equal(ending.context.sceneId,'work');assert.equal(ending.card?.kind,'work')
})
test('explicit todo requests retain their card and daily voice when the model returns a different valid scene',async()=>{
 for(const text of ['待办','小A子，看看今日待办','呈上今天的奏折']){
  for(const scene of ['protect','ending','morning','poem','memorial']){
   const {h,time}=host(async()=>JSON.stringify({scene,confidence:.98,slots:{},clarify:false}))
   try{const c=await send(h,time,text);assert.equal(c.context.sceneId,'todo',`${text}: model ${scene}`);assert.equal(c.card?.kind,'todo');assert.match(c.voiceCue?.src??'',/todo-present/)}finally{h.unmount()}
  }
 }
})
