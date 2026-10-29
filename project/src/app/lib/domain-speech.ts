/** Semantic phrase correction only. The ASR raw transcript is never overwritten. */
export interface SpeechDomainContext {waitingForTravelMode?:boolean}
export function normalizeDomainSpeech(raw:string,context:SpeechDomainContext={}):string{
 const full=raw.normalize('NFKC').replace(/[\s，,。.!！?？、:：;；]/g,'')
 if(/^(?:黄白|黄柏|黄百)(?:你的?|的)?(?:稿子|搞子)(?:呢|在哪(?:里)?|写完了吗|写好了吗|好了吗)$/.test(full))return '黄白，你的稿子呢？'
 // Only a pending travel-mode question supplies enough context for these finite homophones.
 // 征 is intentionally absent: an expedition, explanation or quotation is not a bicycle command.
 if(context.waitingForTravelMode&&/^(?:小[Aa]子)?(?:今天|今日)?(?:御驾|欲驾|玉驾)(?:亲蹬|亲登|亲灯|轻登|青蹬)(?:吧|出发吧|出行)?$/.test(full)){
  return raw.replace(/(?:御驾|欲驾|玉驾)(?:亲蹬|亲登|亲灯|轻登|青蹬)/,'御驾亲蹬')
 }
 return raw.replace(/优惠卷/g,'优惠券').replace(/团购卷/g,'团购券').replace(/^小[阿aA]子(?=[，,\s]*(?:你好|您好|嗨|哈喽|hello|hi))/i,'小A子')
}

/** Whole-message greetings only: no negation, quotations or embedded business request. */
export function isIdleGreeting(raw:string):boolean {
 const value=normalizeDomainSpeech(raw).normalize('NFKC').toLowerCase().replace(/[\s，,。.!！?？、]/g,'')
 return /^(?:小a子)?(?:你好[啊呀哇]?|您好[啊呀]?|嗨|哈喽|hello|hi)(?:小a子)?$/.test(value)
}

