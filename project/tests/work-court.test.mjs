import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=0,id=0;const q=new Map();return{now:()=>now,schedule(fn,ms){q.set(++id,{at:now+ms,fn});return id},clear(i){q.delete(i)},async advance(ms){now+=ms;for(const [i,t]of q)if(t.at<=now){q.delete(i);t.fn()}await flush()}}}
function host(){let calls=0;const time=clock(),h=setup(async()=>{calls++;return undefined},{},time);h.render();return{h,time,calls:()=>calls}}
async function send(h,time,text){const p=h.render().submit(text);await flush();await time.advance(1500);await p;return h.render()}
test('pure spoken greetings use dedicated home voice after1500ms and never open a card',async()=>{
 for(const text of ['小A子你好','你好啊','小a子，你好呀','小阿子你好','你好，小A子']){const {h,time,calls}=host();const p=h.render().submit(text);await flush();await time.advance(1499);assert.equal(h.render().voiceCue,undefined);assert.equal(h.render().action,'think');await time.advance(1);await p;const c=h.render();assert.equal(c.context.sceneId,'idle',text);assert.equal(c.card,undefined,text);assert.match(c.voiceCue?.src??'',/home-greeting/);assert.match(c.line,/您可算想起咱啦/);assert.equal(c.action,'reply');assert.equal(calls(),0);h.unmount()}
})
test('greeting wording cannot steal a concrete command, quotes, negation or active work',async()=>{
 for(const text of ['不要说你好','他说你好啊','“小A子你好”是什么意思','好']){const {h,time}=host();const c=await send(h,time,text);assert.ok(!c.voiceCue?.src.match(/(?:idle|home)-greeting/),text);h.unmount()}
 for(const [text,scene]of [['你好，帮我点外卖','kitchen'],['你好，导航去公司','march'],['你好，明早八点叫我起床','morning']]){const {h,time}=host();const p=h.render().submit(text);await flush();await time.advance(scene==='morning'?2000:1500);await p;assert.equal(h.render().context.sceneId,scene);h.unmount()}
 const {h,time}=host();await send(h,time,'请你给我列出今天的工作');await send(h,time,'你好啊');assert.ok(!h.render().voiceCue?.src.match(/(?:idle|home)-greeting/));h.unmount()
})
test('metadata selection and spoken work share work voice, ending action, and fixed plan; metadata is not document evidence',async()=>{
 const {h,time}=host(),file={name:'今日工作安排.pdf',type:'application/pdf',bytes:2048};const p=h.render().openWorkTasks(file);await flush();await time.advance(1499);assert.equal(h.render().card,undefined);await time.advance(1);await p;const c=h.render();assert.equal(c.card.kind,'work');assert.deepEqual(c.card.selection,file);assert.equal(c.card.document,undefined);assert.equal(c.action,'ending-apology');assert.match(c.voiceCue.src,/todo-deadline/);h.unmount()
})

test('tapping Xiaoazi retains old idle voice and cannot replace a submitted greeting',async()=>{
 const {h,time}=host();h.render().react();await time.advance(1499);assert.equal(h.render().voiceCue,undefined);await time.advance(1);assert.match(h.render().voiceCue.src,/idle-greeting/);assert.equal(h.render().line,'陛下有何吩咐？');assert.equal(h.render().card,undefined)
 const pending=h.render().submit('小A子你好');await flush();h.render().react();await time.advance(1500);await pending;assert.match(h.render().voiceCue.src,/home-greeting/);h.unmount()
})
