import {analyzeNativeDocument} from './native-assistant'
import {documentPayload,validateDocumentAnalysis} from './document-contract'
import type {ImportedDocument} from './document-extract'
export async function analyzeDocument(doc:ImportedDocument,signal:AbortSignal){
 const raw=await analyzeNativeDocument(documentPayload(doc),signal)
 if(signal.aborted)throw new Error('cancelled')
 return validateDocumentAnalysis(raw,doc)
}
