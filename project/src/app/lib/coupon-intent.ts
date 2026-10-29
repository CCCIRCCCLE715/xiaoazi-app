import {isNonCommand} from './wakeup'
/** Only positive coupon requests or the agreed money-shortage phrases enter the coupon page. */
export function isCouponIntent(text:string):boolean {
 if(isNonCommand(text)||/是什么意思|什么意思|怎么读|怎么写|的意思|如何理解/.test(text)||/^(?:你说|他说|她说|引用|例如|举例)/.test(text.trim())||/^[“「『"'‘].*[”」』"'’][。！？!?\s]*$/.test(text.trim()))return false
 const positive=text.split(/[，,。；;]|但是|不过|而是|但/).filter(part=>!/(?:不要|不用|不必|不想|别|甭|取消|没有)[^，,。；;]{0,12}(?:优惠[券卷]|团购[券卷]?|代金券|折扣券|省钱|没钱)/.test(part)).join('，')
 return /优惠[券卷]|团购[券卷]|(?:找|看看|查|搜).{0,8}团购|代金券|折扣券|省钱券|(?:瑞幸|华莱士).{0,8}团购|(?:我|朕)(?:就要|要|快|又|已经)?没钱(?:了|啦|花)|囊中羞涩|手头(?:有点|有些)?紧|钱包空了|找.{0,8}便宜.{0,5}券/.test(positive)
}
