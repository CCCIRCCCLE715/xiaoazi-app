import {isCouponIntent} from './coupon-intent'
import {isTodoIntent,isTodoDenied,isWorkIntent} from './todo-intent'
import {normalizeDomainSpeech} from './domain-speech'
import {bossDraftChallenge} from './preset-commands'
import {isClientComplaint,clientEndingAllowed,isRestIntent} from './client-ending-intent'
import {ENDING_APOLOGY} from './ending-apology-config'
import {detectScene,enterScene,findKitchenDish,parseDestination,parseBudget,parseAddress,parseTaste,type SceneId,type SceneReply,type SceneContext,type SceneCard} from './scenes'
import {isNonCommand,isSceneDenied,isMarchInformation,isWakeIntent,parseWakeTime,isProtectionIntent} from './wakeup'
import {findSceneDefinition} from './scene-config'
export const ROUTABLE_SCENES=['todo','work','morning','kitchen','coupons','protect','memorial','march','poem','ending','client-ending','music','clarify'] as const
export type IntentScene=typeof ROUTABLE_SCENES[number]
export interface IntentDecision {scene:IntentScene;confidence:number;slots:{destination?:string;mode?:'步行'|'打车'|'骑行';budget?:number;taste?:string;address?:string;time?:string;day?:'今天'|'明天'|'后天'};clarify:boolean}
const clarify=():IntentDecision=>({scene:'clarify',confidence:0,slots:{},clarify:true})
function quoted(text:string){return /是什么意思|什么意思|怎么读|怎么写|的意思|如何理解/.test(text)||isNonCommand(text)||/^(?:你说|他说|她说|引用|例如|举例)/.test(text.trim())||/^[“「『"'‘].*[”」』"'’][。！？!?\s]*$/.test(text.trim())}
function positiveClauses(text:string){if(/^朕不是皇上(?:吗|么)?[？?。！!\s]*$/.test(text.trim()))return text;return text.split(/[，,。；;]|但是|不过|而是|但/).filter(part=>!/^\s*(?:(?:今天|今日|现在|先|暂时|这次|我|朕|明天|后天))*\s*(?!不要辣|不辣|不要甜|不要咸|不要油)(?:不要|不用|不必|不想|别(?!人)|不是|不再|不)/.test(part)).join('，')}
function denied(text:string,scene:string){
 if(quoted(text))return true
 if(scene==='coupons')return !isCouponIntent(text)
 const positive=positiveClauses(text)
 if(!positive)return true
 if(scene==='march'&&/(?:不去|不去了|不想去|不要去|别去|不用去)/.test(positive))return true
 if(scene==='music')return /(?:不要|不想|别|不用)[^，,。；;]{0,12}(?:听歌|听曲|放歌|音乐|曲子)/.test(positive)
 if(scene==='poem'&&/(?:不要|不用|不想|别|不必)[^，,。；;]{0,12}(?:诗|词|吟|写)/.test(positive))return true
 if(scene==='todo'||scene==='work')return isTodoDenied(positive)
 return isSceneDenied(positive,scene)
}
export function normalizedWakeText(text:string){return positiveClauses(text).replace(/提醒我起身|催我起身|叫我起身|喊我|唤我|催我起床/g,'叫醒')}
export function wakeRequested(text:string){return !quoted(text)&&isWakeIntent(normalizedWakeText(text))}
export function presetVoiceAllowed(scene:SceneId,text:string){
 if(scene==='client-ending')return ENDING_APOLOGY.previewEnabled&&clientEndingAllowed(text)
 if(scene==='morning')return false
 if(scene==='protect')return bossDraftChallenge(text)||/救|护驾|危险|撑腰|撑撑腰|挡|欺负/.test(positiveClauses(text))
 return true
}
function slotsFor(scene:IntentScene,text:string):IntentDecision['slots']{
 const slots:IntentDecision['slots']={}
 if(scene==='march'){
  const destination=parseDestination(text)?.replace(/(?:的路|的路线|路线|如何前往|怎么样)$/,'');if(destination)slots.destination=destination
  if(/走路|步行/.test(text))slots.mode='步行';else if(/打车|出租车/.test(text))slots.mode='打车';else if(/骑车|骑行|单车|自行车|低调|御驾亲蹬/.test(text))slots.mode='骑行'
 }
 if(scene==='kitchen'){const budget=parseBudget(text),taste=parseTaste(text),address=parseAddress(text);if(budget!==undefined)slots.budget=budget;if(taste)slots.taste=taste;if(address)slots.address=address}
 if(scene==='morning'){const time=parseWakeTime(normalizedWakeText(text));if(time){slots.time=time;if(/后天/.test(text))slots.day='后天';else if(/明天|明早/.test(text))slots.day='明天';else if(/今天/.test(text))slots.day='今天'}}
 return slots
}
/** Offline fallback only; never described as a model call. */
export function localDecision(text:string):IntentDecision{
 text=normalizeDomainSpeech(text)
 if(quoted(text))return clarify()
 const input=positiveClauses(text)
 if(!input)return clarify()
 let scene:IntentScene|undefined
 if(isCouponIntent(text))scene='coupons'
 else if(bossDraftChallenge(text)||isProtectionIntent(input))scene='protect'
 else if(wakeRequested(input)&&!isSceneDenied(input,'morning'))scene='morning'
 else if(isRestIntent(input))scene='ending'
 else if(isWorkIntent(input))scene='work'
 else if(isTodoIntent(input))scene='todo'
 else if(/诗|绝句|律诗|打油|赋一首|(?:写|作|吟|念|来).{0,8}(?:阕词|首词|宋词)|(?:写|作|吟|念)(?:一(?:首|阕))?词/.test(input))scene='poem'
 else if(/(?:用膳|传膳|吃饭|饿了|有点饿|点(?:个|份|一份)?(?:外卖|午饭|晚饭|早饭|饭)|弄(?:点|份|一份)?吃|中午吃什么|午餐|晚餐|早餐|点餐)|(?:^|[，,])外卖(?:[。！!\s]|$)/.test(input)&&!denied(text,'kitchen'))scene='kitchen'
 else if(/出行|出门|摆驾|(?:今天|今日)怎么上朝|走路|步行|御驾亲蹬|(?:我要|带我|我想)?去公司|导航|骑车|骑行|单车|自行车|打车|找.{0,6}(?:路线|的路)|带路/.test(input)&&!isMarchInformation(input))scene='march'
 else if(/肚子.{0,5}(?:饿|空)|弄点吃|来份饭|点份饭|午餐|晚餐|早餐|点餐/.test(input))scene='kitchen'
 else if(/听歌|听曲|选一首曲子|音乐/.test(input))scene='music'
 else if(findKitchenDish(input))scene='kitchen'
 else if(isClientComplaint(input))scene='client-ending'
 else scene=detectScene(input) as IntentScene|undefined
 if(!scene&&(/^[\u4e00-\u9fff]{5}(?:，|,)[\u4e00-\u9fff]{5}[。！!\s]*$/.test(input)||/^[\u4e00-\u9fff]{7}(?:，|,)[\u4e00-\u9fff]{7}[。！!\s]*$/.test(input)))scene='poem'
 if(scene==='kitchen'&&/外卖员/.test(input)&&!/(?:用膳|传膳|吃饭|想吃|点(?:个|份|一份)?外卖|肚子.{0,5}饿)/.test(input))return clarify()
 if(!scene||denied(text,scene))return clarify()
 return {scene,confidence:.85,slots:slotsFor(scene,input),clarify:false}
}
const allowed:Record<IntentScene,readonly string[]>={todo:[],work:[],coupons:[],morning:['time','day'],kitchen:['budget','taste','address'],march:['destination','mode'],protect:[],poem:[],memorial:[],ending:[],'client-ending':[],music:[],clarify:[]}
const safe=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f\x7f<>`{}]|https?:|javascript:|file:|content:|\/\//i.test(v)
/** Parse no Markdown, no text answer, no tools, no nested operations, no ungrounded fields. */
export function validateDecision(raw:string,text:string):IntentDecision|undefined{
 try{
  if(raw.length>2000)return;const d=JSON.parse(raw)
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).sort().join(',')!=='clarify,confidence,scene,slots')return
  if(!ROUTABLE_SCENES.includes(d.scene)||typeof d.confidence!=='number'||!Number.isFinite(d.confidence)||d.confidence<.65||d.confidence>1||typeof d.clarify!=='boolean')return
  if(!d.slots||typeof d.slots!=='object'||Array.isArray(d.slots)||Object.keys(d.slots).some(k=>!allowed[d.scene as IntentScene].includes(k)))return
  if(d.scene!=='clarify'&&denied(text,d.scene))return
  if(d.scene==='client-ending'&&!clientEndingAllowed(text))return
  if(bossDraftChallenge(text)&&d.scene!=='protect')return
  if(['march','kitchen','coupons','todo','work','protect'].includes(localDecision(text).scene)&&d.scene!==localDecision(text).scene)return
  if(isClientComplaint(text)&&localDecision(text).scene!=='coupons'&&!isWorkIntent(text)&&d.scene!=='client-ending'&&localDecision(text).scene!=='protect')return
  const grounded=slotsFor(d.scene,text)
  for(const [k,v]of Object.entries(d.slots)){
   if(k==='budget'){if(typeof v!=='number'||v<1||v>999||!Number.isInteger(v)||v!==grounded.budget)return}
   else if(k==='mode'||k==='time'||k==='day'){if(v!==grounded[k as 'mode'|'time'|'day'])return}
   else if(!safe(v,k==='taste'?12:40)||!text.includes(v as string))return
  }
  return {scene:d.scene,confidence:d.confidence,slots:{...grounded,...d.slots},clarify:d.clarify}
 }catch{return}
}
/** A decision can select only existing preset UI. It cannot execute native operations. */
export function decisionReply(d:IntentDecision,text:string,context:SceneContext,card?:SceneCard):SceneReply{
 if(d.scene==='clarify'||d.clarify)return {text:'陛下要用膳、看待办，还是摆驾？',action:'reply',card,context}
 const scene=d.scene as SceneId
 let source=scene==='morning'?normalizedWakeText(text):positiveClauses(text)
 // Display only a clock grounded in the request; this page never schedules an alarm.
 if(scene==='morning'&&d.slots.time&&!/叫醒|唤醒|起床/.test(source))source+='叫醒'
 const reply=enterScene(scene,source,context)
 if(reply.card?.kind==='march')reply.card={...reply.card,destination:d.slots.destination??reply.card.destination,mode:d.slots.mode??reply.card.mode}
 if(reply.card?.kind==='kitchen'){
  const budget=d.slots.budget??reply.card.budget,taste=d.slots.taste??reply.card.taste,address=d.slots.address??reply.card.address
  reply.card={...reply.card,budget,taste,address,dishes:reply.card.dishes.filter(dish=>budget==null||dish.price<=budget)}
  reply.context={...reply.context,budget,taste,address}
 }
 reply.environment=reply.environment??findSceneDefinition(scene)?.environment
 return reply
}
