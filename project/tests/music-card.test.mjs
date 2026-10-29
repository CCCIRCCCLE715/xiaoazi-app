import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const result=buildSync({stdin:{contents:"import{renderToStaticMarkup}from'react-dom/server';import{createElement}from'react';import{MusicCard}from'./src/app/components/MusicCard';export const markup=()=>renderToStaticMarkup(createElement(MusicCard,{requestToken:1,voiceId:1,onClose:()=>{}}))",resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'tsx'},loader:{'.m4a':'file','.webm':'file'},outdir:'/tmp/music-card-test',bundle:true,platform:'node',format:'cjs',write:false,define:{'process.env.NODE_ENV':'"production"'}})
const module={exports:{}};new Function('require','module','exports',result.outputFiles.find(f=>f.path.endsWith('.js')).text)(require,module,module.exports)
test('music identifies official preview, starts at real zero and disables unavailable other tracks',()=>{
 const html=module.exports.markup();for(const label of ['特别的人','方大同','官方试听','仅一首','选本地曲目'])assert.ok(html.includes(label),label)
 assert.match(html,/aria-label="上一首"/);assert.match(html,/aria-label="下一首"/);assert.equal((html.match(/disabled=""/g)||[]).length,2)
 assert.match(html,/data-playing="false"/);assert.match(html,/value="0"/);assert.match(html,/00:00/);assert.doesNotMatch(html,/准奏|03:28|CDN|https:/)
})
