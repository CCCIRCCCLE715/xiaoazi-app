import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/asr-controller.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,m={exports:{}};new Function('require','module','exports',code)(require,m,m.exports)
const {createAsrController}=m.exports
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()}
test('SenseVoice release may decode beyond old8s and still delivers exactly once before45s budget',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let events,cancelled=0;const results=[]
 const provider={id:'android-sensevoice-int8',state:'ready',finalTimeoutMs:45000,async open(id,e){events=e;return {sessionId:id,async start(){},async stop(){},cancel(){cancelled++},dispose(){}}}}
 const c=createAsrController(provider,{onFinal:(...args)=>results.push(args)});await c.start();const stop=c.stop();await flush();t.mock.timers.tick(9000);await flush();assert.equal(cancelled,0);assert.equal(c.state().phase,'recognizing');events.onFinal('原始转写');await stop;assert.equal(results.length,1);events.onFinal('迟到');assert.equal(results.length,1);c.dispose()
})
