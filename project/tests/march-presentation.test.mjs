import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarchPresentation } from '../src/app/lib/march-presentation.ts'
function setup(t){t.mock.timers.enable({apis:['setTimeout']});const events=[];const p=createMarchPresentation(phase=>events.push(phase));t.after(()=>{p.cancel();t.mock.timers.reset()});return {p,events,tick:ms=>t.mock.timers.tick(ms)}}
test('route waits for fresh role frame, shows bike then compacts once with 60ms stagger and one route',t=>{
 const {p,events,tick}=setup(t);p.arm(1);tick(5000);assert.deepEqual(events,['waiting'])
 p.frame(0);assert.equal(events.at(-1),'waiting');p.frame(1);assert.equal(events.at(-1),'bike')
 tick(1199);assert.equal(events.at(-1),'bike');tick(1);assert.equal(events.at(-1),'compact')
 tick(250);assert.equal(events.at(-1),'duration');tick(60);assert.equal(events.at(-1),'map');tick(60);assert.equal(events.at(-1),'route')
 tick(1399);assert.equal(events.at(-1),'route');tick(1);assert.equal(events.at(-1),'arrived');p.frame(1);tick(10000)
 assert.equal(events.filter(x=>x==='bike').length,1);assert.equal(events.filter(x=>x==='route').length,1)
})
test('repeat starts one new timeline and stale callbacks cannot reveal prior map',t=>{
 const {p,events,tick}=setup(t);p.arm(1);p.frame(1);tick(1300);p.arm(2);p.frame(1);tick(5000);assert.equal(events.at(-1),'waiting')
 p.frame(2);tick(1200);assert.equal(events.at(-1),'compact');tick(1770);assert.equal(events.at(-1),'arrived')
})
for(const reason of ['stop','scene switch','background','unmount'])test(reason+' cancels route and cannot resume from old frame',t=>{
 const {p,events,tick}=setup(t);p.arm(3);p.frame(3);tick(1600);p.cancel();const count=events.length;tick(10000);p.frame(3);assert.equal(events.length,count);assert.equal(events.at(-1),'cancelled')
})
test('reduced motion presents full stable route immediately with no delayed timeline',t=>{
 const {p,events,tick}=setup(t);p.arm(1,true);p.frame(1);assert.equal(events.at(-1),'arrived');const count=events.length;tick(10000);assert.equal(events.length,count)
})
