import test from 'node:test'
import assert from 'node:assert/strict'
let createPanelMotion
try { ({createPanelMotion}=await import('../src/app/lib/panel-motion.ts')) } catch {}
// Removing interruption snapshots or request ownership must fail these tests.
function setup(){
 assert.equal(typeof createPanelMotion,'function')
 const animations=[];let visible={opacity:.63,transform:'matrix(1, 0, 0, 1, 0, 17)'};let closed=0
 const surface={read:()=>visible,animate(frames,options){let finish;const animation={playState:'running',finished:new Promise(r=>finish=r),cancel(){this.playState='idle'},finish(){this.playState='finished';finish()}};animations.push({frames,options,animation});return animation}}
 return {motion:createPanelMotion(surface,()=>closed++),animations,closed:()=>closed}
}
test('a new message reenters a visible card without blanking it or remounting content',async()=>{
 const {motion,animations}=setup();motion.update(true,false,260);animations[0].animation.finish();await Promise.resolve()
 motion.update(true,false,260)
 assert.equal(animations[1].frames[0].opacity,1)
 assert.notEqual(animations[1].frames[0].transform,'none')
 assert.equal(animations[1].frames.at(-1).opacity,1);motion.dispose()
})
test('rapid open-close-open retargets current pixels and stale exits cannot remove the new card',async()=>{
 const {motion,animations,closed}=setup();motion.update(true,false,260);motion.update(false,false,260)
 assert.equal(animations[1].frames[0].opacity,.63)
 assert.equal(animations[1].frames[0].transform,'matrix(1, 0, 0, 1, 0, 17)')
 motion.update(true,false,260);animations[1].animation.finish();await Promise.resolve();assert.equal(closed(),0)
 motion.update(false,false,260);animations.at(-1).animation.finish();await Promise.resolve();assert.equal(closed(),1);motion.dispose()
})
test('reduced motion and disposal prevent movement and late unmount callbacks',async()=>{
 const {motion,animations,closed}=setup();motion.update(true,true,260);motion.update(false,true,260)
 assert.ok(animations.every(a=>a.frames.every(f=>f.transform==='none')))
 motion.dispose();animations.at(-1).animation.finish();await Promise.resolve();assert.equal(closed(),0)
})
