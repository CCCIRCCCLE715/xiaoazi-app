import test from 'node:test'
import assert from 'node:assert/strict'
import {parseBudget as budget,parseAddress as address} from '../src/app/lib/scene-fields.ts'
test('explicit budget without currency and company destination are parsed, not defaulted',()=>{
 assert.equal(budget('想吃猪脚饭，三十以内，送公司'),30)
 assert.equal(budget('预算35以下'),35)
 assert.equal(address('想吃猪脚饭，三十以内，送公司'),'公司')
 assert.equal(address('送到中山路18号'),'中山路18号')
 assert.equal(budget('想吃猪脚饭'),undefined)
 assert.equal(address('公司今天很忙'),undefined)
 assert.equal(address('送朋友回公司'),undefined)
})
const {createRequire}=await import('node:module')
const require=createRequire(import.meta.url)
const {buildSync}=createRequire(require.resolve('vite'))('esbuild')
const output=buildSync({entryPoints:[decodeURIComponent(new URL('../src/app/lib/scenes.ts',import.meta.url).pathname)],bundle:true,loader:{'.mp3':'file','.wav':'file','.m4a':'file','.webm':'file'},outdir:'/tmp/scene-voice-test',platform:'node',format:'esm',write:false}).outputFiles.find(f=>f.path.endsWith('.js')).text
const {detectScene,enterScene,EMPTY_CONTEXT,resolveSceneVoice}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'))
test('march real requests select point and original voice; information, quotes and denials do not',()=>{
 for(const text of ['御驾亲蹬','骑行','今天低调一点','骑车去公司','骑行去公司怎么走','能帮朕骑车去西湖吗']){
  assert.equal(detectScene(text),'march',text)
  const reply=enterScene('march',text,EMPTY_CONTEXT);assert.equal(reply.action,'point');assert.equal(reply.card.kind,'march');assert.equal(reply.card.mode,'骑行')
  assert.match(resolveSceneVoice(text,'march')?.src??'',/march-ride/)
 }
 assert.equal(enterScene('march','骑车去公司',EMPTY_CONTEXT).card.destination,'公司')
 assert.equal(enterScene('march','骑行去公司怎么走',EMPTY_CONTEXT).card.destination,'公司')
 assert.equal(enterScene('march','今天低调一点',EMPTY_CONTEXT).card.destination,null)
 for(const text of ['不要骑行','不用帮朕骑车去公司','你说“御驾亲征”','“骑行”','骑行是什么意思','什么是御驾亲征','低调是什么意思','停止骑行','别摆驾']){
  assert.equal(detectScene(text),undefined,text);assert.equal(resolveSceneVoice(text,'march'),undefined,text)
 }
 assert.equal(enterScene('march','打车去西湖',EMPTY_CONTEXT).card.mode,'打车')
})
test('accepted poem phrases select the supplied recording and no card; quoted or denied phrases do not',()=>{
 for(const text of ['作诗','诗句','窗前一杯水，喝完再接水']){
  assert.equal(detectScene(text),'poem');assert.equal(enterScene('poem',text,EMPTY_CONTEXT).card,undefined)
  assert.match(resolveSceneVoice(text,'poem')?.src??'',/poem-praise/)
 }
 for(const text of ['不要作诗','你说“作诗”','停止好诗配音'])assert.equal(resolveSceneVoice(text,'poem'),undefined)
 assert.equal(resolveSceneVoice('点外卖','poem'),undefined)
})
test('only the explicit poem example routes to scroll; generic water does not',()=>{
 const text='窗前一杯水，喝完再接水';assert.equal(detectScene(text),'poem')
 assert.equal(enterScene('poem',text,EMPTY_CONTEXT).action,'scroll')
 assert.equal(enterScene('poem',text,EMPTY_CONTEXT).card,undefined)
 assert.equal(detectScene('我想喝水'),undefined)
 assert.equal(enterScene('morning','早上好',EMPTY_CONTEXT).action,'greet')
 assert.equal(enterScene('memorial','帮朕回消息',EMPTY_CONTEXT).action,'reply')
 const meal=enterScene('kitchen','想吃猪脚饭，三十以内，送公司',EMPTY_CONTEXT)
 assert.equal(meal.card.budget,30);assert.equal(meal.card.address,'公司')
})

