import test from 'node:test'
import assert from 'node:assert/strict'
import {createPlaybackGate} from '../src/app/lib/playback-gate.ts'
test('old visible frames survive loading; newest valid frame atomically supersedes them',()=>{
 const g=createPlaybackGate(), idle=g.request('idle').token
 assert.equal(g.frame(idle,true),true)
 const obsolete=g.request('think').token, newest=g.request('point').token
 assert.equal(g.frame(idle,true),true)
 assert.equal(g.frame(obsolete,true),false)
 assert.equal(g.frame(newest,false),false)
 assert.equal(g.frame(idle,true),true)
 assert.equal(g.frame(newest,true),true)
 assert.equal(g.frame(idle,true),false)
 assert.equal(g.complete(idle),false)
 assert.equal(g.complete(newest),true)
})
test('50 same-action taps merge; interrupted completion cannot reset a pending scene',()=>{
 const g=createPlaybackGate(), first=g.request('reply').token
 for(let i=0;i<50;i++) assert.deepEqual(g.request('reply'),{token:first,merged:true})
 g.frame(first,true)
 const point=g.request('point').token
 assert.equal(g.complete(first),false)
 g.fail(point)
 assert.equal(g.frame(first,true),true)
})
test('requesting visible action cancels obsolete pending action and retry gets a fresh token',()=>{
 const g=createPlaybackGate(), idle=g.request('idle').token;g.frame(idle,true)
 const lost=g.request('reply').token;g.request('idle')
 assert.equal(g.frame(lost,true),false)
 const retry=g.request('reply').token;assert.notEqual(retry,lost)
 g.invalidate();assert.equal(g.frame(retry,true),false)
})
