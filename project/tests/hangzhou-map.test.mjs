import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)))
const data=load('../src/assets/map/hangzhou.json'),route=load('../src/assets/map/example-route.json'),raw=load('../../map-source/hangzhou-overpass.json')
test('bundled Hangzhou vector retains real West Lake and enough local roads, not random blocks',()=>{assert.ok(data.features.some(f=>f.properties.name==='西湖'&&f.geometry.type==='Polygon'));assert.ok(data.features.filter(f=>f.properties.layer==='road').length>5000);assert.deepEqual(data.bbox,[120.12,30.23,120.21,30.30]);assert.ok(data.features.some(f=>f.properties.name==='武林街道'))})
test('every demonstration route edge is adjacent on an identified downloaded OSM way',()=>{const ids=route.properties.osmNodeIds;assert.equal(ids.length,route.geometry.coordinates.length);const ways=raw.elements.filter(e=>e.type==='way'&&route.properties.osmWayIds.includes(e.id));for(let i=1;i<ids.length;i++){assert.ok(ways.some(w=>w.nodes.some((n,j)=>n===ids[i-1]&&(w.nodes[j+1]===ids[i]||w.nodes[j-1]===ids[i]))),`${ids[i-1]} → ${ids[i]}`)}assert.ok(route.properties.distanceMeters>1500);assert.ok(route.properties.distanceMeters<3000)})
test('source record matches downloaded raw and explicitly limits fixed-route claims',()=>{const p=load('../../map-provenance.json');assert.equal(p.rawSha256,createHash('sha256').update(readFileSync(new URL('../../map-source/hangzhou-overpass.json',import.meta.url))).digest('hex'));assert.equal(p.license,'ODbL-1.0');assert.match(p.route.method,/fixed demonstration only/);assert.equal(p.library.version,'1.9.4')})
