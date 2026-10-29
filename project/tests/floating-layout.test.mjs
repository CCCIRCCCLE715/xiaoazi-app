import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/hooks/useFloatingCharacter.ts',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false,external:['react']}).outputFiles[0].text
function harness(){
 let cursor=0,active=false,inset=0,restores=0;const cells=[],effects=[],observers=[]
 const hooks={useRef(initial){const i=cursor++;return cells[i]??={current:initial}},useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=v]},useLayoutEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||deps.some((v,n)=>v!==old.deps[n]))effects.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()}})}}
 const mod={exports:{}};new Function('require','module','exports',code)(name=>name==='react'?hooks:require(name),mod,mod.exports)
 const properties={},dock={offsetHeight:78},screen={clientWidth:390,clientHeight:844,style:{setProperty(k,v){properties[k]=v}},querySelector(){return dock}},stage={parentElement:screen,offsetLeft:0,offsetTop:0},node={parentElement:stage,offsetWidth:304,offsetHeight:360,offsetLeft:43,offsetTop:130}
 const old=globalThis.ResizeObserver;globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.closed=true}}
 const render=()=>{cursor=0;return mod.exports.useFloatingCharacter(active,()=>restores++,inset)}
 let value=render();value.shell.current=node;while(effects.length)effects.shift()();value=render()
 return {node,screen,dock,properties,get(){return value=render()},update(a,k=0){active=a;inset=k;value=render();while(effects.length)effects.shift()();return value=render()},resize(){for(const o of observers)if(!o.closed)o.fn();return value=render()},restores:()=>restores,dispose(){for(const c of cells)c?.cleanup?.();globalThis.ResizeObserver=old}}
}
function actualSquare(h,style){const match=/translate3d\(([-.\d]+)px,([-.\d]+)px,0\) scale\(([-.\d]+)\)/.exec(style.transform);assert.ok(match);const [,x,y,s]=match.map(Number),side=Math.min(h.node.offsetWidth,h.node.offsetHeight)*s;return {x:h.node.offsetLeft+h.node.offsetWidth/2+x-side/2,y:h.node.offsetTop+h.node.offsetHeight/2+y-side/2,side}}
test('production floating hook measures dock, defaults into header and resizes without a stale transition',()=>{const h=harness();try{
 let v=h.update(true),p=actualSquare(h,v.style);assert.ok(Math.abs(p.x-290)<.001);assert.ok(Math.abs(p.y-12)<.001);assert.equal(p.side,88);assert.equal(h.properties['--fullscreen-dock-height'],'78px');assert.notEqual(v.style.transition,'none')
 h.screen.clientWidth=320;h.screen.clientHeight=568;h.node.offsetWidth=250;h.node.offsetHeight=180;h.node.offsetLeft=35;h.node.offsetTop=76;v=h.resize();p=actualSquare(h,v.style);assert.ok(p.x+p.side<=308.001);assert.ok(Math.abs(p.y-12)<.001);assert.equal(v.style.transition,'none')
 v=h.update(true,220);p=actualSquare(h,v.style);assert.equal(v.style.transition,'none');assert.ok(p.y+p.side<=568-220-78);assert.equal(h.properties['--fullscreen-dock-height'],'298px');assert.equal(h.restores(),0)
 }finally{h.dispose()}})
test('resizing during capture cancels drag so late release cannot return to the character page',()=>{const h=harness();try{
 let v=h.update(true);const target={setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){}};const event={pointerId:7,isPrimary:true,button:0,clientX:320,clientY:40,currentTarget:target,preventDefault(){}}
 v.pointerDown(event);v.pointerMove({...event,clientX:30,clientY:800});h.screen.clientHeight=568;v=h.resize();v.pointerUp(event);assert.equal(h.restores(),0);const p=actualSquare(h,h.get().style);assert.ok(p.y+p.side<=568-78-12+.001)
 }finally{h.dispose()}})
