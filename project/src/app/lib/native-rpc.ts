export interface NativeTransport {postMessage:(raw:string)=>void}
export interface NativeProgress {event:string;text?:string}
export interface NativeRequest<T=Record<string,unknown>>{id:string;promise:Promise<T>;cancel:()=>void}
const codes=new Set(['app_missing','launch_failed','asr-client','asr-busy','asr-network','asr-audio','asr-server','asr-rate-limit','asr-disconnected','offline-model','offline-audio','offline-init','cancelled','timeout','unconfigured','authentication','rate_limit','redirect_blocked','network','key_invalid','request_too_large','response_too_large','invalid_request','invalid_response','permission','language','no-speech','service-missing','start-failed','unsupported'])
export function createNativeRpc(transport:NativeTransport,target:EventTarget){
 let sequence=0,disposed=false
 const pending=new Map<string,{resolve:(data:any)=>void;reject:(e:Error)=>void;progress?:(event:NativeProgress)=>void;timer:ReturnType<typeof setTimeout>}>()
 const send=(id:string,method:string,payload:unknown)=>transport.postMessage(JSON.stringify({id,method,payload}))
 const listener=(event:Event)=>{
  const detail=(event as CustomEvent).detail;if(!detail||typeof detail.id!=='string')return
  const record=pending.get(detail.id);if(!record)return
  if(typeof detail.event==='string'){record.progress?.({event:detail.event,text:typeof detail.text==='string'?detail.text.slice(0,4000):''});return}
  pending.delete(detail.id);clearTimeout(record.timer)
  if(detail.ok===true)record.resolve(detail.data)
  else record.reject(new Error(codes.has(detail.code)?detail.code:'native_error'))
 }
 target.addEventListener('xiaoazi:native',listener)
 function cancel(id:string,reason='cancelled'){
  const item=pending.get(id);if(!item)return;pending.delete(id);clearTimeout(item.timer);item.reject(new Error(reason))
  try{send(`cancel_${++sequence}`,'cancel',{target:id})}catch{}
 }
 return {
  request<T=Record<string,unknown>>(method:string,payload:unknown={},progress?:(event:NativeProgress)=>void,timeoutMs=45000):NativeRequest<T>{
   const id=`native_${Date.now().toString(36)}_${++sequence}`
   const promise=new Promise<T>((resolve,reject)=>{
    if(disposed){reject(new Error('cancelled'));return}
    const timer=setTimeout(()=>cancel(id,'timeout'),timeoutMs);pending.set(id,{resolve,reject,progress,timer})
    try{send(id,method,payload)}catch{pending.delete(id);clearTimeout(timer);reject(new Error('native_error'))}
   })
   return {id,promise,cancel:()=>cancel(id)}
  },
  dispose(){disposed=true;for(const id of [...pending.keys()])cancel(id);target.removeEventListener('xiaoazi:native',listener)},
 }
}
/** ASR output only becomes an editable draft; business dispatch stays in the Send handler. */
export function acceptSpeechText(text:unknown){return typeof text==='string'?text.trim().replace(/(?<=[\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu,'').slice(0,4000):''}