test('explicit wake clocks are display values on the foreground page, never scheduled plans',()=>{
 for(const [text,time]of [['明天8点钟叫我起床','08:00'],['后天上午九点十五叫醒我','09:15'],['明天08:05叫朕起床','08:05'],['明天早上八点半叫我起床','08:30'],['明天晚上八点叫醒我','20:00']]){
  assert.equal(detectScene(text),'morning');const reply=enterScene('morning',text,EMPTY_CONTEXT)
  assert.equal(reply.action,'idle');assert.equal(reply.page,'alarm-ring');assert.equal(reply.alarmTime,time);assert.equal(reply.card,undefined);assert.equal(reply.task,undefined);assert.equal(reply.context.pending,false);assert.equal(budget(text),undefined)
 }
 assert.equal(enterScene('morning','明天28点叫我起床',EMPTY_CONTEXT).alarmTime,undefined)
})
test('voice mapping separates actual food, waking, calendar and noncommands',()=>{
 assert.match(resolveSceneVoice('点外卖','kitchen')?.src,/kitchen-meal/)
 assert.equal(resolveSceneVoice('明天8点钟叫我起床','morning'),undefined)
 for(const text of ['查今日日程','今天有什么安排','早朝议事','工作','早上好'])assert.equal(resolveSceneVoice(text,'morning'),undefined)
 for(const text of ['不要点外卖','不用明天8点叫我起床','别叫我起床','你说“明天8点叫我起床”','提到起床','停止起床配音']){
  assert.equal(detectScene(text),undefined,text)
  assert.equal(resolveSceneVoice(text,'morning'),undefined,text)
  assert.equal(resolveSceneVoice(text,'kitchen'),undefined,text)
 }
})

test('help variants select protection only in actual help intent, with no card',()=>{
 for(const text of ['小A子快救我','小a子快救驾','小Ａ子快救我','快救我','皇上被人骂了','有人骂我','护驾']){
  assert.equal(detectScene(text),'protect',text)
  assert.equal(enterScene('protect',text,EMPTY_CONTEXT).card,undefined)
  assert.match(resolveSceneVoice(text,'protect')?.src,/protect-help/)
 }
 for(const text of ['生日快乐','查日程','工作','救我设置闹钟','帮我设置闹钟','不要护驾','你说“小A子快救我”','停止护驾']){
  assert.equal(resolveSceneVoice(text,'protect'),undefined,text)
 }
})

test('modifier negatives and quoted food names preserve real command intent',()=>{
 for(const text of ['想吃猪脚饭，不要辣，三十以内送公司','点一份‘猪脚饭’，不要辣']){
  assert.equal(detectScene(text),'kitchen',text)
  assert.match(resolveSceneVoice(text,'kitchen')?.src,/kitchen-meal/)
 }
 for(const text of ['我不想挨骂，小A子快救我','小a子救我']){
  assert.equal(detectScene(text),'protect',text)
  assert.match(resolveSceneVoice(text,'protect')?.src,/protect-help/)
 }
 assert.equal(detectScene('谁敢相信今天这么热'),undefined)
 assert.equal(resolveSceneVoice('谁敢相信今天这么热','protect'),undefined)
 for(const text of ['不要救驾','你说‘小A子快救我’','别叫我起床'])assert.equal(detectScene(text),undefined,text)
})

 test('todo commands take priority, remain local and never become SMS drafts',()=>{
 for(const text of ['帮我列出今天的待办','列出今日待办','今天的To-do','待办清单','接下来我要进行批奏折了','批奏折','处理今天的待办','今天有什么安排']){
  assert.equal(detectScene(text),'todo',text);const r=enterScene('todo',text,EMPTY_CONTEXT);assert.equal(r.card.kind,'todo');assert.equal(r.action,'scroll');assert.equal(r.task,undefined);assert.equal(r.context.pending,false);assert.match(resolveSceneVoice(text,'todo')?.src??'',/todo-present/)
 }
 for(const text of ['不要批奏折','不需要列待办','你说“批奏折”','批奏折是什么意思','停止待办','“批奏折”','什么是待办清单'])assert.equal(detectScene(text),undefined,text)
 assert.equal(detectScene('帮我回消息'),'memorial');assert.equal(enterScene('memorial','帮我回消息',EMPTY_CONTEXT).task,'save-draft')
})

test('music accepts real requests and separates denial, quotation, information and stop',()=>{
 for(const text of ['我想听歌','给我选一首曲子','垂帘听曲','放首歌','给朕来个垂帘听曲']){
  assert.equal(detectScene(text),'music',text);const r=enterScene('music',text,EMPTY_CONTEXT);assert.equal(r.action,'music-tap');assert.equal(r.card.kind,'music');assert.equal(r.task,undefined);assert.match(resolveSceneVoice(text,'music')?.src??'',/music-intro/)
 }
 for(const text of ['不要听歌','不想听曲','不用给我选一首曲子','你说“放首歌”','“垂帘听曲”','垂帘听曲是什么意思','什么是听曲','取消听曲','停止听歌']){assert.notEqual(detectScene(text),'music',text);assert.equal(resolveSceneVoice(text,'music'),undefined,text)}
 assert.equal(resolveSceneVoice('准奏','todo'),undefined);assert.equal(resolveSceneVoice('勾选完成','todo'),undefined)
})
