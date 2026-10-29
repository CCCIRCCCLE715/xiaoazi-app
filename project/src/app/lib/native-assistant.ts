import {listMemories,memoryContext} from './memories'
import {createNativeRpc,type NativeTransport} from './native-rpc'
import type {AsrProvider,AsrFailureReason} from './providers'
declare global{interface Window{XiaoaziNative?:NativeTransport}}
let rpc:ReturnType<typeof createNativeRpc>|undefined
function client(){if(typeof window==='undefined'||!window.XiaoaziNative)return undefined;return rpc??=createNativeRpc(window.XiaoaziNative,window)}
export function hasNativeAssistant(){return typeof window!=='undefined'&&Boolean(window.XiaoaziNative)}
export async function openAssistantSettings(){const c=client();if(!c)throw new Error('手机应用内可配置模型与语音');await c.request('settings').promise}
export interface AssistantStatus{enabled:boolean;keySaved:boolean;asrAvailable:boolean;model:string;baseUrl:string}
export async function assistantStatus(){const c=client();return c?await c.request<AssistantStatus>('status').promise:undefined}
let modelGeneration=0
let modelRequest:ReturnType<NonNullable<ReturnType<typeof client>>['request']>|undefined
export function cancelModelReply(){modelGeneration++;modelRequest?.cancel();modelRequest=undefined}
/** Native model only classifies. Its raw output is validated and never rendered. */
export async function routeNativeIntent(text:string,scene:string):Promise<string|undefined>{
 cancelModelReply();const token=modelGeneration;const c=client();if(!c)return undefined
 // One foreground budget includes configuration lookup; settings connection tests keep their own longer limits.
 const deadline=performance.now()+5000
 const remaining=()=>{const ms=Math.ceil(deadline-performance.now());if(ms<=0)throw new Error('timeout');return ms}
 try{
  const statusRequest=c.request<AssistantStatus>('status',{},undefined,remaining());modelRequest=statusRequest
  const status=await statusRequest.promise;if(token!==modelGeneration)throw new Error('cancelled');if(!status?.enabled||!status.keySaved)return undefined
  let memories:string[]=[];try{memories=memoryContext(listMemories())}catch{/* Do not use stale values on storage failure. */}
  const q=c.request<{text:string}>('model.route',{text:text.slice(0,4000),scene,...(memories.length?{memories}:{})},undefined,remaining());modelRequest=q
  const reply=await q.promise;if(token!==modelGeneration)throw new Error('cancelled')
  return typeof reply.text==='string'?reply.text.slice(0,2000):undefined
 }finally{if(token===modelGeneration)modelRequest=undefined}
}
export function modelFailure(error:unknown){const code=error instanceof Error?error.message:'';const labels:Record<string,string>={authentication:'API Key或账号权限有误，请检查设置。',rate_limit:'服务请求过多或额度不足，请稍后重试。',network:'模型连接失败，请检查网络与接口地址。',timeout:'模型回复超时，请重试。',redirect_blocked:'接口发生重定向，已停止发送。',unconfigured:'模型未配置，请在设置中填写。'};return labels[code]??'模型暂时无法回复，请检查设置后重试。'}
export const nativeAsrProvider:AsrProvider={
 id:'android-sensevoice-int8',finalTimeoutMs:45000,get state(){return hasNativeAssistant()?'ready':'unconfigured'},
 async open(sessionId,events){
  const c=client();if(!c)throw new Error('service-missing')
  let q:ReturnType<typeof c.request<{text:string;rawText?:string}>>|undefined,readyResolve:(()=>void)|undefined,readyReject:((e:Error)=>void)|undefined
  return {sessionId,start(){
   return new Promise<void>((resolve,reject)=>{
    readyResolve=resolve;readyReject=reject
    q=c.request<{text:string;rawText?:string}>('asr.start',{hold:true},event=>{if(event.event==='ready'){readyResolve?.();readyResolve=undefined;readyReject=undefined}if(event.event==='partial')events.onPartial(event.text??'');if(event.event==='recognizing')events.onRecognizing?.()},120000)
    void q.promise.then(result=>{readyResolve?.();readyResolve=undefined;events.onFinal(result.text,result.rawText)},error=>{const wasStarting=Boolean(readyReject);readyReject?.(error);readyResolve=undefined;readyReject=undefined;if(!wasStarting)events.onError((['asr-too-long','asr-client', 'asr-busy', 'asr-network', 'asr-audio', 'asr-server', 'asr-rate-limit', 'asr-disconnected', 'offline-model', 'offline-audio', 'offline-init','permission','language','no-speech','service-missing','timeout','cancelled'].includes(error.message)?error.message:'start-failed') as AsrFailureReason)})
   })
  },async stop(){if(q)await c.request('asr.stop',{target:q.id}).promise},cancel(){q?.cancel()},dispose(){q?.cancel()}}
 },
}

