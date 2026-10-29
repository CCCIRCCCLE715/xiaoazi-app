import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const root=fileURLToPath(new URL('../src',import.meta.url))
test('production greeting mappings preserve complete uploaded bytes and original tap bytes separately',()=>{
 const b=buildSync({stdin:{contents:"export {HOME_GREETING_VOICE,IDLE_GREETING_VOICE} from './scene-config'",resolveDir:root+'/app/lib'},bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/home-greeting-source-test',alias:{'@':root},loader:{'.mp3':'file','.wav':'file','.png':'file','.webm':'file','.m4a':'file'}})
 const m={exports:{}};new Function('module','exports',b.outputFiles.find(f=>f.path.endsWith('.js')).text)(m,m.exports)
 const bytes=src=>b.outputFiles.find(f=>f.path.split('/').at(-1)===src.split('/').at(-1)).contents
 const home=bytes(m.exports.HOME_GREETING_VOICE),idle=bytes(m.exports.IDLE_GREETING_VOICE),sha=b=>createHash('sha256').update(b).digest('hex')
 assert.equal(home.length,158868,'complete recording with no trim or transcoding')
 assert.equal(sha(home),'8ead77bf134124db26102faed0a3d900a27b45c8146513e153dd6c1b385d9ca7')
 assert.equal(sha(idle),'2b31ead33d8cd3b4ab0415fb32db44a77cd348f0886a29945faf6a7c9c0911c6')
 assert.notEqual(m.exports.HOME_GREETING_VOICE,m.exports.IDLE_GREETING_VOICE)
})
