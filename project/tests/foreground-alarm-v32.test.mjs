import test from 'node:test'
import assert from 'node:assert/strict'
import {setupPage} from './page-harness.mjs'
import {setup} from './court-harness.mjs'
import {validateIntent} from '../src/app/lib/providers.ts'
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()}
function clock(){let now=0,id=0;const timers=new Map();return{now:()=>now,schedule(fn,ms){timers.set(++id,{at:now+ms,fn});return id},clear(id){timers.delete(id)},async advance(ms){now+=ms;for(const [id,t]of timers)if(t.at<=now){timers.delete(id);t.fn()}await flush()}}}

// Catches playing at navigation/send time instead of 5000ms after this page mounts.
test('page is silent for 4999ms and only enters ringing after playback at 5000ms',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:Date.parse('2026-10-27T02:03:00Z')})
 const calls=[],h=setupPage('MorningPage',async method=>{calls.push(method);return{alarms:[],exactAlarm:true,notifications:true}},'ring=now')
 try{await flush();h.render();assert.equal(h.audio.plays,0);assert.equal(h.find(e=>e.type==='section').props['data-ringing'],false)
 t.mock.timers.tick(4999);await flush();h.render();assert.equal(h.audio.plays,0)
 t.mock.timers.tick(1);await flush();h.render();assert.equal(h.audio.plays,1);assert.equal(h.find(e=>e.type==='section').props['data-ringing'],true);assert.equal(h.find(e=>String(e.type).includes('CharacterStage')).props.action,'greet');assert.deepEqual(calls,[])
 assert.doesNotMatch(h.text(),/拍摄素材|模拟|演示|倒计时|精确闹钟|通知权限|设置晨起闹钟/)
 }finally{h.close();t.mock.timers.reset()}
})
test('80 percent swipe closes the page, stops audio and prevents later playback; short or cancelled drag does not',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setupPage('MorningPage')
 try{h.render();const track=h.find(e=>e.props?.className==='alarm-dismiss-track'),thumb=h.find(e=>e.props?.['aria-label']==='向右滑动结束闹钟');assert.ok(thumb)
 track.props.ref.current={clientWidth:300};thumb.props.ref.current={offsetWidth:60};const e=x=>({pointerId:1,clientX:x,currentTarget:{setPointerCapture(){}}})
 thumb.props.onPointerDown(e(0));thumb.props.onPointerUp(e(182));assert.deepEqual(h.routes,[])
 thumb.props.onPointerDown(e(0));thumb.props.onPointerCancel();thumb.props.onPointerUp(e(228));assert.deepEqual(h.routes,[])
 t.mock.timers.tick(5000);await flush();h.render();assert.equal(h.audio.paused,false)
 thumb.props.onPointerDown(e(0));thumb.props.onPointerUp(e(183));await flush();assert.deepEqual(h.routes,['/court']);assert.equal(h.audio.paused,true);assert.equal(h.audio.currentTime,0)
 t.mock.timers.tick(10000);await flush();assert.equal(h.audio.plays,1)
 }finally{h.close();t.mock.timers.reset()}
})
for(const event of ['unmount','xiaoazi:pause','hidden','pagehide'])test(event+' cancels pending sound and re-entry receives its own five seconds',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let h=setupPage('MorningPage')
 try{t.mock.timers.tick(3000);if(event==='unmount')h.close();else if(event==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'))}else window.dispatchEvent(new Event(event));t.mock.timers.tick(6000);await flush();assert.equal(h.audio.plays,0);if(event!=='unmount')h.close()
 h=setupPage('MorningPage');t.mock.timers.tick(4999);await flush();assert.equal(h.audio.plays,0);t.mock.timers.tick(1);await flush();assert.equal(h.audio.plays,1)
 }finally{h.close();t.mock.timers.reset()}
})
test('leaving during playback pauses and resets the audio',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setupPage('MorningPage');t.mock.timers.tick(5000);await flush();assert.equal(h.audio.paused,false);h.audio.currentTime=2;h.close();assert.equal(h.audio.paused,true);assert.equal(h.audio.currentTime,0);t.mock.timers.reset()
})
test('alarm stays at 09:00 despite an explicit requested time; waiting and ringing cannot use the back button',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setupPage('MorningPage',async()=>{},'time=08%3A05')
 try{h.render();assert.equal(h.find(e=>e.type==='time').props.children,'09:00');assert.equal(h.find(e=>e.props?.['aria-label']==='返回对话').props.disabled,true);t.mock.timers.tick(5000);await flush();h.render();assert.equal(h.find(e=>e.type==='time').props.children,'09:00');assert.equal(h.find(e=>e.props?.['aria-label']==='返回对话').props.disabled,true)}finally{h.close();t.mock.timers.reset()}
})
test('alarm without a requested time remains at 09:00 when the system clock advances',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:Date.parse('2026-10-29T05:47:00Z')});const h=setupPage('MorningPage')
 try{assert.equal(h.find(e=>e.type==='time').props.children,'09:00');t.mock.timers.tick(65000);await flush();h.render();assert.equal(h.find(e=>e.type==='time').props.children,'09:00')}finally{h.close();t.mock.timers.reset()}
})
for(const [text,time]of [['帮我设置一个闹铃',undefined],['叫我起床',undefined],['明天早上八点叫醒我','08:00'],['星期五八点叫我起床','08:00'],['十分钟后叫醒我',undefined]])test(text+' routes locally after 2 seconds to the same page without a scheduled task',async()=>{
 const clocked=clock();let native=0,cloud=0;const h=setup(async()=>{cloud++},{nativeRequest:async()=>native++},clocked);const p=h.render().submit(text);await flush();await clocked.advance(1999);assert.equal(h.render().alarmRequest,undefined);await clocked.advance(1);await p;const c=h.render();assert.equal(c.alarmRequest?.time,time);assert.equal(typeof c.alarmRequest?.id,'number');assert.equal(c.card,undefined);assert.equal(c.context.pending,false);assert.equal(c.voiceCue,undefined);await h.render().approve();assert.equal(cloud,0);assert.equal(native,0);h.unmount()
})
test('permissions page offers microphone settings and no obsolete alarm grants',async()=>{
 const h=setupPage('PermissionsPage',async()=>({microphone:'granted'}))
 try{await flush();h.render();assert.match(h.text(),/麦克风/);assert.doesNotMatch(h.text(),/通知|精确闹钟|锁屏闹钟/)}finally{h.close()}
})
test('structured device intent cannot expose a real system alarm tool',()=>{
 assert.equal(validateIntent({tool:'alarm_clock_add',args:{hour:8,minute:0}}).ok,false)
 assert.equal(validateIntent({tool:'calendar_query_event',args:{start_time:'2026-10-27 00:00:00',end_time:'2026-10-27 23:59:59'}}).ok,true)
})
