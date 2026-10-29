import {useEffect,useRef} from 'react'
import {FileText,FolderOpen,X,Trash2} from 'lucide-react'
import {DOCUMENT_IMPORT_MODE,WORK_PLAN_MIME} from '../lib/document-mode'
import {modelFailure,openAssistantSettings} from '../lib/native-assistant'
import type {DocumentImportState,createDocumentWorkflow} from '../lib/document-workflow'
const ACCEPT='.txt,.md,.csv,.pdf,.docx,.xlsx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export function DocumentImportPanel({state,controller}:{state:DocumentImportState;controller:ReturnType<typeof createDocumentWorkflow>}){
 const input=useRef<HTMLInputElement>(null)
 useEffect(()=>{const node=input.current;if(!node)return;const cancel=()=>controller.selectionCancelled();node.addEventListener('cancel',cancel);return()=>node.removeEventListener('cancel',cancel)},[controller])
 const doc=state.document,busy=state.phase==='reading'||state.phase==='analyzing'
 const error=state.error&&(/^[a-z_]+$/.test(state.error)?modelFailure(new Error(state.error)):state.error)
 async function chosen(file?:File){
  if(!file){controller.selectionCancelled();return}
  // SAF returns before onResume on some phones. Retain the selection and read only in foreground.
  if(document.hidden)await new Promise<void>(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve()}};document.addEventListener('visibilitychange',visible)})
  if(controller.state().phase==='selecting')void controller.select(file)
 }
 if(DOCUMENT_IMPORT_MODE==='work-plan')return <section className="imperial-card document-panel work-file-panel" aria-label="工作文件">
  <div className="card-grabber" aria-hidden/>
  <header className="document-heading"><FileText size={20}/><h2>工作文件</h2><button type="button" aria-label="关闭工作文件" onClick={()=>controller.cancel()}><X size={20}/></button></header>
  <input ref={input} className="document-file-input" type="file" accept={DOCUMENT_IMPORT_MODE==='work-plan'?ACCEPT+','+WORK_PLAN_MIME:ACCEPT} onChange={e=>void chosen(e.currentTarget.files?.[0])}/>
  <div className="document-scroll scroll-y"><p>选择工作文件，打开今日工作安排。</p><p className="work-file-formats">PDF · Word · Excel · TXT</p>{state.phase==='selecting'&&<p role="status">等待选择文件…</p>}</div>
  <footer className="document-actions"><button type="button" onClick={()=>{input.current!.value='';controller.choosing();input.current!.click()}}><FolderOpen size={18}/>选择文件</button></footer>
 </section>
 return <section className="imperial-card document-panel" aria-label="文件呈奏">
  <div className="card-grabber" aria-hidden/>
  <header className="document-heading"><FileText size={20}/><h2>文件呈奏</h2><button type="button" aria-label="关闭文件呈奏" onClick={()=>controller.cancel()}><X size={20}/></button></header>
  <input ref={input} className="document-file-input" type="file" accept={ACCEPT} onChange={e=>void chosen(e.currentTarget.files?.[0])}/>
  <div className="document-scroll scroll-y">
   {state.name?<p className="document-file-meta"><strong>{state.name}</strong><span>{((state.bytes??0)/1024).toFixed(1)} KiB{doc?` · ${doc.format.toUpperCase()}`:''}</span></p>:<p>TXT / MD / CSV / 文本PDF / DOCX / XLSX<br/>DOC、XLS 请先转换；扫描件不支持。</p>}
   <p className="document-limits">10MiB · 60页 · 2000行 / 20000单元格 · 正文12000字符</p>
   {busy&&<p role="status" aria-live="polite">{state.phase==='reading'?'正在本机提取正文…':'正在分析，请稍候…'}</p>}
   {state.phase==='selecting'&&<p role="status">等待选择文件…</p>}
   {error&&<p className="todo-error" role="alert">{error}</p>}
   {doc&&<><p className="document-consent">点“分析并呈奏”后，以下正文和出处会发送给设置中的模型服务。原文件不上传。</p><pre className="document-preview" tabIndex={0} aria-label="即将发送的完整提取正文">{doc.text}</pre></>}
  </div>
  <footer className="document-actions">
   <button type="button" onClick={()=>{input.current!.value='';controller.choosing();input.current!.click()}} disabled={busy}><FolderOpen size={18}/>{state.name?'换文件':'选择文件'}</button>
   {state.name&&<button type="button" aria-label="移除文件" onClick={()=>controller.cancel()}><Trash2 size={18}/></button>}
   {busy?<button type="button" onClick={()=>controller.cancel()}>取消</button>:doc?<button type="button" className="document-analyze" onClick={()=>void controller.analyze()}>分析并呈奏</button>:state.phase==='error'?<button type="button" onClick={()=>void controller.retryRead()}>重试读取</button>:null}
   {state.error==='unconfigured'&&<button type="button" onClick={()=>void openAssistantSettings().catch(()=>{})}>模型设置</button>}
  </footer>
 </section>
}
