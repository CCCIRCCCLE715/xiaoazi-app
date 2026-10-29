import test from 'node:test'
import assert from 'node:assert/strict'
import {createFloatingGesture,clampFloating} from '../src/app/lib/floating-character.ts'
const bounds={width:390,height:844,top:72,bottom:112,size:88,pad:12}
test('a tap below eight pixels returns; a drag never returns and snaps to its edge',()=>{const g=createFloatingGesture();g.down(1,300,100,{x:290,y:80});g.move(1,303,104,bounds);assert.equal(g.up(1,bounds).activate,true);g.down(2,300,100,{x:290,y:80});g.move(2,130,200,bounds);const r=g.up(2,bounds);assert.equal(r.activate,false);assert.equal(r.position.x,12);assert.equal(r.position.y,180)})
test('secondary pointers do not take the gesture, lost capture cannot become a click',()=>{const g=createFloatingGesture();assert.equal(g.down(1,1,1,{x:200,y:80}),true);assert.equal(g.down(2,5,5,{x:20,y:20}),false);assert.equal(g.move(2,20,20,bounds),null);g.cancel();assert.equal(g.up(1,bounds),null)})
test('drag clamps every edge and resize reclaims a position above voice/keyboard',()=>{assert.deepEqual(clampFloating({x:-100,y:-100},bounds),{x:12,y:72});assert.deepEqual(clampFloating({x:1000,y:1000},bounds),{x:290,y:644});assert.deepEqual(clampFloating({x:290,y:644},{...bounds,width:320,height:400}),{x:220,y:200})})
