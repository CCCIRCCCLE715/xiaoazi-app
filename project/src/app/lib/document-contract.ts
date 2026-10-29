import type {ImportedDocument,DocumentUnit} from './document-extract'
export interface DocumentItem{title:string;dueLabel:string|null;sourceId:string;quote:string}
export interface DocumentAnalysis{category:'work_message'|'todo'|'schedule'|'other';items:DocumentItem[]}
function invalid():never{throw new Error('分析结果无效或缺少原文依据，请重试。')}
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const keys=(v:Record<string,unknown>,expected:string)=>Object.keys(v).sort().join(',')===expected
const instruction=/忽略.{0,12}(?:规则|指令|提示)|(?:系统|开发者)提示|system\s*:|<\/?(?:system|script)|(?:发送|泄露|输出).{0,8}(?:密钥|API.?key)|(?:执行|调用).{0,6}(?:工具|代码)/i
export function documentPayload(doc:ImportedDocument):{units:DocumentUnit[]}{
 const units=doc.units;if(!units.length||units.length>2000||units.reduce((n,u)=>n+u.text.length,0)>12000)throw new Error('正文超过分析上限，请拆分文件。')
 if(new TextEncoder().encode(JSON.stringify({units})).length>48000)throw new Error('来源标记使请求超过上限，请拆分文件；尚未发送。')
 return {units:units.map(({sourceId,label,text})=>({sourceId,label,text}))}
}
export function validateDocumentAnalysis(raw:string,doc:ImportedDocument):DocumentAnalysis{
 try{
  if(raw.length>24000)invalid();const d:unknown=JSON.parse(raw)
  if(!plain(d)||!keys(d,'category,items')||!['work_message','todo','schedule','other'].includes(d.category as string)||!Array.isArray(d.items)||d.items.length>30)invalid()
  if(d.category==='other'){if(d.items.length)invalid();return {category:'other',items:[]}}
  if(!d.items.length)invalid();const seen=new Set<string>()
  for(const it of d.items){
   if(!plain(it)||!keys(it,'dueLabel,quote,sourceId,title')||typeof it.title!=='string'||!it.title.trim()||it.title.length>80||typeof it.quote!=='string'||!it.quote.trim()||it.quote.length>500||typeof it.sourceId!=='string'||!(it.dueLabel===null||typeof it.dueLabel==='string'&&it.dueLabel.length>0&&it.dueLabel.length<=40))invalid()
   const unit=doc.units.find(u=>u.sourceId===it.sourceId)
   if(!unit||!unit.text.includes(it.quote)||!it.quote.includes(it.title)||it.dueLabel!==null&&!it.quote.includes(it.dueLabel as string)||instruction.test(it.quote))invalid()
   const id=it.sourceId+'\0'+it.title;if(seen.has(id))invalid();seen.add(id)
  }
  return d as unknown as DocumentAnalysis
 }catch{return invalid()}
}
