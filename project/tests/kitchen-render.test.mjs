import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const root=fileURLToPath(new URL('..',import.meta.url))
const result=buildSync({stdin:{contents:`import{renderToStaticMarkup}from'react-dom/server';import{createElement}from'react';import{SceneCard}from'./src/app/components/SceneCard';export const markup=(budget,selectedDish)=>renderToStaticMarkup(createElement(SceneCard,{card:{kind:'kitchen',budget,selectedDish,taste:null,address:null,dishes:[]},onApprove(){},onRevise(){},onHold(){},onRevoke(){},onUpdateKitchen(){},onUpdateMarch(){},onAddDraft(){},onDraftState(){},draftState:{dirty:false,invalid:false}}))`,resolveDir:root,loader:'tsx'},alias:{'@':root+'/src'},loader:{'.png':'file','.webp':'file','.svg':'file','.mp3':'file','.m4a':'file','.wav':'file','.webm':'file'},outdir:'/tmp/kitchen-render-test',bundle:true,platform:'node',format:'cjs',write:false,define:{'process.env.NODE_ENV':'"production"'}})
const module={exports:{}};new Function('require','module','exports',result.outputFiles.find(f=>f.path.endsWith('.js')).text)(require,module,module.exports)
const choices=html=>[...html.matchAll(/<button\b([^>]*aria-label="选择[^"]+"[^>]*)>(.*?)<\/button>/gs)]
test('twelve-dish menu shows store details and retains budget selection state',()=>{
 const html=module.exports.markup(26,'香辣鸡腿堡套餐'),buttons=choices(html)
 assert.equal(buttons.length,12)
 assert.deepEqual(buttons.slice(0,3).map(b=>b[1].match(/aria-label="([^"]+)"/)[1]),['选择猪脚饭','选择香辣鸡腿堡套餐','选择农家小炒肉饭'])
 for(const [i,price]of[22,26,29].entries())assert.match(buttons[i][2],new RegExp(`</svg>${price}<span>`))
 for(const name of ['阿祥嫂隆江猪脚饭（绿汀路店）','肯德基宅急送（余杭塘路二店）','大米先生新鲜现炒（浙大校友店）'])assert.ok(html.includes(name))
 assert.equal((html.match(/class="food-rating"/g)||[]).length,12)
 const distances=[...html.matchAll(/距你 ([\d.]+) 公里/g)].map(m=>Number(m[1]));assert.equal(distances.length,12);assert.ok(distances.every(d=>d>=0&&d<=2))
 assert.match(buttons[1][1],/aria-pressed="true"/)
 assert.doesNotMatch(buttons[0][1],/disabled/)
 assert.match(buttons[2][1],/disabled=""/)
 assert.match(buttons[2][2],/超预算/)
 assert.doesNotMatch(html,/示例|猪脚饭 · [ABC]|巴比馒头/)
})
test('generic kitchen retains spoken-budget filtering but has no budget or taste fields',()=>{
 const html=module.exports.markup(26,null),buttons=choices(html)
 assert.equal(buttons.length,12)
 assert.deepEqual(buttons.slice(0,3).map(b=>b[1].match(/aria-label="([^"]+)"/)[1]),['选择猪脚饭','选择香辣鸡腿堡套餐','选择农家小炒肉饭'])
 assert.match(buttons[2][1],/disabled=""/)
 assert.doesNotMatch(html,/示例|猪脚饭 · [ABC]/)
 assert.doesNotMatch(html,/aria-label="(?:预算|口味)"/);for(const label of ['地址','联系人','手机号'])assert.ok(html.includes(`aria-label="${label}"`))
})
