import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const result=buildSync({stdin:{contents:"import{renderToStaticMarkup}from'react-dom/server';import{createElement}from'react';import{SceneCard}from'./src/app/components/SceneCard';import{enterScene,EMPTY_CONTEXT,KITCHEN_DISHES}from'./src/app/lib/scenes';export const dishes=KITCHEN_DISHES;export const html=renderToStaticMarkup(createElement(SceneCard,{card:enterScene('kitchen','',EMPTY_CONTEXT).card,onUpdateKitchen:()=>{},onDraftState:()=>{}}))",resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/kitchen-art',alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},loader:{'.png':'file','.webp':'file','.svg':'file','.mp3':'file','.wav':'file','.webm':'file','.m4a':'file'},define:{'process.env.NODE_ENV':'"production"'}})
const m={exports:{}};new Function('require','module','exports',result.outputFiles.find(f=>f.path.endsWith('.js')).text)(require,m,m.exports)
test('each of the twelve displayed dishes renders a distinct corresponding image',()=>{
 const rows=[...m.exports.html.matchAll(/<button[^>]*aria-label="选择([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
 assert.equal(rows.length,12);const urls=rows.map(([_,name,body],i)=>{assert.equal(name,m.exports.dishes[i].name);return body.match(/<img[^>]+src="([^"]+)"/)[1]})
 assert.equal(new Set(urls).size,12,'no reused merchant illustration');for(let i=0;i<urls.length;i++)assert.ok(urls[i].includes(m.exports.dishes[i].id),m.exports.dishes[i].name)
})
