import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {setup} from './court-harness.mjs'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/intent-router.ts',import.meta.url).pathname)],bundle:true,format:'esm',platform:'node',write:false,outdir:'/tmp/coupons-test',alias:{'@':decodeURIComponent(new URL('../src',import.meta.url).pathname)},loader:{'.mp3':'file','.wav':'file','.m4a':'file','.webm':'file'}}).outputFiles.find(f=>f.path.endsWith('.js')).text
const {localDecision,validateDecision,decisionReply}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const triggers=['我要没钱了','朕要没钱了','朕快没钱了','帮我去找一个团购券','帮我去找一个优惠券','吃饭帮我找张优惠券','瑞幸有优惠券吗','华莱士有什么团购','帮朕找张优惠卷','帮我找团购卷','囊中羞涩','预算不够，找点便宜的券','甲方催稿了，先帮我找张优惠券']
test('coupon phrases route to independent preset UI including finite ASR homophones',()=>{
 for(const text of triggers){const d=localDecision(text);assert.equal(d.scene,'coupons',text);const r=decisionReply(d,text,{sceneId:'idle',stage:'idle'});assert.equal(r.card.kind,'coupons');assert.equal(r.task,undefined);assert.equal(r.context.pending,false)}
})
test('coupon routing respects negation quotation and adjacent existing scenes',()=>{
 for(const text of ['不要找优惠券','我没钱吗是什么意思','他说“朕没钱了”','“帮我找团购券”','优惠券是什么意思','我没有优惠券','别找团购券，给我点饭'])assert.notEqual(localDecision(text).scene,'coupons',text)
 for(const [text,scene] of [['用膳','kitchen'],['导航去公司','march'],['甲方催稿了','work'],['批奏折','todo'],['明天八点叫醒我','morning'],['小A子你好','clarify'],['御驾亲征是什么意思','clarify']])assert.equal(localDecision(text).scene,scene,text)
 assert.equal(localDecision('不要找优惠券，给我点饭').scene,'kitchen')
 assert.equal(localDecision('不点外卖了，帮我找优惠券').scene,'coupons')
})
test('model cannot reroute explicit coupons to kitchen or introduce coupon URLs and amounts',()=>{
 const valid={scene:'coupons',confidence:.99,slots:{},clarify:false}
 assert.equal(validateDecision(JSON.stringify(valid),'我要没钱了')?.scene,'coupons')
 for(const d of [{...valid,scene:'kitchen'},{...valid,slots:{url:'alipays://test'}},{...valid,slots:{discount:5}}])assert.equal(validateDecision(JSON.stringify(d),'我要没钱了'),undefined)
})
test('coupon request interrupts kitchen selection and pending merchant launch',async()=>{
 const h=setup(async()=>undefined);let c=h.render();await c.submit('用膳');c=h.render();c.updateKitchen({selectedDish:'猪脚饭'});c=h.render();await c.submit('猪脚饭，帮我找优惠券');c=h.render();assert.equal(c.card.kind,'coupons');assert.equal(c.voiceCue,undefined);h.unmount()
})

test('coupon speech is normalized after local ASR and sends only on release; thought starts at send',async t=>{
 const b=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/composer-controller.ts',import.meta.url).pathname)],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text,m={exports:{}};new Function('require','module','exports',b)(require,m,m.exports)
 t.mock.timers.enable({apis:['Date']});let now=0,id=0,events;const timers=new Map(),clock={now:()=>now,schedule(fn,ms){const n=++id;timers.set(n,{at:now+ms,fn});return n},clear(n){timers.delete(n)}};const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};async function advance(ms){now+=ms;for(const [n,v]of timers)if(v.at<=now){timers.delete(n);v.fn()}await flush()}
 const h=setup(async()=>undefined,{},clock);h.render();const c=m.exports.createComposerController({state:'ready',id:'local-asr-fixture',open(id,e){events=e;return {sessionId:id,async start(){},async stop(){},cancel(){},dispose(){}}}},{onBeforeListen(){h.render().leave()},onSubmit:text=>h.render().submit(text)})
 try{await c.holdStart();events.onFinal('帮 我 找 优 惠 卷',undefined,'帮 我 找 优 惠 卷');await advance(3000);t.mock.timers.tick(3000);assert.equal(h.render().card,undefined);const sending=c.holdEnd();await flush();await advance(1499);assert.equal(h.render().card,undefined);await advance(1);await sending;assert.equal(h.render().card.kind,'coupons');assert.equal(h.render().voiceCue,undefined);assert.equal(c.state().lastSpeech.rawText,'帮 我 找 优 惠 卷');assert.equal(c.state().lastSpeech.normalizedText,'帮我找优惠券')}finally{c.dispose();h.unmount()}
})
