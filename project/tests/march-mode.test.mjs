import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {renderToStaticMarkup} from 'react-dom/server'
import {createElement} from 'react'
const require=createRequire(import.meta.url)
const {buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/components/MarchJourney.tsx',import.meta.url).pathname)],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react/*'],loader:{'.svg':'text'}}).outputFiles[0].text
const module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports)
const {MarchVisual}=module.exports
const markup=props=>renderToStaticMarkup(createElement(MarchVisual,props))
test('taxi, walking and chooser retain Hangzhou map but never own bicycle, ride duration or cycling route',()=>{
 for(const mode of ['步行','打车',null]){const html=markup({phase:'arrived',mode,destination:'公司'});assert.doesNotMatch(html,/march-bike-traveller|参考18/);assert.match(html,/杭州离线地图/);assert.match(html,/data-route-phase="waiting"/);assert.match(html,/前往公司 · 请在地图中确认当前位置和路线/)}
 const html=markup({phase:'arrived',mode:'骑行',destination:'公司'});assert.match(html,/march-bike-traveller/);assert.match(html,/参考18/);assert.match(html,/杭州 · 西湖东岸—武林广场/);assert.match(html,/data-route-phase="arrived"/)
})

test('mode chooser does not mount a hidden map; every selected route mounts one map',()=>{
 const sceneCode=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/components/SceneCard.tsx',import.meta.url).pathname)],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react/*'],loader:{'.svg':'text','.png':'empty','.webp':'empty','.mp3':'empty','.wav':'empty','.m4a':'empty','.webm':'empty'}}).outputFiles[0].text
 const sceneModule={exports:{}};new Function('require','module','exports',sceneCode)(require,sceneModule,sceneModule.exports)
 const noop=()=>{},base={kind:'march',destination:'杭州图书馆',mode:null,stage:'choose',options:['步行','打车','骑行'].map(label=>({label,detail:'',source:''}))}
 const render=card=>renderToStaticMarkup(createElement(sceneModule.exports.SceneCard,{card,fullpage:true,draftState:{dirty:false,invalid:false},onApprove:noop,onRevise:noop,onHold:noop,onRevoke:noop,onUpdateKitchen:noop,onUpdateMarch:noop,onAddDraft:noop,onDraftState:noop}))
 assert.doesNotMatch(render(base),/hangzhou-map-surface|hangzhou-map-frame/)
 for(const mode of ['步行','打车','骑行'])assert.equal((render({...base,stage:'route',mode}).match(/class="hangzhou-map-surface"/g)??[]).length,1,mode)
})
