import {bossDraftChallenge} from './preset-commands'
/** Local preview only. No timer, notification or system-alarm side effect. */
export function isNonCommand(text: string): boolean {
 // Quoted dish names are data. Narrative quotation of a command is not an order.
 if(/停下|别说了|别播了|收起来|不听了|停止/.test(text))return true
 if(/(?:你说|他说|她说|刚才说|提到|引用|例如|举例)[^，。！？,.!?]{0,30}(?:起床|叫醒|唤醒|闹钟|闹铃|快救|救驾|护驾|点外卖|传膳|摆驾|御驾亲征|御驾亲蹬|骑行|骑车|低调|作诗|诗句|捧场|好诗|窗前一杯水)/.test(text))return true
 const quote=text.match(/^[\s“「『"'‘](.+?)[”」』"'’][。！!？?\s]*$/)
 return Boolean(quote&&/起床|叫醒|唤醒|闹钟|闹铃|快救|救驾|护驾|点外卖|传膳|摆驾|御驾亲征|御驾亲蹬|骑行|骑车|低调|作诗|诗句|捧场|好诗|窗前一杯水/.test(quote[1]))
}
/** Scope negation to the target action. '不要辣' is a food preference. */
export function isSceneDenied(text:string,scene:string):boolean {
 const negative='(?:不要|不用|不必|不想|别(?!人|处|的|家)|甭)'
 const modifiers='(?:(?:再|开|设置|把|帮|替|我|朕|点|订|买|叫|明天|今天|后天|明早|早上|上午|下午|晚上|现在|给|了|钟|分|半)|[零一二两三四五六七八九十0-9:：点\\s]){0,24}'
 const target=scene==='kitchen'?'(?:外卖|吃饭|传膳|用膳|想吃|猪脚饭)':scene==='morning'?'(?:起床|叫醒|唤醒|闹钟|闹铃|早朝|议事|工作|日程|上朝)':scene==='protect'?'(?:快救我|快救驾|救我|救驾|护驾)':scene==='march'?'(?:出行|出门|摆驾|出宫|导航|路线|御驾亲征|御驾亲蹬|骑行|骑车|低调|打车)':scene==='poem'?'(?:作诗|诗句|捧场|好诗|窗前一杯水)':undefined
 return target?new RegExp(negative+modifiers+target).test(text):false
}
/** Informational questions are different from a request such as 骑车去公司怎么走. */
export function isMarchInformation(text:string):boolean {
 const target='(?:出行|出门|骑行|骑车|御驾亲征|御驾亲蹬|低调|导航|路线|摆驾)'
 return new RegExp(target+'(?:是什么|是什么意思|什么意思|怎么读|怎么写|的意思|的定义)').test(text)||new RegExp('(?:什么是|如何理解)'+target).test(text)
}
export function isWakeIntent(text: string): boolean {
 return !isNonCommand(text) && !/取消|关闭|关掉|结束/.test(text) && !/是什么|什么是|如何|怎么设置|怎样|怎么用/.test(text) && !isSceneDenied(text,'morning') && /起床|叫醒|唤醒|闹钟|闹铃/.test(text)
}
function number(raw: string): number {
 if (/^\d+$/.test(raw)) return Number(raw)
 const digits:Record<string,number>={零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9}
 if(raw==='十')return 10
 if(raw.includes('十')){const [a,b]=raw.split('十');return (a?digits[a]:1)*10+(b?digits[b]:0)}
 return digits[raw]??NaN
}
export function parseWakeTime(text:string):string|undefined {
 if(!isWakeIntent(text))return undefined
 const clock=text.replace(/(?:星期|礼拜|周)[一二三四五六日天1-7]/g,'').match(/([\d零一二两三四五六七八九十]{1,3})(?:[:：]([0-9]{2})|点(?:钟)?(?:([零一二两三四五六七八九十\d]{1,3})分?|(半))?)/)
 if(!clock)return undefined
 let hour=number(clock[1]);const minute=clock[2]?Number(clock[2]):clock[3]?number(clock[3]):clock[4]?30:0
 if(/下午|晚上/.test(text)&&hour<12)hour+=12
 if(hour<0||hour>23||minute<0||minute>59||!Number.isFinite(hour)||!Number.isFinite(minute))return undefined
 return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`
}

export function isProtectionIntent(text:string):boolean {
 if(bossDraftChallenge(text))return true
 if(isNonCommand(text)||isSceneDenied(text,'protect'))return false
 const value=text.normalize('NFKC').toLowerCase().replace(/\s/g,'')
 if(/救我(?:设置|设|查|打开|点|订|安排)/.test(value))return false
 return /快救我|快救驾|救驾|护驾|被人骂了|有人.*骂我|骂我|有人凶朕|凶朕|小a子.*救我/.test(value)
}
