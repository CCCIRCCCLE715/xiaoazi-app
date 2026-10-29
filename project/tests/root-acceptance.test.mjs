import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {setup} from './court-harness.mjs'
const cases=JSON.parse(readFileSync(new URL('./fixtures/root-acceptance-cases.json',import.meta.url),'utf8'))
function check(c,court){if(c.scene==='morning'&&!c.text.includes('早上好')){assert.equal(court.context.sceneId,'morning');assert.equal(court.action,'idle');assert.equal(court.voiceCue,undefined);assert.equal(typeof court.alarmRequest?.id,'number');if(c.slots?.time)assert.equal(court.alarmRequest.time,c.slots.time);return}if(c.scene==='march'&&!c.slots?.mode&&!/骑车|骑行|打车|低调|御驾亲/.test(c.text)){assert.equal(court.context.sceneId,'march');assert.equal(court.card.stage,'choose');assert.equal(court.card.mode,null);assert.equal(court.action,'point');assert.match(court.voiceCue?.src??'',/march-query/);return}assert.equal(court.context.sceneId,c.scene,c.text);if('card'in c)assert.equal(court.card?.kind??null,c.card,c.text);if(c.action)assert.equal(court.action,c.scene==='todo'?'scroll':c.action,c.text);if(c.voice)assert.match(court.voiceCue?.src??'',new RegExp(c.scene==='todo'?'todo-present':c.voice),c.text);if(c.forbiddenVoice)assert.doesNotMatch(court.voiceCue?.src??'',new RegExp(c.forbiddenVoice),c.text);if(c.slots){for(const [k,v]of Object.entries(c.slots)){if(k==='time')assert.equal(court.alarmRequest?.time,v);else if(k!=='day')assert.equal(court.card[k],v,c.text)}}}
test('coordinator local-required cases through production hook include preset voice and UI, with native unconfigured',async()=>{
 for(const c of cases.localRequired){const h=setup(async()=>undefined);await h.render().submit(c.text);check(c,h.render())}
})
test('classification fixtures (not real API) consume semantic paraphrases with preset voice and UI',async()=>{
 for(const c of cases.semanticServiceRequired){const h=setup(async()=>JSON.stringify({scene:c.scene,confidence:.97,slots:c.slots??{},clarify:false}));await h.render().submit(c.text);check(c,h.render());assert.ok(h.render().line.length<150)}
})
test('new scene removes unrelated card and stop cancels semantic/native work',async()=>{
 for(const item of cases.crossScene){const h=setup(async()=>undefined);for(const text of item.sequence)await h.render().submit(text);const court=h.render();if(item.lastScene==='idle'){assert.equal(court.card,undefined);assert.equal(court.action,'idle')}else assert.equal(court.context.sceneId,item.lastScene)}
})
