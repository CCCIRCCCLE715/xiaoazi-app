import test from 'node:test'
import assert from 'node:assert/strict'
import {persistEdicts} from '../src/app/lib/edict-storage.ts'
test('history writes confirm readback and preserve corrupt previous data on failure',()=>{let raw='bad',writes=0;const p={getItem:()=>raw,setItem(k,v){writes++;raw=v}};assert.throws(()=>persistEdicts(p,[]));assert.equal(writes,0);raw='[]';persistEdicts(p,[{id:'a'}]);assert.equal(JSON.parse(raw)[0].id,'a');assert.throws(()=>persistEdicts({getItem:()=>null,setItem(){}},[{id:'b'}]))})
