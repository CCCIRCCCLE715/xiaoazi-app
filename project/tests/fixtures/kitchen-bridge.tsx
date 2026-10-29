// Test-only native boundary; never imported by the application or production build.
import {StrictMode,useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useCourt} from '../../src/app/lib/useCourt'
const launches:Array<{merchantId?:string}>=[]
window.XiaoaziNative={postMessage(raw){
 const q=JSON.parse(raw)
 if(q.method==='cancel')return
 if(q.method==='app.meituan.open'){launches.push(q.payload);window.dispatchEvent(new Event('fixture:launch'))}
 queueMicrotask(()=>window.dispatchEvent(new CustomEvent('xiaoazi:native',{detail:{id:q.id,ok:true,data:q.method==='status'?{enabled:false,keySaved:false}:q.method==='app.meituan.open'?{started:true}:{}}})))
}}
function Fixture(){
 const c=useCourt(),[,render]=useState(0)
 useEffect(()=>{const update=()=>render(n=>n+1);window.addEventListener('fixture:launch',update);return()=>window.removeEventListener('fixture:launch',update)},[])
 return <main><h1>Kitchen native boundary fixture</h1><button onClick={()=>void c.submit('用膳')}>用膳</button><button onClick={()=>c.updateKitchen({budget:20})}>预算20元</button><button onClick={()=>c.updateKitchen({selectedDish:'农家小炒肉饭'})}>选大米先生</button><button onClick={()=>void c.submit('就照旧吧')}>照旧</button><button onClick={()=>void c.submit('批奏折')}>日常奏折</button><pre id="state">{JSON.stringify({card:c.card,scene:c.context.sceneId,thinking:c.replyPending,launches},null,2)}</pre></main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>)
