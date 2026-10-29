import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const bundle=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/intent-router.ts',import.meta.url).pathname)],bundle:true,format:'esm',platform:'node',write:false,outdir:'/tmp/intent-router-test',alias:{'@':decodeURIComponent(new URL('../src',import.meta.url).pathname)},loader:{'.mp3':'file','.wav':'file','.m4a':'file','.webm':'file'}}).outputFiles.find(f=>f.path.endsWith('.js')).text
const {localDecision,validateDecision,decisionReply}=await import('data:text/javascript;base64,'+Buffer.from(bundle).toString('base64'))
const empty={sceneId:'idle',stage:'idle'}
test('offline fallback handles paraphrases without an API and produces preset action and correct card',()=>{
 for(const [text,scene,kind] of [['今天我们要干什么','todo','todo'],['把今天要办的事给朕看看','todo','todo'],['安排下今日的事情','todo','todo'],['今天低调骑车去公司','march','march'],['帮我导航去公司','march','march'],['肚子有点空，弄点吃的','kitchen','kitchen'],['床前明月光，疑是地上霜','poem',undefined],['给我来一首七言绝句','poem',undefined],['明天八点叫醒我','morning',undefined]]){
  const d=localDecision(text);assert.equal(d?.scene,scene,text);const reply=decisionReply(d,text,empty);assert.equal(reply.card?.kind,kind,text);assert.equal(reply.action==='idle',scene==='morning',text)
 }
})
test('local and validated slots enter actual destination mode budget taste and alarm cards',()=>{
 let text='今天低调骑车去公司',d=localDecision(text),reply=decisionReply(d,text,empty);assert.equal(reply.card.destination,'公司');assert.equal(reply.card.mode,'骑行')
 text='点份饭，三十以内，不要辣，送公司';reply=decisionReply(localDecision(text),text,empty);assert.equal(reply.card.budget,30);assert.equal(reply.card.taste,'不要辣');assert.equal(reply.card.address,'公司')
 reply=decisionReply(localDecision('明天八点叫醒我'),'明天八点叫醒我',empty);assert.equal(reply.alarmTime,'08:00');assert.equal(reply.page,'alarm-ring')
})
test('quotes negation definitions and unrelated topics never fabricate scenes',()=>{
 for(const text of ['不要作诗','他说“今天我们要干什么”','“骑车去公司”','我不想导航去公司','别打开待办','今天的股价多少','骑车是什么意思','谁敢相信今天这么热','他说床前明月光','不要听歌'])assert.equal(localDecision(text)?.scene,'clarify',text)
 assert.equal(localDecision('不要辣，来份饭')?.scene,'kitchen')
})
test('router only accepts exact bounded JSON whitelist with grounded slots',()=>{
 const text='帮我导航去公司'
 const valid={scene:'march',confidence:.94,slots:{destination:'公司'},clarify:false}
 assert.equal(validateDecision(JSON.stringify(valid),text)?.scene,'march')
 for(const value of [{...valid,tools:['open']},{...valid,scene:'execute'},{...valid,confidence:NaN},{...valid,confidence:.2},{...valid,slots:{destination:'西湖'}},{...valid,slots:{url:'https://x.com'}},{...valid,slots:{destination:'javascript:alert(1)'}},{...valid,clarify:'继续'},['march'],'聊天文本',null])assert.equal(validateDecision(JSON.stringify(value),text),undefined)
 assert.equal(validateDecision('```json\n'+JSON.stringify(valid)+'\n```',text),undefined)
 assert.equal(validateDecision(JSON.stringify(valid),'不要导航去公司'),undefined)
 assert.equal(validateDecision(JSON.stringify({...valid,scene:'kitchen'}),text),undefined)
})
test('unknown clarification preserves current interaction UI and never shows raw model answer',()=>{
 const prior={sceneId:'march',stage:'confirm',pending:true};const card={kind:'march',destination:'公司',mode:'骑行',options:[]}
 const reply=decisionReply({scene:'clarify',confidence:0,slots:{},clarify:true},'讲讲量子',prior,card)
 assert.equal(reply.card,card);assert.equal(reply.action,'reply');assert.match(reply.text,/用膳|待办/);assert.doesNotMatch(reply.text,/我不知道|模型未配置/)
})
test('negation is scoped to its clause and wake time normalization never invents a clock',()=>{
 assert.equal(localDecision('别导航了，给我听歌').scene,'music')
 assert.equal(localDecision('别给我放歌，我要看今天要办的事').scene,'todo')
 assert.equal(localDecision('不是叫我起床，是我要骑车去公司').scene,'march')
 for(const text of ['明早八点喊我','明天8点提醒我起身']){
  const d=validateDecision(JSON.stringify({scene:'morning',confidence:.97,slots:{time:'08:00',day:'明天'},clarify:false}),text)
  assert.equal(d?.scene,'morning');const reply=decisionReply(d,text,empty);assert.equal(reply.alarmTime,'08:00')
 }
 assert.equal(validateDecision(JSON.stringify({scene:'morning',confidence:.97,slots:{time:'08:00'},clarify:false}),'明早喊我'),undefined)
})
