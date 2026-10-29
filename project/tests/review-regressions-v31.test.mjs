import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function host(){let now=0,id=0;const timers=new Map(),time={now:()=>now,schedule(fn,ms){timers.set(++id,{at:now+ms,fn});return id},clear(id){timers.delete(id)}};const h=setup(async()=>undefined,{},time);return {h,async send(text){const p=h.render().submit(text);await flush();now+=2000;for(const [id,t]of timers)if(t.at<=now){timers.delete(id);t.fn()}await flush();await p;return h.render()}}}
for(const [text,field,want]of [['选烧鸭饭，预算20元','budget',20],['选烧鸭饭，送到公司','address','公司'],['选烧鸭饭，少辣','taste','少辣']])test(text+' merges spoken fields before selecting',async()=>{
 const {h,send}=host();await send('点餐');const c=await send(text);assert.equal(c.card[field],want);assert.equal(c.context[field],want)
 if(field==='budget'){assert.equal(c.card.selectedDish,null);assert.ok(c.card.dishes.every(d=>d.price<=20));assert.match(c.line,/超出预算/)}else assert.equal(c.card.selectedDish,'烧鸭饭')
 h.unmount()
})
