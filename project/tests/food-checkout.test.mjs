import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {setup} from './court-harness.mjs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const bundle=buildSync({stdin:{contents:`import{renderToStaticMarkup}from'react-dom/server';import{createElement}from'react';import{SceneCard}from'./src/app/components/SceneCard';import{enterScene,EMPTY_CONTEXT}from'./src/app/lib/scenes';export const initial=()=>enterScene('kitchen','点外卖',EMPTY_CONTEXT).card;export const markup=(card)=>renderToStaticMarkup(createElement(SceneCard,{card,fullpage:true,onApprove:()=>{},onRevise:()=>{},onHold:()=>{},onRevoke:()=>{},onUpdateKitchen:()=>{},onUpdateMarch:()=>{},onAddDraft:()=>{},onDraftState:()=>{},draftState:{dirty:false,invalid:false}}))`,resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/food-checkout',alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},loader:{'.png':'file','.webp':'file','.webm':'file','.mp3':'file','.wav':'file','.svg':'file','.m4a':'file'},define:{'process.env.NODE_ENV':'"production"'}})
const module={exports:{}};new Function('require','module','exports',bundle.outputFiles.find(f=>f.path.endsWith('.js')).text)(require,module,module.exports)
test('food choice has private delivery defaults cleared; completed delivery needs no budget, taste or save gate',()=>{
 const card=module.exports.initial();assert.equal(card.address,'');assert.equal(card.contactName,'');assert.equal(card.phone,'')
 const html=module.exports.markup({...card,selectedDish:'猪脚饭',address:'示例收货地址',contactName:'测试收货人',phone:'13800000000'});assert.doesNotMatch(html,/aria-label="(?:预算|口味)"|待保存|card-save/)
 assert.match(html,/示例收货地址/);assert.match(html,/测试收货人/);assert.match(html,/13800000000/)
 const footer=html.match(/<footer class="imperial-card-actions">(.*?)<\/footer>/s)[1];assert.equal((footer.match(/<button /g)||[]).length,1);assert.match(footer,/准奏/);assert.match(footer,/food-selected-amount/);assert.match(footer,/>22</);assert.doesNotMatch(html,/去美团下单|前往美团/);assert.doesNotMatch(footer,/disabled/)
 assert.equal((html.match(/class="food-choice"/g)||[]).length,12)
})
test('food approve waits for image selection and rejects incomplete delivery fields',()=>{
 for(const card of [module.exports.initial(),{...module.exports.initial(),selectedDish:'猪脚饭',phone:''}]){
 const html=module.exports.markup(card),footer=html.match(/<footer class="imperial-card-actions">(.*?)<\/footer>/s)[1];assert.match(footer,/disabled/);if(!card.selectedDish){assert.match(footer,/请选择膳食/);assert.doesNotMatch(footer,/food-selected-amount/)}
 }
})
test('approve uses native Meituan launch once; failed launch stays retryable and delivery edits require no save',async()=>{
 let launches=0,fail=true;const merchants=[];const host=setup(async()=>undefined,{openMeituan:async id=>{merchants.push(id);launches++;if(fail)throw new Error('app_missing')},meituanFailure:()=> '未安装美团，请安装后重试。'})
 try{
 await host.render().submit('点外卖');let court=host.render();assert.equal(launches,0)
 court.updateKitchen({selectedDish:'猪脚饭'});court=host.render();court.updateKitchen({address:'新地址',contactName:'测试收货人',phone:'13800000000'});court=host.render();assert.equal(court.card.address,'新地址');assert.equal(court.draftState.dirty,false)
 await court.approve();court=host.render();assert.equal(launches,1);assert.match(court.line,/未安装美团/);assert.equal(court.launchError,'未安装美团，请安装后重试。')
 fail=false;await court.approve();court=host.render();assert.equal(launches,2);assert.deepEqual(merchants,['pork-rice','pork-rice']);assert.match(court.line,/已打开美团/);assert.equal(court.launchError,undefined)
 await court.approve();assert.equal(launches,2)
 }finally{host.unmount()}
})

test('manual changes update displayed price and only approval targets the selected merchant',async()=>{
 const calls=[];const host=setup(async()=>undefined,{openMeituan:async id=>calls.push(id)});
 try{
  await host.render().submit('点外卖');host.render().updateKitchen({address:'测试地址',contactName:'测试收货人',phone:'13800000000'});
  for(const [name,price]of [['猪脚饭',22],['香辣鸡腿堡套餐',26],['农家小炒肉饭',29]]){
   host.render().updateKitchen({selectedDish:name});const card=host.render().card;const footer=module.exports.markup(card).match(/<footer class="imperial-card-actions">(.*?)<\/footer>/s)[1];
   assert.match(footer,new RegExp('>'+price+'<'));assert.match(footer,new RegExp(name));assert.deepEqual(calls,[]);
  }
  await host.render().approve();assert.deepEqual(calls,['damixiansheng']);
 }finally{host.unmount()}
})
test('each merchant remains gated until explicit approval after manual choice',async()=>{
 for(const [name,id]of [['猪脚饭','pork-rice'],['香辣鸡腿堡套餐','kfc'],['农家小炒肉饭','damixiansheng']]){
  const calls=[],host=setup(async()=>undefined,{openMeituan:async merchant=>calls.push(merchant)});
  try{await host.render().submit('点外卖');host.render().updateKitchen({address:'测试地址',contactName:'测试收货人',phone:'13800000000'});host.render().updateKitchen({selectedDish:name});assert.deepEqual(calls,[]);await host.render().approve();assert.deepEqual(calls,[id])}finally{host.unmount()}
 }
})
