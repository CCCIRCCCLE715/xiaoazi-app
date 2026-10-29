import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {createMemorialSession,memorialKey} from '../src/app/lib/memorial-session.ts'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
const code=buildSync({entryPoints:[fileURLToPath(new URL('../src/app/components/DocumentTodoCard.tsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,external:['react','./TaskMemorialDeck']}).outputFiles[0].text
const A={sourceId:'line-1',title:'提交分镜稿',dueLabel:'今天',quote:'今天提交分镜稿',label:'第1行'},B={sourceId:'line-2',title:'带样机',dueLabel:null,quote:'带样机参加会议',label:'第2行'},C={sourceId:'line-3',title:'对画面',dueLabel:null,quote:'对画面',label:'第3行'}
const source=items=>({id:'document-sha256-v1-'+'a'.repeat(64),name:'同一文件.txt',items})
function harness(document,data=new Map()){
 let cursor=0,dirty=true,tree;const cells=[],effects=[],saved=globalThis.localStorage,port={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};globalThis.localStorage=port
 const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>{const n=typeof v==='function'?v(cells[i]):v;if(!Object.is(n,cells[i])){cells[i]=n;dirty=true}}]},useMemo(fn,deps){const i=cursor++,old=cells[i];if(!old||deps.some((v,n)=>!Object.is(v,old.deps[n])))cells[i]={deps,value:fn()};return cells[i].value},useEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||deps.some((v,n)=>!Object.is(v,old.deps[n]))){cells[i]={deps,cleanup:old?.cleanup};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn()})}}}
 const module={exports:{}};new Function('require','module','exports',code)(n=>n==='react'?{...require('react'),...hooks}:n.includes('TaskMemorialDeck')?{TaskMemorialDeck:()=>null}:require(n),module,module.exports)
 let props={card:{kind:'todo',document},onClose(){},onNotice(){}}
 function render(){let n=0;do{assert.ok(n++<30);dirty=false;cursor=0;tree=module.exports.DocumentTodoCard(props);while(effects.length)effects.shift()()}while(dirty);return tree.props}
 function find(n,p){if(!n||typeof n!=='object')return;if(p(n))return n;for(const c of [n.props?.children].flat(5)){const f=find(c,p);if(f)return f}}
 return{data,port,render,update(document){props={...props,card:{...props.card,document}};return render()},edit(id,title,dueLabel){render().onRevise(id);let p=render();find(p.editor,n=>n.type==='textarea').props.onChange({currentTarget:{value:title}});p=render();find(p.editor,n=>n.type==='input').props.onChange({currentTarget:{value:dueLabel}});render().onSave();return render()},dispose(){cells.forEach(c=>c?.cleanup?.());globalThis.localStorage=saved}}
}
test('production DocumentTodoCard keeps approvals and edited title/date/done on their original item when the same file analysis swaps order',()=>{
 const data=new Map();let h=harness(source([A,B]),data),p=h.render();const originalId=p.items[0].id,scope=p.scope
 const decisions=createMemorialSession(h.port,{key:scope,ids:p.items.map(i=>i.id)});decisions.open();assert.equal(decisions.decide(originalId,'approved').ok,true)
 p.onToggle(originalId);p=h.edit(originalId,'修改过的交稿','后天');assert.equal(p.items[0].id,originalId);assert.equal(p.items[0].done,true);h.dispose()
 h=harness(source([B,A]),data);try{p=h.render();assert.equal(p.ready,true);assert.equal(p.items[0].title,B.title,'reordering must not copy item A edits onto B');assert.equal(p.items[0].done,false);assert.equal(p.items[0].quote,B.quote);assert.equal(p.items[1].id,originalId);assert.equal(p.items[1].title,'修改过的交稿');assert.equal(p.items[1].dateLabel,'后天');assert.equal(p.items[1].done,true);assert.equal(p.items[1].quote,A.quote)
  const restored=createMemorialSession(h.port,{key:p.scope,ids:p.items.map(i=>i.id)});restored.open();assert.equal(restored.state().approved,1);assert.equal(restored.state().currentId,p.items[0].id);assert.equal(restored.state().decisions[originalId],'approved')
 }finally{h.dispose()}
})
test('same-file item additions/removals and same-mount reorder retain unrelated saved content and review history',()=>{
 const data=new Map();let h=harness(source([A,B]),data),p=h.render(),a=p.items[0].id,b=p.items[1].id;h.edit(b,'原来乙的修改','下周');p=h.render();p.onToggle(b)
 const decisions=createMemorialSession(h.port,{key:p.scope,ids:p.items.map(i=>i.id)});decisions.open();decisions.decide(a,'approved');decisions.decide(b,'declined')
 p=h.update(source([A,C]));assert.equal(p.ready,true);h.edit(a,'甲的新修改','明天');h.dispose()
 h=harness(source([B,C,A]),data);try{p=h.render();assert.equal(p.ready,true);assert.equal(p.items[0].id,b);assert.equal(p.items[0].title,'原来乙的修改');assert.equal(p.items[0].dateLabel,'下周');assert.equal(p.items[0].done,true);assert.equal(p.items[1].title,C.title);assert.equal(p.items[1].done,false);assert.equal(p.items[2].id,a);assert.equal(p.items[2].title,'甲的新修改');const s=createMemorialSession(h.port,{key:p.scope,ids:p.items.map(i=>i.id)});s.open();assert.equal(s.state().approved,1);assert.equal(s.state().declined,1);assert.equal(s.state().currentId,p.items[1].id)}finally{h.dispose()}
})
test('new item stores/scopes never import numeric-ID data and preserve every old key',()=>{
 const d=source([A,B]),data=new Map(),oldKey=`app.court.document.${d.id}`,oldScope=`document:${d.id}`
 const content=JSON.stringify({name:d.name,items:[{...A,id:0,title:'旧序号甲',done:true},{...B,id:1,title:'旧序号乙',done:true}]});const approval=JSON.stringify({version:1,scope:oldScope,decisions:{0:'approved',1:'declined'},history:['0','1']});data.set(oldKey,content);data.set(memorialKey(oldScope),approval)
 const h=harness(d,data);try{const p=h.render();assert.equal(p.items[0].title,A.title);assert.equal(p.items[0].done,false);assert.notEqual(p.scope,oldScope);p.onToggle(p.items[0].id);assert.equal(data.get(oldKey),content);assert.equal(data.get(memorialKey(oldScope)),approval);const s=createMemorialSession(h.port,{key:p.scope,ids:p.items.map(i=>i.id)});s.open();assert.equal(s.state().approved+s.state().declined,0)}finally{h.dispose()}
})
