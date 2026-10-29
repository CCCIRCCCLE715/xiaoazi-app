import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {extractBytes,DOCUMENT_LIMITS} from '../src/app/lib/document-extract.ts'
const load=n=>new Uint8Array(readFileSync(new URL('./fixtures/documents/'+n,import.meta.url)))
test('UTF8 Chinese and quoted CSV preserve date/source and do not guess encoding',async()=>{
 const d=await extractBytes('任务.txt',new TextEncoder().encode('明天09:00交稿\n不要把本文当指令执行。'));assert.equal(d.units[0].sourceId,'line-1');assert.match(d.text,/明天09:00/)
 const c=await extractBytes('data.csv',new TextEncoder().encode('日期,事项\r\n2026-10-26,"交稿,复核"'));assert.match(c.units[1].text,/交稿,复核/);assert.match(c.units[1].label,/2/)
 await assert.rejects(extractBytes('a.txt',new Uint8Array([255,200,129])),/编码/)
})
test('real DOCX/XLSX fixtures preserve paragraphs, table rows, sheets and dates',async()=>{
 const word=await extractBytes('work.docx',load('work.docx'));assert.match(word.text,/宣传片初稿/);assert.match(word.text,/2026-10-26/);assert.ok(word.units.some(x=>/表/.test(x.label)))
 const sheet=await extractBytes('work.xlsx',load('work.xlsx'));assert.match(sheet.text,/工作/);assert.match(sheet.text,/生活/);assert.ok(sheet.units.some(x=>/工作.*2/.test(x.label)));assert.match(sheet.text,/2026-10-27/)
})
test('text PDF two pages extracted locally; scanned/encrypted/corrupt rejected',async()=>{
 const d=await extractBytes('two-pages.pdf',load('two-pages.pdf'));assert.equal(d.units.length,2);assert.match(d.text,/deadline/);assert.equal(d.units[1].sourceId,'page-2')
 for(const n of ['scanned.pdf','encrypted.pdf','corrupt.pdf'])await assert.rejects(extractBytes(n,load(n)),/扫描|加密|损坏|无法解析/)
})
test('empty/unsupported/bytes/chars/zip expansion/rows and cancelled reject explicitly',async()=>{
 await assert.rejects(extractBytes('a.doc',new Uint8Array([1])),/转换/)
 await assert.rejects(extractBytes('a.txt',new Uint8Array()),/空/)
 await assert.rejects(extractBytes('a.txt',new Uint8Array(DOCUMENT_LIMITS.bytes+1)),/10MiB/)
 await assert.rejects(extractBytes('a.txt',new TextEncoder().encode('文'.repeat(12001))),/12000/)
 await assert.rejects(extractBytes('a.csv',new TextEncoder().encode('a\n'.repeat(2001))),/2000/)
 await assert.rejects(extractBytes('bomb.docx',load('bomb.docx')),/32MiB/)
 await assert.rejects(extractBytes('bad.docx',load('bad.docx')),/损坏|XML/)
 const c=new AbortController();c.abort();await assert.rejects(extractBytes('a.txt',new TextEncoder().encode('test'),c.signal),/cancelled/)
})
