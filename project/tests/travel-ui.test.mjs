import test from 'node:test'
import assert from 'node:assert/strict'
import {setup} from './court-harness.mjs'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()}
function host(answer=async()=>undefined){let now=0,n=0;const timers=new Map();const time={now:()=>now,schedule(fn,ms){const id=++n;timers.set(id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){now+=ms;for(const[id,t]of timers)if(t.at<=now){timers.delete(id);t.fn()}await flush()}};const h=setup(answer,{},time);h.render();return {h,time}}
async function send(h,time,text){const p=h.render().submit(text);await flush();await time.advance(1500);await p;return h.render()}
test('first travel stage releases chooser and query cue together at1500 with no route result',async()=>{
 const {h,time}=host();const p=h.render().submit('我要去公司');await flush();assert.equal(h.render().card,undefined);await time.advance(1499);assert.equal(h.render().voiceCue,undefined);assert.equal(h.render().card,undefined);await time.advance(1);await p;const c=h.render();assert.equal(c.card.stage,'choose');assert.equal(c.card.destination,'公司');assert.deepEqual(c.card.options.map(o=>o.label),['步行','打车','骑行']);assert.match(c.voiceCue.src,/march-query/);assert.equal(c.context.pending,false);h.unmount()
})
for(const mode of ['步行','打车','骑行'])test('click '+mode+' selects immediately, one deadline releases matching destination and route',async()=>{
 const {h,time}=host();await send(h,time,'我要去公司');h.render().updateMarch({mode});assert.equal(h.render().card.mode,mode);assert.equal(h.render().card.stage,'choose');assert.equal(h.render().voiceCue,undefined);await time.advance(1499);assert.equal(h.render().card.stage,'choose');await time.advance(1);const c=h.render();assert.equal(c.card.stage,'route');assert.equal(c.card.destination,'公司');assert.equal(c.card.mode,mode);assert.equal(c.context.pending,true);if(mode==='骑行')assert.match(c.voiceCue.src,/march-ride/);else assert.equal(c.voiceCue,undefined);h.unmount()
})
test('rapid re-selection cancels old reply and only latest mode can own route/voice',async()=>{
 const {h,time}=host();await send(h,time,'我要去公司');h.render().updateMarch({mode:'骑行'});await time.advance(800);h.render().updateMarch({mode:'打车'});await time.advance(700);assert.equal(h.render().card.stage,'choose');assert.equal(h.render().card.mode,'打车');await time.advance(800);assert.equal(h.render().card.stage,'route');assert.equal(h.render().voiceCue,undefined);h.unmount()
})
test('production recording leave preserves trip; final recognized phrase uses the shared send deadline',async()=>{
 const {h,time}=host();await send(h,time,'我要去公司');h.render().leave();await time.advance(5000);const c=await send(h,time,'御驾亲蹬');assert.equal(c.card.destination,'公司');assert.equal(c.card.mode,'骑行');assert.equal(c.card.stage,'route');h.unmount()
})
test('missing destination never exposes route or ride voice; saving actual destination completes selection',async()=>{
 const {h,time}=host();let c=await send(h,time,'今天怎么上朝');assert.equal(c.card.stage,'choose');h.render().updateMarch({mode:'骑行'});await time.advance(1500);c=h.render();assert.equal(c.card.stage,'choose');assert.equal(c.card.destination,null);assert.equal(c.voiceCue,undefined);h.render().updateMarch({destination:'公司'});await time.advance(1500);c=h.render();assert.equal(c.card.stage,'route');assert.equal(c.card.destination,'公司');assert.match(c.voiceCue.src,/march-ride/);h.unmount()
})
for(const op of ['hold','revoke','reset','pause','scene'])test(op+' rejects pending choice and clears trip destination',async()=>{
 const {h,time}=host();await send(h,time,'我要去公司');h.render().updateMarch({mode:'骑行'});await time.advance(300);if(op==='pause')window.dispatchEvent(new Event('xiaoazi:pause'));else if(op==='scene')await send(h,time,'听曲');else void h.render()[op]();await time.advance(5000);assert.notEqual(h.render().card?.kind,'march');assert.doesNotMatch(h.render().voiceCue?.src??'',/march-ride/);const c=await send(h,time,'御驾亲蹬');assert.equal(c.card.destination,null);assert.equal(c.card.stage,'choose');h.unmount()
})
test('negation, quotes and definition cannot select transport or fabricate destination',async()=>{
 for(const text of ['不要骑车','不想打车','不要走路','不去公司了','我不去公司','他说御驾亲蹬','御驾亲蹬是什么意思','他说去图书馆']){const {h,time}=host();await send(h,time,'我要去公司');const c=await send(h,time,text);assert.equal(c.card.stage,'choose',text);assert.equal(c.card.mode,null,text);assert.equal(c.card.destination,'公司',text);assert.equal(c.voiceCue,undefined);h.unmount()}
})
test('official icon files match upstream hashes; both phases import one shared component/resource',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../../icon-provenance.json',import.meta.url)));assert.equal(manifest.license,'MIT');for(const a of manifest.assets){const data=readFileSync(new URL('../src/assets/icons/phosphor-regular/'+a.name+'.svg',import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),a.sha256);assert.match(a.url,/raw.githubusercontent.com\/phosphor-icons\/core\/[^/]+\/assets\/regular/)}
 const chooser=readFileSync(new URL('../src/app/components/SceneCard.tsx',import.meta.url),'utf8'),route=readFileSync(new URL('../src/app/components/MarchJourney.tsx',import.meta.url),'utf8');assert.match(chooser,/TravelIcon mode=\{option.label\}/);assert.match(route,/TravelIcon mode="骑行"/);assert.doesNotMatch(chooser+route,/court-bicycle|<Bike|CarFront/)
})

test('real composer hold/release path uses ASR fixture and retains company without counting the hold as thought',async t=>{
 const {createRequire}=await import('node:module'),{fileURLToPath}=await import('node:url');const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild'),module={exports:{}};new Function('require','module','exports',buildSync({entryPoints:[fileURLToPath(new URL('../src/app/lib/composer-controller.ts',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text)(require,module,module.exports)
 t.mock.timers.enable({apis:['Date']});const {h,time}=host();await send(h,time,'我要去公司');let events;const c=module.exports.createComposerController({state:'ready',id:'fixture',open(id,e){events=e;return {sessionId:id,async start(){},async stop(){},cancel(){},dispose(){}}}},{onBeforeListen(){h.render().leave()},onSubmit:text=>h.render().submit(text)});await c.holdStart();t.mock.timers.tick(5000);events.onFinal('御驾亲蹬');const sent=c.holdEnd();await flush();assert.equal(h.render().card.stage,'choose');await time.advance(1499);assert.equal(h.render().card.stage,'choose');await time.advance(1);await sent;assert.equal(h.render().card.destination,'公司');assert.equal(h.render().card.mode,'骑行');assert.equal(h.render().card.stage,'route');c.dispose();h.unmount()
})

test('background invalidates an already confirmed map approval as well as pending route timers',async()=>{
 const {h,time}=host();await send(h,time,'骑车去公司');const count=h.render().edicts.length;window.dispatchEvent(new Event('xiaoazi:pause'));await h.render().approve();await time.advance(5000);assert.equal(h.render().card,undefined);assert.equal(h.render().edicts.length,count);assert.equal(h.render().context.sceneId,'idle');h.unmount()
})
