import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
function nodes(t){return !t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)]}
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/components/CouponsCard.tsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/coupons-card-test',loader:{'.svg':'file'},external:['react','../lib/native-assistant']}).outputFiles.find(f=>f.path.endsWith('.js')).text
function setup(open){
 const cells=[],effects=[];let cursor=0;const hooks={useState(v){const i=cursor++;if(!(i in cells))cells[i]=v;return[cells[i],v=>cells[i]=v]},useRef(v){const i=cursor++;return cells[i]??={current:v}},useEffect(fn){if(!cells[cursor++]){cells[cursor-1]=true;effects.push(fn)}}}
 globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=new EventTarget()
 const m={exports:{}};new Function('require','module','exports',code)(n=>n==='react'?{...require('react'),...hooks}:n.includes('native-assistant')?{openAlipay:open,alipayFailure:e=>e.message}:require(n),m,m.exports)
 let tree;const cleanup=[];return{render(){cursor=0;tree=m.exports.CouponsCard({onClose(){}});effects.splice(0).forEach(f=>cleanup.push(f()));return nodes(tree)},close(){cleanup.forEach(f=>f?.());delete globalThis.window;delete globalThis.document}}
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()}
test('five merchant groups show one or two complete demo offers after store information, with honest provenance',()=>{
 const h=setup(async()=>{});try{const n=h.render();assert.equal(n.find(x=>x.props['data-card']==='coupons').props['data-mode'],'demo');for(const brand of ['瑞幸咖啡','华莱士·全鸡汉堡','阿祥嫂隆江猪脚饭','肯德基宅急送','大米先生新鲜现炒']){const article=n.find(x=>x.type==='article'&&x.props['aria-label'].startsWith(brand));const c=nodes(article);assert.ok(c.findIndex(x=>x.type==='h3')<c.findIndex(x=>x.type==='button'));assert.ok(c.findIndex(x=>x.props.className==='coupon-shop-meta')<c.findIndex(x=>x.props.className==='coupon-offers'));const offers=c.filter(x=>x.props.className==='coupon-offer');assert.ok(offers.length>=1&&offers.length<=2,brand)}const t=JSON.stringify(n);for(const copy of ['满30减5','满50减8','满20减3','3元无门槛','具体优惠以平台实际展示为准','评分与距离仅作展示'])assert.ok(t.includes(copy),copy);assert.doesNotMatch(t,/尚未取得可用券|待核实|Logo待取得|评分未取得|距你|已领券|已核销/);assert.equal(n.filter(x=>x.type==='article').length,5);assert.equal(n.filter(x=>x.type==='img').length,4);assert.equal(n.filter(x=>x.props.className==='coupon-store-mark').length,1);const actions=n.filter(x=>x.type==='button'&&x.props.className==='coupon-use');assert.equal(actions.length,9);assert.equal(new Set(actions.map(x=>x.props['aria-label'])).size,9)}finally{h.close()}
})
test('rapid coupon taps launch once, acknowledgement retains page, resume allows a new deliberate open',async()=>{
 let calls=0,resolve;const h=setup(()=>{calls++;return new Promise(r=>resolve=r)});try{let n=h.render();const tap=n.find(x=>x.props.className==='coupon-use').props.onClick;tap();tap();assert.equal(calls,1);n=h.render();assert.ok(n.filter(x=>x.props.className==='coupon-use').every(x=>x.props.disabled));resolve();await flush();n=h.render();assert.ok(n.some(x=>x.props['data-card']==='coupons'));assert.ok(n.filter(x=>x.props.className==='coupon-use').every(x=>x.props.disabled&&x.props.children==='已请求'));window.dispatchEvent(new Event('focus'));n=h.render();n.find(x=>x.props.className==='coupon-use').props.onClick();assert.equal(calls,2);resolve();await flush()}finally{h.close()}
})
test('missing installed app stays on coupon page and permits retry without claiming redemption',async()=>{
 const h=setup(async()=>{throw Error('未安装支付宝')});try{h.render().find(x=>x.props.className==='coupon-use').props.onClick();await flush();const n=h.render();assert.ok(n.filter(x=>x.props.className==='coupon-use').every(x=>!x.props.disabled));assert.equal(n.find(x=>x.props.role==='status').props.children,'未安装支付宝')}finally{h.close()}
})
