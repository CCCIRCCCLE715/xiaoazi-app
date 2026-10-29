import {Unzip,UnzipInflate} from 'fflate'
import {XMLParser,XMLValidator} from 'fast-xml-parser'
export const DOCUMENT_LIMITS={bytes:10*1024*1024,expanded:32*1024*1024,pages:60,rows:2000,cells:20000,chars:12000,units:2000} as const
export interface DocumentUnit{sourceId:string;label:string;text:string}
export interface ImportedDocument{name:string;bytes:number;format:string;text:string;units:DocumentUnit[]}
const fail=(s:string):never=>{throw new Error(s)}
const alive=(signal?:AbortSignal)=>{if(signal?.aborted)fail('cancelled')}
function decode(b:Uint8Array){try{return new TextDecoder(b[0]===255&&b[1]===254?'utf-16le':b[0]===254&&b[1]===255?'utf-16be':'utf-8',{fatal:true}).decode(b).replace(/^\uFEFF/,'')}catch{return fail('无法识别文本编码，请另存为 UTF-8 后重试。')}}
function archive(data:Uint8Array){
 let total=0,count=0,error:Error|undefined;const names=new Set<string>();const files:Record<string,Uint8Array>={}
 const unzip=new Unzip(file=>{
  if(names.has(file.name))fail('文档路径损坏：重复条目。');names.add(file.name)
  if(++count>10000)fail('压缩包条目过多。')
  if(file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\'))fail('文档路径损坏。')
  if((file.originalSize??0)>DOCUMENT_LIMITS.expanded)fail('解压内容超过32MiB。')
  let chunks:Uint8Array[]=[],size=0
  file.ondata=(err,chunk,final)=>{if(err){error=err;return}total+=chunk.length;size+=chunk.length;if(total>DOCUMENT_LIMITS.expanded)fail('解压内容超过32MiB。');if(/\.xml$|\.rels$/.test(file.name))chunks.push(chunk);if(final&&chunks.length){const b=new Uint8Array(size);let at=0;for(const c of chunks){b.set(c,at);at+=c.length}files[file.name]=b;chunks=[]}}
  file.start()
 });unzip.register(UnzipInflate)
 try{for(let offset=0;offset<data.length;offset+=65536)unzip.push(data.subarray(offset,offset+65536),offset+65536>=data.length)}catch(e){if(e instanceof Error&&/32MiB|条目|路径/.test(e.message))throw e;fail('文档压缩包损坏，无法解析。')}
 if(error||!files['[Content_Types].xml'])fail('文档压缩包损坏，无法解析。');return files
}
function xml(files:Record<string,Uint8Array>,name:string,ordered=false){
 const b=files[name];if(!b)fail('文档XML缺失或损坏。');const text=decode(b)
 if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('文档XML包含不支持的实体。')
 // Reject invalid XML scalar references before the parser's single-pass entity decoding.
 for(const match of text.replace(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->/g,'').matchAll(/&#(x[0-9a-fA-F]+|[0-9]+);/g)){const code=match[1].startsWith('x')?Number.parseInt(match[1].slice(1),16):Number(match[1]);if(!(code===9||code===10||code===13||code>=32&&code<=0xD7FF||code>=0xE000&&code<=0xFFFD||code>=0x10000&&code<=0x10FFFF))fail('文档XML包含无效字符。')}
 if(XMLValidator.validate(text)!==true)fail('文档XML损坏。')
 try{return new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',processEntities:true,htmlEntities:true,parseTagValue:false,trimValues:false,preserveOrder:ordered}).parse(text)}catch{ return fail('文档XML损坏。') }
}
const arr=(x:any):any[]=>x===undefined?[]:Array.isArray(x)?x:[x]
function textNodes(node:any):string{
 if(node==null)return '';if(typeof node==='string'||typeof node==='number')return String(node)
 if(Array.isArray(node))return node.map(textNodes).join('')
 return Object.entries(node).filter(([key])=>!key.startsWith('@_')&&key!==':@').map(([key,v])=>key==='#text'?String(v):key==='w:tab'?'\t':key==='w:br'?'\n':textNodes(v)).join('')
}
function csv(text:string){
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted||!cell)quoted=!quoted;else fail('CSV 引号格式损坏。')}
  else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[]}}
  else cell+=c
 }
 if(quoted)fail('CSV 引号未闭合。');if(cell||row.length){row.push(cell);rows.push(row)}return rows
}
export async function extractBytes(name:string,data:Uint8Array,signal?:AbortSignal,pdfWorkerSrc?:string):Promise<ImportedDocument>{
 alive(signal);if(data.length>DOCUMENT_LIMITS.bytes)fail('文件超过10MiB，请拆分后重试。');if(!data.length)fail('文件为空。')
 const format=name.split('.').pop()?.toLowerCase()??'';if(!['txt','md','csv','pdf','docx','xlsx'].includes(format))fail('请选择 TXT/MD/CSV、文本PDF、DOCX 或 XLSX；DOC/XLS 请先转换。')
 let chars=0,rows=0,cells=0;const units:DocumentUnit[]=[]
 const add=(sourceId:string,label:string,text:string)=>{alive(signal);if(!text.trim())return;chars+=text.length;if(chars>DOCUMENT_LIMITS.chars)fail('正文超过12000字符，请拆分文件；尚未发送分析。');if(units.length>=DOCUMENT_LIMITS.units)fail('内容条目过多，请拆分。');units.push({sourceId,label,text})}
 const row=(id:string,label:string,values:string[])=>{if(++rows>DOCUMENT_LIMITS.rows)fail('表格超过2000行，请拆分。');cells+=values.length;if(cells>DOCUMENT_LIMITS.cells)fail('表格超过20000单元格，请拆分。');add(id,label,values.join(' | '))}
 try{
  if(format==='txt'||format==='md')decode(data).split(/\r?\n/).forEach((t,i)=>add(`line-${i+1}`,`第${i+1}行`,t))
  if(format==='csv')csv(decode(data)).forEach((r,i)=>row(`row-${i+1}`,`第${i+1}行`,r))
  if(format==='docx'){
   const f=archive(data),body=xml(f,'word/document.xml',true);let para=0,table=0
   function walk(nodes:any[]){for(const n of nodes??[]){if(n['w:p'])add(`paragraph-${++para}`,`第${para}段`,textNodes(n['w:p']));else if(n['w:tbl']){const t=++table;let r=0;for(const tr of n['w:tbl'])if(tr['w:tr'])row(`table-${t}-row-${++r}`,`表${t} 第${r}行`,tr['w:tr'].filter((v:any)=>v['w:tc']).map((v:any)=>textNodes(v['w:tc'])))}else for(const [k,v]of Object.entries(n))if(k!==':@'&&Array.isArray(v))walk(v)}}
   walk(body)
  }
  if(format==='xlsx'){
   const f=archive(data),wb=xml(f,'xl/workbook.xml'),rels=arr(xml(f,'xl/_rels/workbook.xml.rels')['Relationships']?.Relationship),strings=f['xl/sharedStrings.xml']?arr(xml(f,'xl/sharedStrings.xml').sst?.si).map(textNodes):[]
   const styles=f['xl/styles.xml']?xml(f,'xl/styles.xml').styleSheet:undefined
   const formats=new Map(arr(styles?.numFmts?.numFmt).map(n=>[Number(n['@_numFmtId']),String(n['@_formatCode'])]))
   const dateStyles=arr(styles?.cellXfs?.xf).map(x=>{const id=Number(x['@_numFmtId']),custom=(formats.get(id)??'').replace(/"[^"]*"|\\./g,'');return id>=14&&id<=22||id>=45&&id<=47||/[yd]/i.test(custom)&&!/[0#].*[eE]/.test(custom)})
   const date1904=String(wb.workbook?.workbookPr?.['@_date1904']??'')==='1'
   const sheets=arr(wb.workbook?.sheets?.sheet);if(!sheets.length)fail('工作簿为空或损坏。')
   for(let si=0;si<sheets.length;si++){
    const s=sheets[si],rel=rels.find(r=>r['@_Id']===s['@_r:id']);if(!rel||rel['@_TargetMode']==='External')fail('不支持外链工作表。')
    const target=String(rel['@_Target']??''),path=target.startsWith('/xl/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');if(path.includes('..'))fail('工作表路径损坏。')
    const sh=xml(f,path);for(const r of arr(sh.worksheet?.sheetData?.row)){
     const values=arr(r.c).map(c=>{const address=String(c['@_r']??'');let value=c['@_t']==='s'?strings[Number(c.v)]??'':c['@_t']==='inlineStr'?textNodes(c.is):String(c.v??'');if((c['@_t']===undefined||c['@_t']==='n')&&c.v!==undefined&&dateStyles[Number(c['@_s']??0)]&&Number.isFinite(Number(c.v))){const serial=Number(c.v),ms=(serial-(date1904?0:25569))*86400000+(date1904?Date.UTC(1904,0,1):0);if(ms>=Date.UTC(1900,0,1)&&ms<=Date.UTC(2200,0,1)){const iso=new Date(ms).toISOString();value=`${iso.slice(0,10)}${serial%1?' '+iso.slice(11,16):''}（原值 ${c.v}）`}}if(c.f!==undefined)value+='（公式缓存值，未计算）';return `${address}: ${value}`})
     row(`sheet-${si+1}-row-${r['@_r']}`,`${s['@_name']} 第${r['@_r']}行`,values)
    }
   }
  }
  if(format==='pdf'){
   const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');if(pdfWorkerSrc)pdf.GlobalWorkerOptions.workerSrc=pdfWorkerSrc
   const task=pdf.getDocument({data:data.slice(),isEvalSupported:false,useSystemFonts:true,disableFontFace:true,useWorkerFetch:!!pdfWorkerSrc,isOffscreenCanvasSupported:false,cMapUrl:pdfWorkerSrc?new URL('../pdf-cmaps/',pdfWorkerSrc).href:undefined,cMapPacked:true})
   const abort=()=>{void task.destroy()};signal?.addEventListener('abort',abort,{once:true})
   try{const doc=await task.promise;if(doc.numPages>DOCUMENT_LIMITS.pages)fail('PDF 超过60页，请拆分。');for(let i=1;i<=doc.numPages;i++){alive(signal);const page=await doc.getPage(i),content=await page.getTextContent();const text=content.items.map((v:any)=>v.str??'').join(' ');if(!text.trim())fail(`PDF 第${i}页无可提取文字，可能是扫描件；请提供完整文本PDF。`);add(`page-${i}`,`第${i}页`,text);page.cleanup()}}finally{signal?.removeEventListener('abort',abort);await task.destroy()}
  }
 }catch(e){alive(signal);if(e instanceof Error&&(/MiB|字符|行|单元格|XML|路径|条目|转换|编码|CSV|工作|页|扫描/.test(e.message)))throw e;if(e instanceof Error&&/password/i.test(e.name+' '+e.message))fail('PDF 已加密，请先解密后重试。');fail('文件损坏或无法解析，请换文件重试。')}
 if(!units.length)fail(format==='pdf'?'PDF 无可提取文字，可能是扫描件；请提供文本PDF（不支持OCR）。':'文件没有可提取正文。')
 return {name:name.slice(0,180),bytes:data.length,format,text:units.map(u=>`[${u.sourceId} ${u.label}] ${u.text}`).join('\n'),units}
}
