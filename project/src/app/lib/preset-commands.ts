import {normalizeDomainSpeech} from './domain-speech'
/** Exact preset request only. Surrounding quotation/negation/explanation stays data. */
export function bossDraftChallenge(text:string):boolean {
 return normalizeDomainSpeech(text).normalize('NFKC').replace(/[\s，,。.!！?？、:：;；]/g,'')==='黄白你的稿子呢'
}
