import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({stdin:{contents:"export{localDecision}from'./src/app/lib/intent-router';export{isTodoIntent}from'./src/app/lib/todo-intent'",resolveDir:decodeURIComponent(new URL('..',import.meta.url).pathname)},bundle:true,format:'esm',platform:'node',write:false,outdir:'/tmp/work-intent',alias:{'@':decodeURIComponent(new URL('../src',import.meta.url).pathname)},loader:{'.mp3':'file','.wav':'file','.m4a':'file','.webm':'file'}}).outputFiles.find(f=>f.path.endsWith('.js')).text
const {localDecision,isTodoIntent}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
test('natural work requests agree in both intent paths',()=>{
 for(const text of ['请你给我整理今天的待办','今天我们要干什么','把今天要办的事给朕看看']){assert.equal(isTodoIntent(text),true,text);assert.equal(localDecision(text).scene,'todo',text)}
})
test('negated, quoted and unrelated work stays outside work scene; concrete intents win',()=>{
 for(const text of ['不要给我整理今天的待办','不用查看这个工作文件','他说“列出今天的工作”','“查看一下这个工作文件”是什么意思','工作文件是什么意思','今天去公司工作','你好，导航去公司','工作辛苦了'])assert.equal(isTodoIntent(text),false,text)
 for(const [text,scene] of [['你好，帮我点外卖','kitchen'],['你好，导航去公司','march'],['你好，明早八点叫我起床','morning'],['整理今天的待办，明早八点叫我起床','morning']])assert.equal(localDecision(text).scene,scene,text)
})

test('explicit work and client entries remain independent of daily todos',()=>{for(const text of ['请你给我列出今天的工作','请你给我查看一下这个工作文件','帮我看看今天有哪些工作','打开工作清单','甲方又催稿了']){assert.equal(isTodoIntent(text),false,text);assert.equal(localDecision(text).scene,'work',text)}})

test('questions about today work stay work while explicit alarms keep priority',()=>{for(const text of ['今天有哪些工作','今天都有哪些工作','帮我看看今天有哪些工作'])assert.equal(localDecision(text).scene,'work',text);for(const text of ['不要查看今天有哪些工作','他说今天有哪些工作','今天有哪些工作是什么意思'])assert.notEqual(localDecision(text).scene,'work',text);assert.equal(localDecision('今天有哪些工作，明早八点叫醒我').scene,'morning')})
