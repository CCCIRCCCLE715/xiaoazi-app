import {useEffect,useRef,useState} from 'react'
import {DOCUMENT_IMPORT_MODE} from './document-mode'
import {extractDocument} from './document-import'
import {analyzeDocument} from './document-analysis'
import {createDocumentWorkflow,type DocumentImportState} from './document-workflow'
import type {CourtState} from './useCourt'
export function useDocumentImport(court:CourtState){
 const latest=useRef(court);latest.current=court
 const [state,setState]=useState<DocumentImportState>({phase:'closed'})
 const ref=useRef<ReturnType<typeof createDocumentWorkflow>|undefined>(undefined)
 if(!ref.current)ref.current=createDocumentWorkflow({selectWorkPlan:DOCUMENT_IMPORT_MODE==='work-plan'?selection=>latest.current.openWorkTasks(selection):undefined,extract:extractDocument,analyze:analyzeDocument,onAnalyzeStart:()=>latest.current.startDocument(),present:(r,d,t)=>latest.current.presentDocument(r,d,t),failure:(e,t)=>latest.current.failDocument(e,t),cancelCurrent:()=>latest.current.reset(),change:setState})
 const controller=ref.current
 useEffect(()=>{const selected=(event:Event)=>{void controller.selectMetadata((event as CustomEvent).detail)};window.addEventListener('xiaoazi:work-file-selected',selected);return()=>window.removeEventListener('xiaoazi:work-file-selected',selected)},[controller])
 useEffect(()=>{const hide=()=>{if(document.hidden)controller.background()},pause=()=>controller.background();document.addEventListener('visibilitychange',hide);window.addEventListener('xiaoazi:pause',pause);window.addEventListener('pagehide',pause);return()=>{controller.cancel();document.removeEventListener('visibilitychange',hide);window.removeEventListener('xiaoazi:pause',pause);window.removeEventListener('pagehide',pause)}},[controller])
 return {state,controller}
}
