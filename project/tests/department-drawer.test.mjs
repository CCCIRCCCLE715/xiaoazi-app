import test from 'node:test'
import assert from 'node:assert/strict'
let createDepartmentDrawer
try{({createDepartmentDrawer}=await import('../src/app/lib/department-drawer.ts'))}catch{}
// Removing native-modal lifetime or completion ownership must fail these checks.
function setup(){
 assert.equal(typeof createDepartmentDrawer,'function')
 let nativeOpen=false,shown=0,hidden=0,focused=0,restored=0,opening=0,expanded=false
 const animations=[],applied=[],snapshot={opacity:.62,transform:'matrix(1,0,0,1,-82,0)'}
 const surface={isOpen:()=>nativeOpen,show(){nativeOpen=true;shown++},hide(){nativeOpen=false;hidden++},focusRow(){focused++},restoreFocus(){restored++},read:()=>snapshot,apply:f=>applied.push(f),animate(frames,options){let finish;const a={playState:'running',finished:new Promise(r=>finish=r),cancel(){this.playState='idle'},finish(){this.playState='finished';finish()}};animations.push({frames,options,a});return a}}
 return {drawer:createDepartmentDrawer(surface,()=>opening++,value=>expanded=value),animations,applied,state:()=>({nativeOpen,shown,hidden,focused,restored,opening,expanded})}
}
test('drawer keeps the native modal open throughout touch exit and restores focus only after completion',async()=>{
 const h=setup();h.drawer.open(false,false);assert.deepEqual(h.state(),{nativeOpen:true,shown:1,hidden:0,focused:1,restored:0,opening:1,expanded:true});assert.equal(h.animations[0].options.duration,220)
 h.drawer.close(false,false);assert.equal(h.animations[1].options.duration,220);assert.equal(h.state().nativeOpen,true);h.animations[1].a.finish();await Promise.resolve();assert.equal(h.state().nativeOpen,false);assert.equal(h.state().restored,1);h.drawer.dispose()
})
test('interrupted exits resume from actual pixels and old completions cannot close a reopened modal',async()=>{
 const h=setup();h.drawer.open(false,false);h.drawer.close(false,false);h.drawer.open(false,false)
 assert.deepEqual(h.animations[2].frames[0],{opacity:.62,transform:'matrix(1,0,0,1,-82,0)'});h.animations[1].a.finish();await Promise.resolve();assert.equal(h.state().nativeOpen,true);assert.equal(h.state().restored,0);h.drawer.dispose();h.animations[2].a.finish();await Promise.resolve();assert.equal(h.state().nativeOpen,false)
})
test('keyboard opening and escape dismissal complete immediately without leaving an overlay',()=>{
 const h=setup();h.drawer.open(true,false);assert.equal(h.animations.length,0);assert.equal(h.state().focused,1);h.drawer.close(true,false);assert.equal(h.state().nativeOpen,false);assert.equal(h.state().restored,1);assert.equal(h.animations.length,0);h.drawer.dispose()
})
test('reduced motion is opacity only and duplicate open does not cancel recording twice',()=>{
 const h=setup();h.drawer.open(false,true);h.drawer.open(false,true);h.drawer.close(false,true);assert.ok(h.animations.every(a=>a.frames.every(f=>f.transform==='none')));assert.equal(h.state().opening,1);h.drawer.dispose()
})
