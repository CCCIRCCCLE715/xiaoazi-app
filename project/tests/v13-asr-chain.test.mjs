import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
function load(file){const result=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/'+file+'.ts',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false,outdir:'/tmp/v13-asr-chain',alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},loader:{'.mp3':'file','.wav':'file','.webm':'file','.m4a':'file'}});const m={exports:{}};new Function('require','module','exports',result.outputFiles.find(f=>f.path.endsWith('.js')).text)(require,m,m.exports);return m.exports}
const {acceptSpeechText}=load('native-rpc'),{localDecision}=load('intent-router');const d=JSON.parse(readFileSync(new URL('../../qa/asr-local-decode.json',import.meta.url),'utf8'))
test('actual local decode to compiled native preset correction to production draft normalization/router',()=>{
 for(const [name,scene] of [['synthetic-guard','protect'],['synthetic-ride','march'],['synthetic-negative','clarify'],['synthetic-quote','clarify'],['synthetic-question','clarify'],['silence','clarify']]){const row=d.rows.find(r=>r.label===name);assert.ok(row);assert.equal(localDecision(acceptSpeechText(row.normalizedText)).scene,scene,name)}
})
