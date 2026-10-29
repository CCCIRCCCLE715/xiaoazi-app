import type {DocumentItem} from './document-contract'

export interface DocumentItemEdit{id:string;title:string;dueLabel:string|null;done:boolean;deleted?:boolean}
/** The tuple always comes from the original analysis, never from editable fields. */
export const documentItemId=(item:DocumentItem)=>'document-item-v2:'+JSON.stringify([item.sourceId,item.title,item.quote,item.dueLabel])
export const documentItemStoreKey=(fileId:string)=>`app.court.document.v2.${fileId}`
export const documentItemScope=(fileId:string)=>`document-items-v2:${fileId}`
function validId(id:unknown):id is string{
 if(typeof id!=='string'||!id.startsWith('document-item-v2:'))return false
 try{const v=JSON.parse(id.slice('document-item-v2:'.length));return Array.isArray(v)&&v.length===4&&typeof v[0]==='string'&&typeof v[1]==='string'&&typeof v[2]==='string'&&(v[3]===null||typeof v[3]==='string')&&documentItemId({sourceId:v[0],title:v[1],quote:v[2],dueLabel:v[3]})===id}catch{return false}
}
function validEdit(item:DocumentItemEdit){return item&&validId(item.id)&&typeof item.title==='string'&&!!item.title.trim()&&item.title.length<=80&&typeof item.done==='boolean'&&(item.deleted===undefined||typeof item.deleted==='boolean')&&(item.dueLabel===null||typeof item.dueLabel==='string'&&item.dueLabel.length<=40)}
export function readDocumentItemEdits(raw:string|null,name:string):Map<string,DocumentItemEdit>{
 if(raw===null)return new Map()
 const stored=JSON.parse(raw)
 if(!stored||stored.version!==2||stored.name!==name||!Array.isArray(stored.items)||stored.items.some((i:DocumentItemEdit)=>!validEdit(i))||new Set(stored.items.map((i:DocumentItemEdit)=>i.id)).size!==stored.items.length)throw new Error('invalid document item store')
 return new Map(stored.items.map(({id,title,dueLabel,done,deleted}:DocumentItemEdit)=>[id,{id,title,dueLabel,done,...(deleted!==undefined?{deleted}:{})}]))
}
/** Merge the current subset without removing records omitted by a later model result. */
export function encodeDocumentItemEdits(name:string,previous:Map<string,DocumentItemEdit>,next:DocumentItemEdit[]):string{
 const merged=new Map(previous)
 for(const item of next){if(!validEdit(item))throw new Error('invalid document item edit');const {id,title,dueLabel,done,deleted}=item;merged.set(id,{id,title,dueLabel,done,...(deleted!==undefined?{deleted}:{})})}
 return JSON.stringify({version:2,name,items:[...merged.values()]})
}
