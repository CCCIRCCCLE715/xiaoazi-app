import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
function load(path){const code=buildSync({entryPoints:[fileURLToPath(new URL(path,import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false}).outputFiles[0].text;const m={exports:{}};new Function('require','module','exports',code)(require,m,m.exports);return m.exports}
const {createComposerController}=load('../src/app/lib/composer-controller.ts')
const {createHiddenSettingsController}=load('../src/app/lib/hidden-settings.ts')
function setup(submit=async()=>{}){let events,opens=0,starts=0,stops=0,before=0;const sent=[];const provider={state:'ready',id:'test',async open(id,e){opens++;events=e;return {sessionId:id,async start(){starts++},async stop(){stops++},cancel(){},dispose(){}}}};const c=createComposerController(provider,{onSubmit:async text=>{sent.push(text);await submit(text)},onBeforeListen(){before++}});return {c,sent,get events(){return events},counts:()=>({opens,starts,stops,before})}}
test('text/voice switches retain the draft and never auto-record; IME composition and post-composition Enter cannot submit',async()=>{const h=setup();h.c.switchMode('text');h.c.edit('用膳');h.c.compositionStart();await h.c.enter({key:'Enter',shiftKey:false,isComposing:true});await h.c.submit();assert.deepEqual(h.sent,[]);h.c.compositionEnd();await h.c.enter({key:'Enter',shiftKey:false,isComposing:false});assert.deepEqual(h.sent,[]);h.c.switchMode('voice');assert.equal(h.c.state().draft,'用膳');assert.equal(h.counts().opens,0);h.c.dispose()})
test('IME sends once after guard; successful send returns voice; edits made during pending send are preserved',async t=>{t.mock.timers.enable({apis:['Date']});let finish;const h=setup(()=>new Promise(r=>finish=r));h.c.switchMode('text');h.c.edit('摆驾');h.c.compositionEnd();t.mock.timers.tick(121);const p=h.c.enter({key:'Enter',shiftKey:false,isComposing:false});await h.c.enter({key:'Enter',shiftKey:false,isComposing:false});assert.equal(h.sent.length,1);h.c.edit('新草稿');finish();await p;assert.equal(h.c.state().draft,'新草稿');assert.equal(h.c.state().mode,'text');h.c.dispose()})
test('failed submit preserves editable text and permits retry; cancelled in-flight submit cannot clear a new draft',async()=>{let fail=true;const h=setup(async()=>{if(fail)throw new Error('offline')});h.c.edit('好诗');await h.c.submit();assert.equal(h.c.state().draft,'好诗');assert.match(h.c.state().notice,/重试/);fail=false;await h.c.submit();assert.equal(h.c.state().mode,'voice');h.c.dispose();let done;const j=setup(()=>new Promise(r=>done=r));j.c.edit('旧');const p=j.c.submit();j.c.cancel();j.c.edit('新');done();await p;assert.equal(j.c.state().draft,'新');j.c.dispose()})
test('hidden settings requires two distinct activations; timeout/outside hide reset it; dispose clears timer',t=>{t.mock.timers.enable({apis:['setTimeout']});let opens=0;const c=createHiddenSettingsController({onOpen(){opens++}});assert.equal(c.visible(),false);c.activate();assert.equal(c.visible(),true);assert.equal(opens,0);t.mock.timers.tick(4999);assert.equal(c.visible(),true);t.mock.timers.tick(1);assert.equal(c.visible(),false);c.activate();c.activate();assert.equal(opens,1);assert.equal(c.visible(),false);c.activate();c.hide();c.activate();assert.equal(opens,1);c.dispose();t.mock.timers.tick(6000);assert.equal(c.visible(),false)})


test('production composer markup has no Send control: hold voice and text modes keep only the requested actions',()=>{
 const {renderToStaticMarkup}=require('react-dom/server'),React=require('react')
 const code=buildSync({stdin:{contents:"export {CourtComposer} from './src/app/components/CourtComposer';export {HiddenSettings} from './src/app/components/HiddenSettings'",resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'tsx'},bundle:true,format:'cjs',platform:'node',write:false,external:['react','react/jsx-runtime','lucide-react']}).outputFiles[0].text
 const m={exports:{}};new Function('require','module','exports',code)(require,m,m.exports)
 const h=setup(),render=()=>renderToStaticMarkup(React.createElement(m.exports.CourtComposer,{controller:h.c,state:h.c.state(),onFocusChange(){}}))
 let html=render();assert.match(html,/按住说话/);assert.match(html,/切换键盘输入/);assert.doesNotMatch(html,/<input|type="submit"|lucide-send|设置/)
 h.c.edit('今天吃什么');html=render();assert.match(html,/文字草稿/);assert.doesNotMatch(html,/确认传旨/);h.c.switchMode('text');html=render();assert.match(html,/enterKeyHint="send"/);assert.match(html,/返回语音输入/);assert.doesNotMatch(html,/type="submit"|lucide-send/)
 const settings=renderToStaticMarkup(React.createElement(m.exports.HiddenSettings,{onOpen(){assert.fail('render must not open')}}));assert.match(settings,/data-visible="false"/);assert.match(settings,/显示模型与语音设置/);h.c.dispose()
})

function componentHarness(name){
 const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/components/'+name+'.tsx',import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false,external:['react','react/jsx-runtime','lucide-react']}).outputFiles[0].text
 const cells=[],effects=[];let cursor=0
 const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return [cells[i],value=>cells[i]=typeof value==='function'?value(cells[i]):value]},useRef(initial){const i=cursor++;return cells[i]??={current:initial}},useEffect(fn){cursor++;effects.push(fn)}}
 const m={exports:{}};new Function('require','module','exports',code)(n=>n==='react'?hooks:require(n),m,m.exports)
 return {render(props){cursor=0;effects.length=0;return m.exports[name](props)},effects:()=>effects.map(fn=>fn()),cells}
}
function findElement(tree,predicate){if(!tree||typeof tree!=='object')return; if(predicate(tree))return tree;const children=tree.props?.children;for(const child of Array.isArray(children)?children:[children]){if(Array.isArray(child)){for(const c of child){const found=findElement(c,predicate);if(found)return found}}else{const found=findElement(child,predicate);if(found)return found}}}
test('production text key handlers preserve IME selection, block Shift+Enter implicit submission, and accept explicit Enter once',async()=>{
 const h=setup(),ui=componentHarness('CourtComposer');h.c.switchMode('text');h.c.edit('用膳');let input=findElement(ui.render({controller:h.c,state:h.c.state(),onFocusChange(){}}),e=>e.type==='input');let prevented=0
 const event=(shift=false,composing=false)=>({key:'Enter',shiftKey:shift,nativeEvent:{isComposing:composing},preventDefault(){prevented++}})
 input.props.onCompositionStart();input.props.onKeyDown(event(false,true));assert.equal(prevented,0,'IME candidate selection must keep its default behavior');assert.deepEqual(h.sent,[])
 h.c.switchMode('text');input.props.onKeyDown(event(true));assert.equal(prevented,1);assert.deepEqual(h.sent,[])
 input.props.onKeyDown(event());await Promise.resolve();assert.equal(prevented,2);assert.deepEqual(h.sent,['用膳']);h.c.dispose()
})
test('production hidden hotspot handles one click once, keyboard repeat, outside dismissal, blur and unmount',()=>{
 const previousDocument=globalThis.document,previousWindow=globalThis.window;globalThis.document=new EventTarget();globalThis.window=new EventTarget()
 try{let opens=0;const ui=componentHarness('HiddenSettings'),props={onOpen(){opens++}};let tree=ui.render(props);const cleanup=ui.effects();tree.props.onClick({detail:1});tree=ui.render(props);assert.equal(tree.props['data-visible'],true);assert.equal(opens,0)
  let prevented=false;tree.props.onKeyDown({key:'Enter',repeat:true,preventDefault(){prevented=true}});assert.equal(prevented,true);tree.props.onClick({detail:0});assert.equal(opens,1)
  tree.props.onClick({detail:1});document.dispatchEvent(new Event('pointerdown'));tree=ui.render(props);assert.equal(tree.props['data-visible'],false);tree.props.onClick({detail:1});assert.equal(opens,1);tree.props.onBlur();tree=ui.render(props);assert.equal(tree.props['data-visible'],false);for(const fn of cleanup)fn?.()
 }finally{globalThis.document=previousDocument;globalThis.window=previousWindow}
})
test('production hold pointer capture isolates fingers, sliding cancels, lost capture cancels and normal release submits once',async t=>{
 t.mock.timers.enable({apis:['Date']});const h=setup(),ui=componentHarness('CourtComposer'),props=()=>({controller:h.c,state:h.c.state(),onFocusChange(){},onAttach(){}})
 const button=()=>findElement(ui.render(props()),e=>e.props?.className==='composer-voice');const captured=new Set();const target={setPointerCapture(id){captured.add(id)},hasPointerCapture:id=>captured.has(id),releasePointerCapture(id){captured.delete(id)}}
 const ev=(id=1,x=100,y=100)=>({pointerId:id,button:0,isPrimary:id===1,clientX:x,clientY:y,currentTarget:target,preventDefault(){}})
 let b=button();b.props.onPointerDown(ev());await Promise.resolve();await Promise.resolve();assert.equal(h.counts().starts,1);assert.equal(h.c.state().holding,true);b.props.onPointerDown(ev(2));assert.equal(h.counts().opens,1);t.mock.timers.tick(600);b.props.onPointerUp(ev());assert.equal(captured.size,0);b.props.onLostPointerCapture(ev());h.events.onFinal('摆驾');await Promise.resolve();assert.deepEqual(h.sent,['摆驾'])
 await Promise.resolve();b=button();b.props.onPointerDown(ev());await Promise.resolve();await Promise.resolve();const old=h.events;b.props.onPointerMove(ev(1,100,40));old.onFinal('取消');b.props.onPointerUp(ev());assert.deepEqual(h.sent,['摆驾']);assert.equal(h.c.state().holding,false)
 b=button();b.props.onPointerDown(ev());await Promise.resolve();await Promise.resolve();b.props.onLostPointerCapture(ev());h.events.onFinal('旧');assert.equal(h.sent.length,1);h.c.dispose()
})
test('hold keyboard Space down/up is accessible, ignores repeat, blur/Escape cancels, no click handler starts recording',async t=>{
 t.mock.timers.enable({apis:['Date']});const h=setup(),ui=componentHarness('CourtComposer'),get=()=>findElement(ui.render({controller:h.c,state:h.c.state(),onFocusChange(){}}),e=>e.props?.className==='composer-voice'),key=(repeat=false)=>({key:' ',repeat,preventDefault(){}})
 let b=get();assert.equal(b.props.onClick,undefined);b.props.onKeyDown(key());b.props.onKeyDown(key(true));await Promise.resolve();await Promise.resolve();assert.equal(h.counts().starts,1);t.mock.timers.tick(500);b.props.onKeyUp(key());h.events.onFinal('好诗');await Promise.resolve();assert.deepEqual(h.sent,['好诗']);await Promise.resolve();b=get();b.props.onKeyDown(key());await Promise.resolve();await Promise.resolve();b.props.onBlur();h.events.onFinal('旧');assert.equal(h.sent.length,1);h.c.dispose()
})
test('window blur cancels the production gesture ref too, allowing a clean new press without a stale pointerup',async()=>{
 const doc=globalThis.document,win=globalThis.window;globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=new EventTarget()
 const h=setup(),ui=componentHarness('CourtComposer'),props={controller:h.c,state:h.c.state(),onFocusChange(){}}
 try{const tree=ui.render(props),cleanup=ui.effects(),b=findElement(tree,e=>e.props?.className==='composer-voice'),target={setPointerCapture(){},hasPointerCapture(){return false}},ev={pointerId:4,button:0,isPrimary:true,clientX:0,clientY:0,currentTarget:target,preventDefault(){}};b.props.onPointerDown(ev);await Promise.resolve();await Promise.resolve();window.dispatchEvent(new Event('blur'));h.events.onFinal('旧结果');assert.deepEqual(h.sent,[]);b.props.onPointerDown({...ev,pointerId:8});await Promise.resolve();await Promise.resolve();assert.equal(h.counts().starts,2);b.props.onPointerCancel({...ev,pointerId:8});for(const fn of cleanup)fn?.();h.c.dispose()}finally{globalThis.document=doc;globalThis.window=win}
})
