import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{buildSync}=createRequire(require.resolve('vite'))('esbuild')
function load(path,options={}){const result=buildSync({entryPoints:[fileURLToPath(new URL(path,import.meta.url))],bundle:true,format:'cjs',platform:'node',write:false,...options});return result.outputFiles.find(f=>f.path.endsWith('.js'))?.text??result.outputFiles[0].text}
const m={exports:{}};new Function('require','module','exports',load('../src/app/lib/composer-controller.ts'))(require,m,m.exports)
const makeComposer=()=>m.exports.createComposerController({state:'ready',id:'test',async open(){assert.fail('recovery must not open microphone')}},{async onSubmit(){assert.fail('recovery must not submit a command')}})
test('capsule recovery is visible only after failure, retries deliberately once and stale actions cannot run after edit/cancel/dispose',()=>{
 const c=makeComposer();assert.equal(c.state().notice,'');assert.equal(c.state().noticeAction,undefined)
 for(const leave of [()=>c.edit('新草稿'),()=>c.cancel(),()=>c.switchMode('text'),()=>c.dispose()]){
  c.resume();let retries=0;c.recover('voice','配音未播放，请重试。',()=>retries++);const old=c.state().noticeAction
  assert.equal(old.label,'重试播放');leave();old.run();assert.equal(retries,0)
 }
 c.resume();let retries=0;c.recover('voice','配音未播放，请重试。',()=>retries++);const retry=c.state().noticeAction.run;retry();retry();assert.equal(retries,1);assert.equal(c.state().notice,'');assert.equal(c.state().noticeAction,undefined);c.dispose()
})
test('clearing voice recovery cannot swallow a newer video error or an ASR notice',()=>{
 const c=makeComposer();c.recover('voice','配音未播放，请重试。',()=>{});c.recover('video','动作未加载，请重试。',()=>{});c.clearRecovery('voice');assert.match(c.state().notice,/动作/);c.notice('识别未成功，请重试。');c.clearRecovery('video');assert.match(c.state().notice,/识别/);assert.equal(c.state().noticeAction,undefined);c.dispose()
})
test('production capsule renders an explicit retry only on transient media error, in both input modes',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),mod={exports:{}}
 new Function('require','module','exports',load('../src/app/components/CourtComposer.tsx',{external:['react','react/jsx-runtime','lucide-react']}))(require,mod,mod.exports)
 const c=makeComposer(),render=()=>renderToStaticMarkup(React.createElement(mod.exports.CourtComposer,{controller:c,state:c.state(),onFocusChange(){}}))
 assert.doesNotMatch(render(),/重试播放/)
 for(const mode of ['voice','text']){c.switchMode(mode);c.recover('video','动作未加载，请重试。',()=>{});assert.match(render(),/动作未加载/);assert.match(render(),/aria-label="重试播放"/);c.clearRecovery('video');assert.doesNotMatch(render(),/重试播放/)}c.dispose()
})
test('production character-only page forwards stage recovery to existing capsule while keeping notice bubble and cards empty',()=>{
 let cursor=0;const cells=[],components={}
 const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=v]},useRef(initial){const i=cursor++;return cells[i]??={current:initial}},useEffect(){cursor++},useLayoutEffect(){cursor++}}
 const mod={exports:{}},court={context:{sceneId:'client-ending'},action:'idle',line:'',reactionNonce:1,messageNonce:1,leave(){},onActionEnd(){}}
 const code=load('../src/app/pages/CourtPage.tsx',{outdir:'/tmp/page-recovery',external:['react','react/jsx-runtime','../components/*','../lib/useCourt','../lib/useDocumentImport','../hooks/useKeyboardInset','../lib/native-assistant'],loader:{'.mp3':'file','.wav':'file','.webm':'file','.m4a':'file'}})
 new Function('require','module','exports',code)(name=>{
  if(name==='react')return hooks
  if(name.endsWith('/useDocumentImport'))return{useDocumentImport:()=>({state:{phase:'closed'},controller:{cancel(){}}})}
  if(name.endsWith('/useCourt'))return{useCourt:()=>court}
  if(name.endsWith('/useKeyboardInset'))return{useKeyboardInset:()=>0}
  if(name.endsWith('/native-assistant'))return{nativeAsrProvider:{},openAssistantSettings(){}}
  if(name.includes('/components/')){const key=name.split('/').at(-1);return{[key]:components[key]??=(function Component(){})}}
  return require(name)
 },mod,mod.exports)
 const render=()=>{cursor=0;return mod.exports.CourtPage()},find=(tree,type)=>{if(!tree||typeof tree!=='object')return;if(tree.type===components[type])return tree;for(const child of [tree.props?.children].flat(3)){const found=find(child,type);if(found)return found}}
 let tree=render();assert.equal(find(tree,'CourtComposer').props.state.notice,'');assert.equal(find(tree,'CourtNotice'),undefined);assert.equal(find(tree,'PresencePanel')?.props.open,false)
 const stage=find(tree,'CharacterStage');assert.equal(stage.props.hideVoiceRetry,true);let retried=0;stage.props.onRecovery('video',{message:'动作未加载，请重试。',retry:()=>retried++});tree=render();const composer=find(tree,'CourtComposer');assert.match(composer.props.state.notice,/动作未加载/);assert.equal(find(tree,'CourtNotice'),undefined);composer.props.state.noticeAction.run();assert.equal(retried,1);tree=render();assert.equal(find(tree,'CourtComposer').props.state.notice,'');find(tree,'CourtComposer').props.controller.dispose()
})
class Audio extends EventTarget{dataset={};currentTime=0;plays=0;blocked=true;load(){}pause(){}play(){this.plays++;return this.blocked?Promise.reject(new Error('NotAllowedError')):Promise.resolve()}}
function stageHarness(props){
 let handlers,requests=0,cursor=0;const cells=[],effects=[],cleanups=[],audio=new Audio()
 const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=v]},useRef(initial){const i=cursor++;return cells[i]??={current:initial}},useEffect(fn){cursor++;effects.push(fn)}}
 const code=load('../src/app/components/CharacterStage.tsx',{outdir:'/tmp/stage-media-recovery',alias:{'@':fileURLToPath(new URL('../src',import.meta.url))},external:['react','react/jsx-runtime','../lib/character-player'],loader:{'.png':'file','.webm':'file','.mp3':'file','.wav':'file','.m4a':'file'}})
 const module={exports:{}};new Function('require','module','exports',code)(name=>name==='react'?hooks:name.endsWith('/character-player')?{createCharacterPlayer(_canvas,_videos,_clips,callbacks){handlers=callbacks;return{request(){return ++requests},dispose(){}}}}:require(name),module,module.exports)
 const tree=module.exports.CharacterStage(props)
 function refs(node){if(!node||typeof node!=='object')return;if(node.props?.ref)node.props.ref.current=node.type==='audio'?audio:{dataset:{},getContext:()=>({drawImage(){}})};for(const child of [node.props?.children].flat(2))refs(child)}refs(tree)
 for(const effect of effects)cleanups.push(effect())
 return{audio,frame(key,token=requests){handlers.frame(key,token)},fail(){handlers.error('动作暂未加载，点一下重试。')},requests:()=>requests,dispose(){for(const fn of cleanups)fn?.()}}
}
test('character-only audio block reaches capsule; retry reuses one voice and is cancelled by stop',async()=>{
 const before={document:globalThis.document,window:globalThis.window,Image:globalThis.Image};globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=Object.assign(new EventTarget(),{matchMedia:()=>({matches:false})});globalThis.Image=class{decode(){return new Promise(()=>{})}}
 const c=makeComposer();let stage
 try{stage=stageHarness({action:'ending-apology',nonce:1,voiceCue:{src:'original.mp3',action:'ending-apology',id:1},hideVoiceRetry:true,onRecovery(kind,recovery){if(recovery)c.recover(kind,recovery.message,recovery.retry);else c.clearRecovery(kind)}})
  stage.frame('ending-apology');await Promise.resolve();await Promise.resolve();assert.match(c.state().notice,/配音/);assert.equal(stage.audio.plays,1)
  stage.audio.blocked=false;c.state().noticeAction.run();await Promise.resolve();assert.equal(stage.audio.plays,2);assert.equal(c.state().notice,'')
  stage.audio.dispatchEvent(new Event('error'));assert.match(c.state().notice,/配音/);const stale=c.state().noticeAction.run;window.dispatchEvent(new Event('xiaoazi:voice-stop'));stale();assert.equal(stage.audio.plays,2);assert.equal(c.state().notice,'')
 }finally{stage?.dispose();c.dispose();Object.assign(globalThis,before)}
})
test('video failure stops voice and exposes capsule retry; idle cannot hide error or start voice, fresh action frame can',async()=>{
 const before={document:globalThis.document,window:globalThis.window,Image:globalThis.Image};globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=Object.assign(new EventTarget(),{matchMedia:()=>({matches:false})});globalThis.Image=class{decode(){return new Promise(()=>{})}}
 const c=makeComposer();let stage
 try{stage=stageHarness({action:'ending-apology',nonce:1,voiceCue:{src:'original.mp3',action:'ending-apology',id:1},hideVoiceRetry:true,onRecovery(kind,recovery){if(recovery)c.recover(kind,recovery.message,recovery.retry);else c.clearRecovery(kind)}})
  stage.audio.blocked=false;stage.fail();assert.match(c.state().notice,/动作/);stage.frame('idle');assert.match(c.state().notice,/动作/);assert.equal(stage.audio.plays,0)
  const oldToken=stage.requests();c.state().noticeAction.run();assert.equal(stage.requests(),oldToken+1);stage.frame('ending-apology',oldToken);assert.equal(stage.audio.plays,0);stage.frame('ending-apology');await Promise.resolve();assert.equal(stage.audio.plays,1);assert.equal(c.state().notice,'')
  stage.fail();const stale=c.state().noticeAction.run,beforeHide=stage.requests();document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(c.state().notice,'');document.hidden=false;stale();assert.equal(stage.requests(),beforeHide)
 }finally{stage?.dispose();c.dispose();Object.assign(globalThis,before)}
})
