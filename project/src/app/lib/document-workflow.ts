import type {ImportedDocument} from './document-extract'
import type {DocumentAnalysis} from './document-contract'
import type {WorkFileSelection} from './document-mode'
export interface DocumentImportState{phase:'closed'|'choose'|'selecting'|'reading'|'preview'|'analyzing'|'error';document?:ImportedDocument;name?:string;bytes?:number;error?:string}
interface Ports{selectWorkPlan?:(selection:WorkFileSelection)=>Promise<void>;extract:(file:File,signal:AbortSignal)=>Promise<ImportedDocument>;analyze:(d:ImportedDocument,signal:AbortSignal)=>Promise<DocumentAnalysis>;onAnalyzeStart:()=>number;present:(r:DocumentAnalysis,d:ImportedDocument,token:number)=>Promise<void>;failure:(error:unknown,token:number)=>Promise<void>;cancelCurrent:()=>void;change:(state:DocumentImportState)=>void}
export function createDocumentWorkflow(ports:Ports){
 let state:DocumentImportState={phase:'closed'},epoch=0,abort:AbortController|undefined,file:File|undefined
 const publish=(next:DocumentImportState)=>{state=next;ports.change(next)}
 const invalidate=()=>{epoch++;abort?.abort();abort=undefined}
 function cancel(){const owned=state.phase!=='closed';invalidate();file=undefined;if(owned)ports.cancelCurrent();publish({phase:'closed'})}
 return {
  state:()=>state,
  open(){cancel();ports.cancelCurrent();publish({phase:'choose'})},
  choosing(){invalidate();publish({phase:'selecting'})},
  selectionCancelled(){if(state.phase==='selecting')publish({phase:'choose'})},
  cancel,
  background(){if(state.phase!=='selecting')cancel()},
  async selectMetadata(selection:WorkFileSelection){
   if(!ports.selectWorkPlan)return
   invalidate();file=undefined;publish({phase:'closed'});await ports.selectWorkPlan(selection)
  },
  async select(next:File){
   if(ports.selectWorkPlan){
    await this.selectMetadata({name:next.name,type:next.type,bytes:next.size})
    return
   }
   invalidate();ports.cancelCurrent();file=next;const token=epoch,controller=new AbortController();abort=controller
   publish({phase:'reading',name:next.name,bytes:next.size})
   try{const doc=await ports.extract(next,controller.signal);if(token!==epoch||controller.signal.aborted)return;publish({phase:'preview',document:doc,name:doc.name,bytes:doc.bytes})}
   catch(error){if(token!==epoch||controller.signal.aborted)return;publish({phase:'error',name:next.name,bytes:next.size,error:error instanceof Error?error.message:'读取失败，请重试。'})}
  },
  retryRead(){if(file)return this.select(file)},
  async analyze(){
   if(!state.document||state.phase==='analyzing')return
   const doc=state.document;invalidate();const token=epoch,controller=new AbortController();abort=controller
   const courtToken=ports.onAnalyzeStart();publish({phase:'analyzing',document:doc,name:doc.name,bytes:doc.bytes})
   try{const result=await ports.analyze(doc,controller.signal);if(token!==epoch||controller.signal.aborted)return;await ports.present(result,doc,courtToken);if(token!==epoch||controller.signal.aborted)return;file=undefined;abort=undefined;publish({phase:'closed'})}
   catch(error){if(token!==epoch||controller.signal.aborted)return;await ports.failure(error,courtToken);if(token!==epoch||controller.signal.aborted)return;publish({phase:'error',document:doc,name:doc.name,bytes:doc.bytes,error:error instanceof Error?error.message:'分析失败，请重试。'})}
  },
 }
}
