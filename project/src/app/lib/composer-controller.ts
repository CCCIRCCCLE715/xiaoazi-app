import {createAsrController, type AsrUiState} from './asr-controller'
import type {AsrProvider} from './providers'
import {acceptSpeechText} from './native-rpc'
import {normalizeDomainSpeech} from './domain-speech'
import {canSend, shouldSubmitOnEnter, type EnterKeyState} from './ime'
export interface ComposerState {mode:'voice'|'text';draft:string;notice:string;noticeAction?:{kind:string;label:string;run:()=>void};asr:AsrUiState;submitting:boolean;holding?:boolean;lastSpeech?:{rawText:string;normalizedText:string;sessionId:string}}
export function createComposerController(provider:AsrProvider, options:{onSubmit:(text:string)=>Promise<void>;onBeforeListen?:()=>void;onChange?:(state:ComposerState)=>void}) {
 let state:ComposerState={mode:'voice',draft:'',notice:'',asr:{phase:'idle',partial:''},submitting:false,holding:false}
 let revision=0,epoch=0,recoveryEpoch=0,disposed=false,composing=false,guardUntil=0
 type Hold={pressedAt:number;readyAt?:number;released:boolean;candidate?:{text:string;rawText:string;sessionId:string};sent:boolean}
 let hold:Hold|undefined
 const emit=(patch:Partial<ComposerState>)=>{if('notice' in patch){recoveryEpoch++;state={...state,noticeAction:undefined}}state={...state,...patch};if(!disposed)options.onChange?.(state)}
 const asr=createAsrController(provider,{
  onState(asr){if(asr.phase==='listening'&&hold&&hold.readyAt===undefined)hold.readyAt=Date.now();if(asr.phase==='error'){hold=undefined;emit({holding:false})}emit({asr,...(asr.phase==='error'&&asr.failure!=='cancelled'?{notice:asr.message??'识别未成功，请重试。'}:{})})},
  onFinal(text,sessionId,rawText){if(disposed||!hold)return;hold.candidate={text:normalizeDomainSpeech(acceptSpeechText(text)),rawText:rawText??text,sessionId};if(hold.released)void sendHold(hold)},
 })
 function clearHold(){hold=undefined;emit({holding:false})}
 function cancel(){epoch++;clearHold();asr.cancel();emit({submitting:false,notice:''})}
 function switchMode(mode:'voice'|'text'){cancel();composing=false;guardUntil=0;emit({mode,notice:''})}
 function edit(text:string){clearHold();asr.cancel();revision++;emit({draft:text.slice(0,4000),notice:''})}
 async function submit(){
  if(disposed||state.submitting||composing||Date.now()<guardUntil||!canSend(state.draft))return
  const value=state.draft,version=revision,request=++epoch
  clearHold();asr.cancel();emit({submitting:true,notice:''})
  try{await options.onSubmit(value);if(disposed||request!==epoch)return;if(version===revision){revision++;emit({draft:'',mode:'voice'})}}
  catch{if(!disposed&&request===epoch)emit({notice:'传旨未成功，请重试。'})}
  finally{if(!disposed&&request===epoch)emit({submitting:false})}
 }
 async function sendHold(current:Hold){
  if(disposed||hold!==current||!current.released||current.sent||!current.candidate||!canSend(current.candidate.text))return
  current.sent=true;const result=current.candidate
  revision++;emit({draft:result.text,lastSpeech:{rawText:result.rawText,normalizedText:result.text,sessionId:result.sessionId}})
  await submit()
 }
 async function holdStart(){
  if(disposed||state.mode!=='voice'||state.submitting)return
  clearHold();asr.cancel();const current:Hold={pressedAt:Date.now(),released:false,sent:false};hold=current
  options.onBeforeListen?.();emit({holding:true,notice:''});await asr.start()
 }
 async function holdEnd(){
  const current=hold;if(!current||current.released)return
  current.released=true;emit({holding:false})
  if(current.readyAt===undefined||Date.now()-current.pressedAt<300||Date.now()-current.readyAt<150){cancel();return}
  if(current.candidate){await sendHold(current);return}
  // A system service may already have ended capture. Never start a new one on release.
  if(state.asr.phase==='listening'||state.asr.phase==='recognizing')await asr.stop()
 }
 return {resume(){disposed=false},state:()=>state,holdStart,holdEnd,holdCancel:cancel,submit,cancel,switchMode,edit,
  notice:(notice:string)=>emit({notice}),
  recover(kind:string,message:string,retry:()=>void){if(disposed)return;const token=recoveryEpoch+1;emit({notice:message,noticeAction:{kind,label:'重试播放',run(){if(disposed||token!==recoveryEpoch)return;emit({notice:''});retry()}}})},
  clearRecovery(kind:string){if(state.noticeAction?.kind===kind)emit({notice:''})},
  compositionStart(){composing=true},compositionEnd(){composing=false;guardUntil=Date.now()+120},
  canEnter(key:Pick<EnterKeyState,'key'|'shiftKey'|'isComposing'>){return shouldSubmitOnEnter({...key,compositionActive:composing,guardUntil})},
  async enter(key:Pick<EnterKeyState,'key'|'shiftKey'|'isComposing'>){if(shouldSubmitOnEnter({...key,compositionActive:composing,guardUntil}))await submit()},
  dispose(){disposed=true;hold=undefined;epoch++;recoveryEpoch++;asr.dispose()},
 }
}
export type ComposerController=ReturnType<typeof createComposerController>
