import test from 'node:test'
import assert from 'node:assert/strict'
let createMusicCue
try{({createMusicCue}=await import('../src/app/lib/music-cue.ts'))}catch{}
test('only the current request exact source and real tap media time can authorize one song cue',()=>{
 assert.equal(typeof createMusicCue,'function');const fired=[],cue=createMusicCue(token=>fired.push(token))
 const config={source:'https://app.local/music.webm',action:'music-tap',at:2.625,previewEnabled:true}
 cue.arm(10,config)
 for(const patch of [{token:9},{source:'https://app.local/point.webm'},{action:'point'},{time:2.5},{time:NaN}])cue.frame({token:10,...config,time:2.625,...patch})
 assert.equal(fired.length,0)
 cue.frame({token:10,...config,time:2.625});cue.frame({token:10,...config,time:3});assert.deepEqual(fired,[10])
 cue.arm(11,config);cue.frame({token:10,...config,time:3});assert.deepEqual(fired,[10]);cue.frame({token:11,...config,time:2.625});assert.deepEqual(fired,[10,11])
})
test('pause/background/exit cancel pending tap across resume; preview license differs from final acceptance',()=>{
 assert.equal(typeof createMusicCue,'function');const fired=[],cue=createMusicCue(token=>fired.push(token)),config={source:'music.webm',action:'music-tap',at:2.625,previewEnabled:true,finalAccepted:false}
 cue.arm(1,config);cue.cancel();cue.frame({token:1,...config,time:3});assert.deepEqual(fired,[])
 cue.arm(2,{...config,previewEnabled:false});cue.frame({token:2,...config,time:3});assert.deepEqual(fired,[])
 cue.arm(3,config);cue.frame({token:3,...config,time:2.625});assert.deepEqual(fired,[3])
})