/** Safe numeric/category diagnostics only. Never send text, URL, file name or credentials. */
export function recordMediaDiagnostic(state:{phase:string;failure?:string;mediaErrorCode?:number;readyState?:number;networkState?:number;currentTime:number;duration:number}){
 const c=client();if(!c)return
 void c.request('diagnostics.media',{phase:state.phase,failure:state.failure??'none',mediaErrorCode:state.mediaErrorCode??0,readyState:state.readyState??0,networkState:state.networkState??0,currentTime:Math.round(state.currentTime*100)/100,duration:Math.round(state.duration*100)/100}).promise.catch(()=>{})
}

/** Explicit file-confirmation path; it never exports the native credential. */
export async function analyzeNativeDocument(payload:{units:import('./document-extract').DocumentUnit[]},signal:AbortSignal):Promise<string>{
 const c=client();if(!c)throw new Error('手机应用内可分析文件，请先在手机配置模型。')
 if(signal.aborted)throw new Error('cancelled')
 cancelModelReply();const token=modelGeneration
 const q=c.request<{text:string}>('model.document',payload,undefined,30000);modelRequest=q
 const abort=()=>q.cancel();signal.addEventListener('abort',abort,{once:true})
 try{const result=await q.promise;if(signal.aborted||token!==modelGeneration)throw new Error('cancelled');if(typeof result.text!=='string')throw new Error('invalid_response');return result.text}
 finally{signal.removeEventListener('abort',abort);if(token===modelGeneration)modelRequest=undefined}
}

/** Native code maps a configured merchant id to its menu; no order or delivery data is sent. */
export async function openMeituan(merchantId?:string){
 const c=client();if(!c)throw new Error('app_native_required')
 const result=await c.request<{started:boolean}>('app.meituan.open',merchantId?{merchantId}:{},undefined,5000).promise
 if(result?.started!==true)throw new Error('launch_failed')
}
export function meituanFailure(error:unknown){
 const code=error instanceof Error?error.message:''
 if(code==='app_missing')return '未安装美团，请安装后重试。'
 if(code==='app_native_required')return '请在手机应用中打开美团。'
 return '美团未能打开，请重试。'
}

export async function nativeRequest<T=unknown>(method:string,payload:Record<string,unknown>={}):Promise<T>{const c=client();if(!c)throw Error('native_unavailable');return c.request<T>(method,payload).promise}

/** Launches the installed Alipay launcher entry. No coupon claim or merchant deep link. */
export async function openAlipay(){
 const c=client();if(!c)throw new Error('app_native_required')
 const result=await c.request<{started:boolean}>('app.alipay.open',{},undefined,5000).promise
 if(result?.started!==true)throw new Error('launch_failed')
}
export function alipayFailure(error:unknown){
 const code=error instanceof Error?error.message:''
 if(code==='app_missing')return '未安装支付宝，请安装后重试。'
 if(code==='app_native_required')return '请在手机应用中打开支付宝。'
 return '支付宝未能打开，请重试。'
}
