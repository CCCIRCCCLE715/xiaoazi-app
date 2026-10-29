/** Each armed recording waits for the painted frame owned by its fresh player request. */
export function createEndingVoiceFence(){
 let action:string|undefined,expected:number|undefined
 return {
  arm(next:string|undefined){action=next;expected=undefined},
  requested(key:string,token:number|undefined){if(action===key)expected=token},
  accepts(key:string,token:number|undefined){return key!==action||expected!==undefined&&token===expected},
 }
}
