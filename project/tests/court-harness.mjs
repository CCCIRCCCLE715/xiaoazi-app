import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
// Exercise the production hook; substitute only hook scheduling and external native I/O.
const bundle=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/useCourt.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/court-leave-test',alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},define:{'import.meta.env.DEV':'false'},external:['react','./native-assistant','./reply-delay','@/shared/native/abilities','@/shared/native/mcp'],loader:{'.mp3':'file','.wav':'file','.png':'file','.webm':'file','.m4a':'file'}})
const delayCode=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/reply-delay.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text
const delayModule={exports:{}};new Function('module','exports',delayCode)(delayModule,delayModule.exports)
export function setup(answer,nativeOverride={},replyClock){
 const cells=[],effects=[];let cursor=0,cancels=0;const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
 const hooks={
 useState(initial){const slot=cursor++;if(!(slot in cells))cells[slot]=typeof initial==='function'?initial():initial;return [cells[slot],value=>{cells[slot]=typeof value==='function'?value(cells[slot]):value}]},
 useRef(initial){const slot=cursor++;return cells[slot]??=({current:initial})},
 useCallback(fn,deps){const slot=cursor++;if(!same(cells[slot]?.deps,deps))cells[slot]={fn,deps};return cells[slot].fn},
 useEffect(fn,deps){const slot=cursor++;if(!same(cells[slot]?.deps,deps)){effects.push(()=>{cells[slot]?.cleanup?.();cells[slot]={deps,cleanup:fn()}})}}
 }
 const module={exports:{}};const native={openMeituan:async()=>{},meituanFailure:()=> '美团未能打开，请重试。',cancelModelReply(){cancels++},routeNativeIntent:answer,modelFailure:()=> '连接失败',...nativeOverride}
 const fakeRequire=name=>name==='react'?hooks:name.includes('native-assistant')?native:name==='./reply-delay'?{createReplyDelay:()=>delayModule.exports.createReplyDelay(replyClock)}:name.includes('native/abilities')?new Proxy({},{get:()=>async()=>{}}):name.includes('native/mcp')?{describeDeviceError:()=> '失败'}:require(name)
 new Function('require','module','exports',bundle.outputFiles.find(f=>f.path.endsWith('.js')).text)(fakeRequire,module,module.exports)
 globalThis.window=new EventTarget();globalThis.document=Object.assign(new EventTarget(),{hidden:false})
 return {render(){cursor=0;const court=module.exports.useCourt();effects.splice(0).forEach(fn=>fn());return court},unmount(){cells.forEach(c=>c?.cleanup?.())},cancels:()=>cancels}
}
