import {isNonCommand,isSceneDenied,isProtectionIntent} from './wakeup'
/** Foreground text classification only. No notification or message access. */
const positive=(text:string)=>text.split(/[，,。；;]/).filter(p=>!/^\s*(?:不要|不用|不必|不想|别(?!人)|不是)/.test(p)).join('，')
export function isRestIntent(text:string){return /晚安|休息|睡觉|(?:我|朕)?要睡了|回寝宫|回宫/.test(positive(text))}
export function hasPriorityAction(text:string){
 const value=positive(text)
 return (!isSceneDenied(value,'morning')&&/叫醒|唤醒|起床|喊我|提醒我起身/.test(value))||(!isSceneDenied(value,'march')&&/导航|摆驾|骑车|骑行|单车|自行车|打车|带路/.test(value))||(!isSceneDenied(value,'kitchen')&&/点餐|点外卖|点份饭|吃饭|传膳|用膳|午餐|晚餐|早餐/.test(value))||isProtectionIntent(value)||(!isSceneDenied(value,'poem')&&/作诗|写(?:一首)?诗|来一首.*(?:绝句|律诗)/.test(value))||/听歌|听曲|放首歌|今日待办|今天要干什么|任务清单|回消息|回复草稿/.test(value)
}
export function clientEndingAllowed(text:string){
 if(isNonCommand(text)||/^\s*(?:你说|他说|她说|引用|例如|举例)/.test(text)||/^\s*[“「『"'‘].*[”」』"'’][。！？!?\s]*$/.test(text))return false
 const value=positive(text)
 if(!value||isRestIntent(value)||hasPriorityAction(value)||/是什么意思|是什么|是谁|什么意思|怎么读|怎么说|如何理解/.test(value))return false
 if(/(?:甲方|客户).{0,4}(?:没有|没|并未|不再|不(?=(?:再)?(?:提|加|追加|新增))).{0,8}(?:催|要求|需求|改|返工)|(?:甲方|客户).{0,3}(?:不|没那么)(?:烦|难伺候)/.test(value))return false
 return (/甲方|客户/.test(value)&&/又|催|改|烦|折腾|返工|要求|需求|难伺候|头疼|崩溃|让我|搞得我/.test(value))||/(?:在|这个|那个).*群里.{0,12}(?:我|朕|您).{0,6}(?:不是|不算|还是|还能算).{0,3}皇上/.test(value)
}
export function isClientComplaint(text:string){
 if(!clientEndingAllowed(text))return false
 const value=positive(text)
 return /(?:甲方|客户).{0,24}(?:好烦|很烦|烦死|太烦|难伺候|又.{0,12}(?:要求|催|改|返工)|又.{0,6}(?:提|加|追加|新增).{0,4}需求|要.{0,6}(?:再改|改一版)|催稿|催进度|修改意见|返工)/.test(value)||/(?:在|这个|那个).*群里.{0,12}(?:我|朕|您).{0,6}(?:不是|不算|还是|还能算).{0,3}皇上/.test(value)
}
