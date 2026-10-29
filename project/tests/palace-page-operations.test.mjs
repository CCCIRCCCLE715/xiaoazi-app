import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()}
function nodes(t){return !t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)]}
function setup(name,native=async()=>({alarms:[],exactAlarm:true,notifications:true}),params=''){
 const old={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage},data=new Map();let readFails=false,writeFails=false
 globalThis.window=new EventTarget();globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.localStorage={getItem(k){if(readFails)throw Error();return data.get(k)??null},setItem(k,v){if(writeFails)throw Error();data.set(k,v)},key:i=>[...data.keys()][i]??null,get length(){return data.size}}
 const cells=[],effects=[];let cursor=0;const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
 const hooks={useState(v){const i=cursor++;if(!(i in cells))cells[i]=typeof v==='function'?v():v;return[cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v]},useRef(v){const i=cursor++;return cells[i]??={current:v}},useEffect(fn,deps){const i=cursor++;if(!same(cells[i]?.deps,deps))effects.push(()=>{cells[i]?.cleanup?.();cells[i]={deps,cleanup:fn()}})}}
 const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/pages/'+name+'.tsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,outdir:'/tmp/alarm-page-test',loader:{'.wav':'file'},alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},external:['lucide-react','react','react/jsx-runtime','react-router-dom','../components/PalaceDialog','../components/PalacePage','../components/CharacterStage','../components/CharacterShadow','../lib/native-assistant']}).outputFiles.find(f=>f.path.endsWith('.js')).text
 const routes=[];const m={exports:{}};new Function('require','module','exports',code)(n=>n==='react'?hooks:n==='react-router-dom'?{useNavigate:()=>path=>routes.push(path),useSearchParams:()=>[new URLSearchParams(params)],Link:'a'}:n.includes('native-assistant')?{nativeRequest:native,hasNativeAssistant:()=>true}:n.includes('../components/')?new Proxy({},{get:(_,k)=>k}):require(n),m,m.exports)
 let tree;const h={routes,render(){cursor=0;tree=m.exports[name]();effects.splice(0).forEach(fn=>fn());return h},find:f=>nodes(tree).find(f),button:t=>nodes(tree).find(e=>e.type==='button'&&e.props.children===t),text:()=>JSON.stringify(tree),failRead:v=>readFails=v,failWrite:v=>writeFails=v,close(){cells.forEach(c=>c?.cleanup?.());Object.assign(globalThis,old)}};return h.render()
}
const click=(h,t)=>{const b=h.button(t);assert.ok(b,'button '+t);return b.props.onClick()}
const input=(h,type,v)=>h.find(e=>e.type==='input'&&e.props.type===type).props.onChange({target:{value:v}})
const submit=h=>h.find(e=>e.type==='form').props.onSubmit({preventDefault(){}})
test('calendar production CRUD preserves failed input and delete confirmation, read failure can retry',()=>{
 const h=setup('CalendarPage');try{
 click(h,'添一件事');h.render();h.find(e=>e.type==='input'&&e.props.maxLength===80).props.onChange({target:{value:'写脚本'}});input(h,'time','09:00');h.render();h.failWrite(true);submit(h);h.render();assert.ok(h.find(e=>e.props?.label==='编辑日程'));assert.match(h.text(),/更改未保存/)
 h.failWrite(false);submit(h);h.render();assert.equal(h.find(e=>e.props?.label==='编辑日程'),undefined);assert.match(h.text(),/写脚本/);h.find(e=>e.type==='input'&&e.props.type==='checkbox').props.onChange();h.render();assert.equal(h.find(e=>e.type==='input'&&e.props.type==='checkbox').props.checked,true)
 click(h,'编辑');h.render();h.find(e=>e.type==='input'&&e.props.maxLength===80).props.onChange({target:{value:'拍摄'}});h.render();submit(h);h.render();assert.match(h.text(),/拍摄/);click(h,'删除');h.render();h.failWrite(true);click(h,'确认删除');h.render();assert.ok(h.find(e=>e.props?.label==='删除日程'));h.failWrite(false);click(h,'确认删除');h.render();assert.match(h.text(),/这一天暂无日程/)
 h.failRead(true);window.dispatchEvent(new Event('storage'));h.render();assert.match(h.text(),/本地记录无法读取/);h.failRead(false);click(h,'重试');h.render();assert.equal(h.find(e=>e.props?.role==='alert'),undefined)
 }finally{h.close()}
})
test('memories production CRUD preserves failed input and confirmation, deletion cancellation leaves records',()=>{
 const h=setup('MemoriesPage');try{
 click(h,'添一条记忆');h.render();h.find(e=>e.type==='textarea').props.onChange({target:{value:'不吃香菜'}});h.render();h.failWrite(true);click(h,'保存');h.render();assert.ok(h.find(e=>e.props?.label==='编辑记忆'));assert.match(h.text(),/记忆未保存/);h.failWrite(false);click(h,'保存');h.render();assert.equal(h.find(e=>e.props?.label==='编辑记忆'),undefined)
 click(h,'编辑');h.render();h.find(e=>e.type==='textarea').props.onChange({target:{value:'少放辣椒'}});h.render();click(h,'保存');h.render();assert.match(h.text(),/少放辣椒/);click(h,'删除');h.render();click(h,'保留');h.render();assert.match(h.text(),/少放辣椒/);click(h,'删除');h.render();h.failWrite(true);click(h,'确认删除');h.render();assert.ok(h.find(e=>e.props?.label==='确认删除记忆'));h.failWrite(false);click(h,'确认删除');h.render();assert.match(h.text(),/尚无记忆/)
 h.failRead(true);click(h,'添一条记忆');h.render();h.find(e=>e.type==='textarea').props.onChange({target:{value:'新偏好'}});h.render();click(h,'保存');h.render();assert.match(h.text(),/记忆暂时无法读取/);assert.equal(h.find(e=>e.type==='textarea').props.value,'新偏好')
 }finally{h.close()}
})
