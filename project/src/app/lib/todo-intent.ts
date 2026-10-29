import {isClientComplaint,hasPriorityAction,isRestIntent} from './client-ending-intent'
/** Todo intent is independent of SMS draft and general morning/calendar routing. */
export function isTodoIntent(text:string):boolean {
 if(isWorkIntent(text))return false
 const value=text.normalize('NFKC').toLowerCase()
 const target='(?:批奏折|奏折|待办(?:清单)?|to[\\s-]?do|安排今天|今日安排|(?:今天|今日).{0,10}(?:有什么安排|要干什么|要做什么|要办|要做|安排|事情|干点什么)|安排下今日|任务清单)'
 if(!new RegExp(target).test(value))return false
 if(/导航|(?:去|到)公司|叫醒|起床|点(?:个|份|一份)?外卖/.test(value))return false
 if(/是什么意思|什么意思|怎么读|怎么写|的定义/.test(value))return false
 if(/停止|停下|收起来|别说了|别播了/.test(value))return false
 if(new RegExp('(?:不要|不用|不必|不需要|不想|别(?!人)|甭)[^，。！？,.!?]{0,16}'+target).test(value))return false
 if(new RegExp('(?:你说|他说|她说|提到|引用|例如|举例)[^，。！？,.!?]{0,30}'+target).test(value))return false
 if(new RegExp('^\\s*[“「『"\'‘].*'+target+'.*[”」』"\'’][。！？!?\\s]*$').test(value))return false
 if(new RegExp(target+'(?:是什么|是什么意思|什么意思|怎么读|怎么写|的意思|的定义)').test(value)||new RegExp('(?:什么是|如何理解)'+target).test(value))return false
 return true
}

export function resolveTodoCommand(text:string):'approve'|'revise'|'hold'|undefined {
 const value=text.trim().replace(/[。！!\s]+$/,'')
 if(/^(?:准奏|确认今日安排|保存今日安排)$/.test(value))return 'approve'
 if(/^(?:重拟|重新拟|编辑清单)$/.test(value))return 'revise'
 if(/^(?:留中|稍后再办)$/.test(value))return 'hold'
}

/** Evaluate before pending external commands: a new todo request cannot approve an old SMS draft. */
export function routeTodoInput(text:string,active:boolean):{kind:'open'}|{kind:'command';command:'approve'|'revise'|'hold'}|undefined {
 if(isTodoIntent(text))return {kind:'open'}
 const command=active?resolveTodoCommand(text):undefined
 return command?{kind:'command',command}:undefined
}

/** Model paraphrases may be broader than the finite offline vocabulary. */
export function isTodoDenied(text:string):boolean {
 return /(?:不要|不用|不必|不需要|不想|别(?!人)|甭)[^，。！？,.!?]{0,20}(?:待办|清单|任务|安排|要干|要办|工作|奏折)/.test(text)
}

/** Explicit work/client requests open an independent work memorial deck. */
export function isWorkIntent(text:string):boolean {
 const value=text.normalize('NFKC').toLowerCase()
 if(!/(?:工作清单|(?:今天|今日)(?:的)?工作|(?:今天|今日).{0,6}(?:有哪些|有什么)工作|(?:整理|列出|列一下|列个|看看|查看|查看一下|打开).{0,12}(?:今天|今日)的?工作|工作文件|工作安排)/.test(value)&&!(/甲方|客户/.test(value)&&isClientComplaint(value)))return false
 if(hasPriorityAction(value)||isRestIntent(value))return false
 if(/导航|(?:去|到)公司|叫醒|起床|用膳|传膳|点(?:个|份|一份)?外卖|晚安|回寝宫/.test(value))return false
 if(/是什么意思|什么意思|怎么读|怎么写|的定义|停止|停下|收起来|别说了|别播了/.test(value))return false
 if(/(?:不要|不用|不必|不需要|不想|别(?!人)|甭)[^，。！？,.!?]{0,20}(?:甲方|客户|工作)/.test(value))return false
 if(/(?:你说|他说|她说|提到|引用|例如|举例)[^，。！？,.!?]{0,30}(?:甲方|客户|工作)/.test(value))return false
 if(/^[“「『"'‘].*[”」』"'’][。！？!?\s]*$/.test(value.trim()))return false
 return true
}
