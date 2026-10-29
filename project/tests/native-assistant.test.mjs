import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativeRpc,acceptSpeechText} from '../src/app/lib/native-rpc.ts'
// Removing request ownership or cancellation must allow a stale response and fail these tests.
test('native replies correlate to request and cancelled responses never resolve',async()=>{
 const target=new EventTarget(),sent=[];const client=createNativeRpc({postMessage:raw=>sent.push(JSON.parse(raw))},target)
 const old=client.request('model.route',{}),fresh=client.request('status',{})
 old.cancel();await assert.rejects(old.promise,/cancelled/)
 function reply(detail){const e=new Event('xiaoazi:native');e.detail=detail;target.dispatchEvent(e)}
 reply({id:old.id,ok:true,data:{text:'stale'}});reply({id:fresh.id,ok:true,data:{enabled:true}})
 assert.deepEqual(await fresh.promise,{enabled:true});assert.equal(sent.at(-1).method,'cancel');client.dispose()
})
test('partial recognition stays progress and final text is returned for confirmation only',async()=>{
 const target=new EventTarget(),progress=[];const client=createNativeRpc({postMessage(){}},target)
 const request=client.request('asr.start',{},e=>progress.push(e))
 for(const detail of [{id:request.id,event:'partial',text:'今天'},{id:request.id,ok:true,data:{text:'今天吃什么'}}]){const e=new Event('xiaoazi:native');e.detail=detail;target.dispatchEvent(e)}
 assert.equal(progress[0].text,'今天');assert.equal(acceptSpeechText((await request.promise).text),'今天吃什么');assert.equal(acceptSpeechText('  '),'');client.dispose()
})
test('unknown native error and response payload cannot inject server or key text into errors',async()=>{
 const target=new EventTarget(),client=createNativeRpc({postMessage(){}},target);const q=client.request('status',{})
 const e=new Event('xiaoazi:native');e.detail={id:q.id,ok:false,code:'secret-key-raw-server-body'};target.dispatchEvent(e)
 await assert.rejects(q.promise,/native_error/);client.dispose()
})
import {createAsrController} from '../src/app/lib/asr-controller.ts'
test('Chinese language failure before ready retains actionable failure and never submits text',async()=>{
 const states=[],finals=[];const provider={id:'android',state:'ready',async open(){return {sessionId:'x',async start(){throw new Error('language')},async stop(){},cancel(){},dispose(){}}}}
 const controller=createAsrController(provider,{onFinal:text=>finals.push(text),onState:state=>states.push(state)})
 await controller.start();assert.equal(controller.state().failure,'language');assert.match(controller.state().message,/中文识别模型/);assert.deepEqual(finals,[]);controller.dispose()
})
test('timeout before ready remains timeout and a cancelled open cannot start late',async()=>{
 const timeout=createAsrController({id:'android',state:'ready',async open(){return {sessionId:'x',async start(){throw new Error('timeout')},async stop(){},cancel(){},dispose(){}}}},{onFinal(){throw new Error('unexpected final')}})
 await timeout.start();assert.equal(timeout.state().failure,'timeout');timeout.dispose()
 let release,starts=0,released=0
 const delayed=createAsrController({id:'android',state:'ready',open(){return new Promise(resolve=>release=resolve)}},{onFinal(){throw new Error('late final')}})
 const started=delayed.start();delayed.cancel();release({sessionId:'old',async start(){starts++},async stop(){},cancel(){released++},dispose(){released++}});await started
 assert.equal(starts,0);assert.equal(released,2);delayed.dispose()
})
test('partial words stay listening until native end-of-speech; cancellation rejects late recognition',async()=>{
 let events;const finals=[]
 const controller=createAsrController({id:'android',state:'ready',async open(id,callbacks){events=callbacks;return {sessionId:id,async start(){},async stop(){},cancel(){},dispose(){}}}},{onFinal:text=>finals.push(text)})
 await controller.start();events.onPartial('今天吃')
 assert.equal(controller.state().phase,'listening');assert.equal(controller.state().partial,'今天吃')
 events.onRecognizing();assert.equal(controller.state().phase,'recognizing');assert.deepEqual(finals,[])
 controller.cancel();events.onRecognizing();events.onFinal('过期');assert.equal(controller.state().phase,'idle');assert.deepEqual(finals,[]);controller.dispose()
})
test('system recognizer and offline errors survive RPC and controller without becoming generic start-failed',async()=>{
 for(const code of ['asr-client','asr-busy','asr-network','asr-audio','asr-server','asr-disconnected','offline-model','offline-audio','offline-init']){
  const target=new EventTarget(),client=createNativeRpc({postMessage(){}},target);const request=client.request('asr.start',{});const e=new Event('xiaoazi:native');e.detail={id:request.id,ok:false,code};target.dispatchEvent(e);await assert.rejects(request.promise,new RegExp(code));client.dispose()
  const provider={id:'native',state:'ready',async open(){return{sessionId:'x',async start(){throw new Error(code)},async stop(){},cancel(){},dispose(){}}}}
  const controller=createAsrController(provider,{onFinal(){throw new Error('no final on error')}});await controller.start();assert.equal(controller.state().failure,code);assert.ok(controller.state().message);controller.dispose()
 }
})
test('offline Chinese token spaces normalize without joining English words or numeric groups',()=>{
 assert.equal(acceptSpeechText('今天 我们 要 干 什么'),'今天我们要干什么')
 assert.equal(acceptSpeechText('小 A 子 打开 Deep Seek 8 30'),'小 A 子打开 Deep Seek 8 30')
})
test('intent-specific budget leaves the generic ASR bridge timeout at45seconds',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const target=new EventTarget(),sent=[];const client=createNativeRpc({postMessage:raw=>sent.push(JSON.parse(raw))},target)
 const request=client.request('asr.start');const rejected=assert.rejects(request.promise,/timeout/)
 t.mock.timers.tick(5000);await Promise.resolve();assert.equal(sent.length,1,'offline model setup must not inherit the5second classifier budget')
 t.mock.timers.tick(40000);await rejected;assert.equal(sent.at(-1).method,'cancel');assert.equal(sent.at(-1).payload.target,request.id);client.dispose()
})
