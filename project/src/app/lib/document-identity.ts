import type {ImportedDocument} from './document-extract'

/** Persistent source identity, independent of request epochs and model-generated item wording. */
export async function documentIdentity(document:ImportedDocument):Promise<string>{
 const source=JSON.stringify({version:1,name:document.name,format:document.format,text:document.text,units:document.units.map(({sourceId,label,text})=>({sourceId,label,text}))})
 if(!globalThis.crypto?.subtle)throw new Error('文件指纹生成失败，请重试。')
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))
 return 'document-sha256-v1-'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
}
