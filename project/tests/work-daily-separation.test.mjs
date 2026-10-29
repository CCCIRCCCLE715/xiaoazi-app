import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=0,id=0;const q=new Map();return{now:()=>now,schedule(fn,ms){q.set(++id,{at:now+ms,fn});return id},clear(i){q.delete(i)},async advance(ms){now+=ms;for(const [i,t]of q)if(t.at<=now){q.delete(i);t.fn()}await flush()}}}
async function send(h,time,text){const p=h.render().submit(text);await flush();await time.advance(1500);await p;return h.render()}
test('daily and work speech produce distinct cards and audio, including rapid transitions',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);h.render()
 for(const text of ['今天有什么待办','今天的安排有什么','今天我们要干什么','批奏折']){const c=await send(h,time,text);assert.equal(c.card?.kind,'todo',text);assert.match(c.voiceCue?.src||'',/todo-present/,text)}
 for(const text of ['请你给我列出今天的工作','今天工作安排','甲方又催稿了','查看工作文件']){const c=await send(h,time,text);assert.equal(c.context.sceneId,'work',text);assert.equal(c.card?.kind,'work',text);assert.match(c.voiceCue?.src||'',/todo-deadline/,text)}
 assert.equal((await send(h,time,'今天的安排有什么')).card?.kind,'todo');assert.equal((await send(h,time,'黄白你的稿子呢')).context.sceneId,'protect');h.unmount()
})
test('work and daily approval commands stay local to the visible deck',async()=>{
 const time=clock(),h=setup(async()=>undefined,{},time);h.render();await send(h,time,'今天工作安排');const c=await send(h,time,'准奏');assert.equal(c.card?.kind,'work');assert.equal(c.card?.command,'approve');h.unmount()
})
