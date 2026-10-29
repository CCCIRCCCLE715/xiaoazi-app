import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDevicePlan } from '../src/app/lib/device-plan.ts'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/todo-intent.ts',import.meta.url))],bundle:true,format:'esm',platform:'node',write:false}).outputFiles[0].text
const {routeTodoInput}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
test('todo is rejected by every external device plan including SMS/calendar',()=>{
 for(const task of ['query-calendar','open-alipay','save-draft','open-map']){assert.equal(buildDevicePlan(task,{kind:'todo'}).ok,false,task);assert.equal(buildDevicePlan(task,{kind:'work'}).ok,false,task)}
 const draft={kind:'memorial',recipient:'对方',draft:'收到',source:'演示',points:[]}
 assert.equal(buildDevicePlan('save-draft',draft).ok,true)
})
test('new todo opens before pending external approval, while local commands remain scoped',()=>{
 assert.deepEqual(routeTodoInput('列出今日待办，准奏',false),{kind:'open'})
 for(const [text,command] of [['准奏','approve'],['重拟','revise'],['留中','hold']]){
  assert.deepEqual(routeTodoInput(text,true),{kind:'command',command});assert.equal(routeTodoInput(text,false),undefined)
 }
 for(const text of ['不要准奏','你说“留中”','停止待办','帮我回消息'])assert.equal(routeTodoInput(text,true),undefined,text)
 assert.deepEqual(routeTodoInput('重新列出今日待办',true),{kind:'open'})
})
