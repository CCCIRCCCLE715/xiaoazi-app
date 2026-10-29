import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {createPanelMotion} from '../lib/panel-motion'
/** A reply belongs to the character, not the top edge of the screen. */
export function CourtNotice({ text, nonce, persistent=false }: { text: string; nonce: number; persistent?:boolean }) {
  const [visible, setVisible] = useState(false)
  const [size,setSize]=useState({width:0,height:0})
  const body=useRef<HTMLDivElement>(null),motion=useRef<ReturnType<typeof createPanelMotion>|null>(null)
  useLayoutEffect(()=>{
    const node=body.current;if(!node)return
    const measure=()=>{const {width,height}=node.getBoundingClientRect();
      // Layout dimensions avoid the entrance animation's transform scaling.
      const next={width:node.offsetWidth||width,height:node.offsetHeight||height}
      setSize(previous=>previous.width===next.width&&previous.height===next.height?previous:next)}
    measure();const observer=new ResizeObserver(measure);observer.observe(node)
    return()=>observer.disconnect()
  },[text])
  useLayoutEffect(()=>{
    const node=body.current;if(!node||!visible&&!motion.current)return
    if(!motion.current)motion.current=createPanelMotion({read(){const style=getComputedStyle(node);return {opacity:Number(style.opacity),transform:style.transform}},animate:(frames,options)=>node.animate(frames,options)},()=>{},'translateY(10px) scale(.97)')
    motion.current.update(visible,matchMedia('(prefers-reduced-motion: reduce)').matches,160)
  },[visible,text,nonce])
  useLayoutEffect(()=>()=>{motion.current?.dispose();motion.current=null},[])
  useEffect(() => {
    if (!text) { setVisible(false); return }
    setVisible(true)
    if(persistent)return
    const timer = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(timer)
  }, [text, nonce,persistent])
  const w=size.width,h=size.height,r=Math.min(24,(w-1)/2,(h-1)/2),c=w/2
  // One closed outline: no capsule bottom edge crosses the tail junction.
  const outline=w&&h?`M ${r+.5} .5 H ${w-r-.5} A ${r} ${r} 0 0 1 ${w-.5} ${r+.5} V ${h-r-.5} A ${r} ${r} 0 0 1 ${w-r-.5} ${h-.5} H ${c+7} L ${c} ${h+9} L ${c-7} ${h-.5} H ${r+.5} A ${r} ${r} 0 0 1 .5 ${h-r-.5} V ${r+.5} A ${r} ${r} 0 0 1 ${r+.5} .5 Z`:''
  return <aside className="court-bubble" data-open={visible} data-model={persistent} role="status" aria-live="polite" aria-hidden={!visible}>
    <div ref={body} className="court-bubble-body"><svg className="court-bubble-surface" width={w} height={h+10} viewBox={`0 0 ${w||1} ${h+10}`} aria-hidden="true" focusable="false"><path d={outline}/></svg><p tabIndex={persistent&&visible?0:undefined} aria-label={persistent?'AI回复':undefined}>{text}</p></div>
  </aside>
}
