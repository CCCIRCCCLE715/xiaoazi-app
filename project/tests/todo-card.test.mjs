import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const result=buildSync({stdin:{contents:"import{renderToStaticMarkup}from'react-dom/server';import{createElement}from'react';import{TodoCard}from'./src/app/components/TodoCard';import{WorkCard}from'./src/app/components/WorkCard';import{DocumentImportPanel}from'./src/app/components/DocumentImportPanel';export const upload=()=>renderToStaticMarkup(createElement(DocumentImportPanel,{state:{phase:'choose'},controller:{}}));export const markup=card=>renderToStaticMarkup(createElement(card.kind==='work'?WorkCard:TodoCard,{card,onClose:()=>{},onNotice:()=>{}}))",resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'tsx'},bundle:true,loader:{'.svg':'dataurl'},platform:'node',format:'cjs',write:false,define:{'process.env.NODE_ENV':'"production"'}})
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports)
test('work records render one swipeable memorial, with details and independent review scope',()=>{
 const html=module.exports.markup({kind:'work',selection:{name:'今日工作安排.pdf'}});assert.match(html,/工作奏折/);assert.match(html,/今日工作安排.pdf/);assert.match(html,/整理本周选题/);assert.match(html,/工作详情/);assert.match(html,/交付内容/);assert.match(html,/data-scope="work:/);assert.match(html,/不准当前奏折/);assert.match(html,/准奏当前奏折/);assert.equal((html.match(/type="checkbox"/g)||[]).length,1);assert.doesNotMatch(html,/示例|演示|模拟|测试|拍摄素材/)
})
test('daily memorials retain daily scope and life arrangements',()=>{const html=module.exports.markup({kind:'todo'});assert.match(html,/批奏折/);assert.match(html,/用早膳/);assert.match(html,/data-scope="day:/);assert.doesNotMatch(html,/工作详情|整理本周选题/)})
test('historical document items share broad task layout and preserve every evidence quote without new plan items',()=>{
 const html=module.exports.markup({kind:'todo',document:{id:'d1',name:'会议.docx',items:[{title:'带样机',dueLabel:null,quote:'请带样机到会场',label:'第1段',sourceId:'p1'},{title:'另一项',dueLabel:'下周',quote:'下周再约',label:'第2段',sourceId:'p2'}]}});assert.match(html,/未标日期/);assert.match(html,/会议.docx/);assert.match(html,/请带样机到会场/);assert.match(html,/下周再约/);assert.doesNotMatch(html,/整理本周选题|用早膳/);assert.equal((html.match(/type="checkbox"/g)||[]).length,2);assert.match(html,/data-scope="document-items-v2:d1"/)
})
test('active upload panel offers metadata-only selection without preview or analysis control',()=>{
 const html=module.exports.upload();assert.match(html,/工作文件/);assert.match(html,/application\/x-xiaoazi-work-plan/);assert.match(html,/选择文件/);assert.doesNotMatch(html,/分析并呈奏|AI分析|提取正文|document-preview|原文件不上传/)
})
