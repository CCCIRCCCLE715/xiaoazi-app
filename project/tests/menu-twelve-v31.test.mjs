import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild'),root=fileURLToPath(new URL('..',import.meta.url))
const code=buildSync({stdin:{contents:"export{KITCHEN_DISHES,enterScene,EMPTY_CONTEXT}from'./src/app/lib/scenes';export{buildDevicePlan}from'./src/app/lib/device-plan'",resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/menu-v31',loader:{'.mp3':'file','.wav':'file','.m4a':'file','.webm':'file'}}).outputFiles.find(f=>f.path.endsWith('.js')).text
const m={exports:{}};new Function('require','module','exports',code)(require,m,m.exports)
const {KITCHEN_DISHES:menu,enterScene,EMPTY_CONTEXT,buildDevicePlan}=m.exports
test('12 stable choices map to exactly the three verified merchant IDs, never dish IDs',()=>{
 assert.equal(menu.length,12);assert.equal(new Set(menu.map(d=>d.id)).size,12);assert.equal(new Set(menu.map(d=>d.name)).size,12)
 const expected=['pork-rice','kfc','damixiansheng','pork-rice','pork-rice','pork-rice','kfc','kfc','kfc','damixiansheng','damixiansheng','damixiansheng']
 const reply=enterScene('kitchen','点餐',EMPTY_CONTEXT);reply.card={...reply.card,address:'示例收货地址',contactName:'测试收货人',phone:'13800000000'}
 for(const [i,dish]of menu.entries()){
  const plan=buildDevicePlan('open-alipay',{...reply.card,selectedDish:dish.name})
  assert.equal(plan.ok,true);assert.equal(plan.plan.merchantId,expected[i]);assert.ok(dish.shareUrl.startsWith('http://dpurl.cn/'));assert.ok(dish.price>0)
 }
})
test('each reference price respects inclusive budgets and rejects one yuan less',()=>{
 const reply=enterScene('kitchen','点餐',EMPTY_CONTEXT);reply.card={...reply.card,address:'示例收货地址',contactName:'测试收货人',phone:'13800000000'}
 for(const dish of menu){
  assert.equal(buildDevicePlan('open-alipay',{...reply.card,selectedDish:dish.name,budget:dish.price}).ok,true)
  assert.equal(buildDevicePlan('open-alipay',{...reply.card,selectedDish:dish.name,budget:dish.price-1}).ok,false)
 }
 assert.deepEqual(enterScene('kitchen','预算10元',EMPTY_CONTEXT).card.dishes,[])
})
test('spoken legacy names and last menu item select real dishes; denial, quotes and ambiguity do not',()=>{
 const selected=text=>enterScene('kitchen',text,EMPTY_CONTEXT).card.selectedDish
 assert.equal(selected('我要肯德基'),'香辣鸡腿堡套餐');assert.equal(selected('选大米先生'),'农家小炒肉饭');assert.equal(selected('我要香菇滑鸡饭'),'香菇滑鸡饭')
 for(const text of ['不要肯德基','他说想吃猪脚饭','猪脚饭和烧鸭饭','猪脚饭是什么'])assert.equal(selected(text),undefined,text)
})
