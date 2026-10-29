import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/pages/CourtPage.tsx',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false,outdir:'/tmp/v22-event-page',external:['react','react/jsx-runtime','../components/*','../lib/useCourt','../lib/useDocumentImport','../hooks/useKeyboardInset','../lib/native-assistant'],loader:{'.mp3':'file','.wav':'file','.webm':'file','.m4a':'file'}}).outputFiles.find(f=>f.path.endsWith('.js')).text
function page(){
 let cursor=0,reacts=0,resets=0;const cells=[],effects=[]
 const hooks={useRef(initial){const i=cursor++;return cells[i]??={current:initial}},useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v]},useEffect(){cursor++},useLayoutEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||deps.some((v,n)=>v!==old.deps[n]))effects.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()}})}}
 const court={context:{sceneId:'kitchen'},card:{kind:'kitchen'},action:'idle',line:'',reactionNonce:1,messageNonce:1,leave(){},onActionEnd(){},reset(){resets++;this.card=undefined;this.action='idle'},react(){reacts++;this.action='think'}}
 const mod={exports:{}};new Function('require','module','exports',code)(name=>{
  if(name==='react')return hooks
  if(name.endsWith('/useCourt'))return {useCourt:()=>court}
  if(name.endsWith('/useDocumentImport'))return {useDocumentImport:()=>({state:{phase:'closed'},controller:{cancel(){}}})}
  if(name.endsWith('/useKeyboardInset'))return {useKeyboardInset:()=>0}
  if(name.endsWith('/native-assistant'))return {nativeAsrProvider:{},openAssistantSettings(){}}
  if(name.includes('/components/'))return {[name.split('/').at(-1)]:function Component(){}}
  return require(name)
 },mod,mod.exports)
 const saved=globalThis.ResizeObserver;globalThis.ResizeObserver=class{observe(){}disconnect(){}}
 const dock={offsetHeight:78},screen={clientWidth:390,clientHeight:844,style:{setProperty(){}},querySelector(){return dock}},stage={parentElement:screen,offsetTop:0,offsetLeft:0},shell={parentElement:stage,offsetWidth:304,offsetHeight:304,offsetLeft:43,offsetTop:100}
 function find(node,name){if(!node||typeof node!=='object')return;if(node.props?.className===name)return node;for(const child of [node.props?.children].flat(3)){const found=find(child,name);if(found)return found}}
 let tree;function render(){cursor=0;tree=mod.exports.CourtPage();find(tree,'character-shell').props.ref.current=shell;while(effects.length)effects.shift()();cursor=0;tree=mod.exports.CourtPage();return find(tree,'court-character-tap').props}
 return {render,court,count:()=>({reacts,resets}),dispose(){for(const c of cells)c?.cleanup?.();globalThis.ResizeObserver=saved}}
}
function pointer(){return {pointerId:1,isPrimary:true,button:0,clientX:330,clientY:40,preventDefault(){},currentTarget:{setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){}}}}
test('native pointerUp → React rerender → click returns exactly once without greeting, next home tap works',()=>{const p=page();try{
 let b=p.render(),e=pointer();b.onPointerDown(e);b.onPointerUp(e);b=p.render();assert.equal(p.court.card,undefined);b.onClick({detail:1});assert.deepEqual(p.count(),{reacts:0,resets:1});assert.equal(p.court.action,'idle')
 b.onPointerDown(e);b.onPointerUp(e);b.onClick({detail:1});assert.deepEqual(p.count(),{reacts:1,resets:1})
 }finally{p.dispose()}})
test('drag followed by native click stays fullpage; keyboard activation still returns',()=>{const p=page();try{
 let b=p.render(),e=pointer();b.onPointerDown(e);b.onPointerMove({...e,clientX:30,clientY:300});b.onPointerUp(e);b=p.render();b.onClick({detail:1});assert.equal(p.court.card.kind,'kitchen');assert.deepEqual(p.count(),{reacts:0,resets:0});b.onClick({detail:0});assert.deepEqual(p.count(),{reacts:0,resets:1})
 }finally{p.dispose()}})
