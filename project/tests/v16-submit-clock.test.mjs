import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {setup} from './court-harness.mjs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild'),m={exports:{}}
new Function('require','module','exports',buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/composer-controller.ts',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text)(require,m,m.exports)
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
test('production composer release/final starts the court1500ms gate; five seconds held do not consume thought time',async t=>{
 t.mock.timers.enable({apis:['Date']});let now=0,n=0,events;const timers=new Map(),time={now:()=>now,schedule(fn,ms){const id=++n;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)}}
 async function advance(ms){now+=ms;for(const [id,v] of timers)if(v.at<=now){timers.delete(id);v.fn()}await flush()}
 const h=setup(async()=>undefined,{},time);h.render();const c=m.exports.createComposerController({state:'ready',id:'fixture',open(id,e){events=e;return {sessionId:id,async start(){},async stop(){},cancel(){},dispose(){}}}},{onBeforeListen(){h.render().leave()},onSubmit:text=>h.render().submit(text)})
 await c.holdStart();events.onFinal('今天我们要干什么');await advance(5000);t.mock.timers.tick(5000);assert.equal(h.render().card,undefined);const sent=c.holdEnd();await flush();assert.equal(h.render().replyPending,true);await advance(1499);assert.equal(h.render().card,undefined);await advance(1);await sent;assert.equal(h.render().card.kind,'todo');c.dispose();h.unmount()
})

test('spoken alarm release/final starts its 2000ms deadline; time held is excluded',async t=>{
 t.mock.timers.enable({apis:['Date']});let now=0,n=0,events;const timers=new Map(),time={now:()=>now,schedule(fn,ms){const id=++n;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)}}
 async function advance(ms){now+=ms;for(const [id,v] of timers)if(v.at<=now){timers.delete(id);v.fn()}await flush()}
 const h=setup(async()=>undefined,{},time);h.render();const c=m.exports.createComposerController({state:'ready',id:'fixture',open(id,e){events=e;return {sessionId:id,async start(){},async stop(){},cancel(){},dispose(){}}}},{onBeforeListen(){h.render().leave()},onSubmit:text=>h.render().submit(text)})
 await c.holdStart();events.onFinal('喊小A子叫我起床');await advance(5000);t.mock.timers.tick(5000);assert.equal(h.render().card,undefined);const sent=c.holdEnd();await flush();assert.equal(h.render().replyPending,true);await advance(1999);assert.equal(h.render().card,undefined);await advance(1);await sent;assert.equal(typeof h.render().alarmRequest?.id,'number');assert.equal(h.render().voiceCue,undefined);c.dispose();h.unmount()
})
