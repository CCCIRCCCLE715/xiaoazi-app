import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {extractBytes} from '../src/app/lib/document-extract.ts'
const load=n=>new Uint8Array(readFileSync(new URL('./fixtures/documents/generated/'+n,import.meta.url)))
test('openpyxl Chinese decimal and hexadecimal XML entities decode once without losing literal references',async()=>{
 for(const name of ['chinese-numeric-dates.xlsx','hex-entities.xlsx']){
  const d=await extractBytes(name,load(name));assert.match(d.text,/日期/);assert.match(d.text,/提交新版分镜，带样机/);assert.match(d.text,/生活安排/);assert.match(d.text,/& 日 &#26085; 😀/)
 }
})
test('openpyxl explicit numeric cell dates retain ISO calendar date and raw serial in both epochs',async()=>{
 for(const name of ['chinese-numeric-dates.xlsx','chinese-1904-dates.xlsx']){
  const d=await extractBytes(name,load(name));assert.match(d.units.find(u=>u.sourceId==='sheet-1-row-2').text,/A2: 2026-10-25（原值 \d+）/)
  assert.match(d.units.find(u=>u.sourceId==='sheet-1-row-3').text,/A3: 2026-10-26 16:30（原值 [\d.]+）/)
  assert.match(d.units.find(u=>u.sourceId==='sheet-1-row-4').text,/A4: 46320(?: \||$)/)
  assert.doesNotMatch(d.units.find(u=>u.sourceId==='sheet-1-row-5').text,/1899-|1900-/)
 }
})
test('invalid XML surrogate or out-of-range numeric reference rejects without interpretation',async()=>{
 for(const name of ['invalid-scalar.xlsx','invalid-range.xlsx'])await assert.rejects(extractBytes(name,load(name)),/XML/)
})
