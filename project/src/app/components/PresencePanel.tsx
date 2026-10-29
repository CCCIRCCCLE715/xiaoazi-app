import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {createPanelMotion} from '../lib/panel-motion'
/** Non-modal action card: retains closing content, interrupts the current animation. */
export function PresencePanel({ open, children,enterDuration=260,entryToken=0,fullpage=false }: { open: boolean; children: ReactNode;enterDuration?:number;entryToken?:number;fullpage?:boolean }) {
  const [present, setPresent] = useState(open)
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef(children)
  const surface=useRef(fullpage);if(open)surface.current=fullpage
  const full=surface.current
  const motion=useRef<ReturnType<typeof createPanelMotion>|null>(null)
  if (open) latest.current = children
  useLayoutEffect(() => { if (open) setPresent(true) }, [open])
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || !present){motion.current?.dispose();motion.current=null;return}
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if(!motion.current)motion.current=createPanelMotion({read(){const style=getComputedStyle(node);return {opacity:Number(style.opacity),transform:style.transform}},animate:(frames,options)=>node.animate(frames,options)},()=>setPresent(false))
    motion.current.update(open,reduced,enterDuration,full?{entryTransform:'translateY(10px)',exitTransform:'translateY(8px)',exitDuration:190}:undefined)
  }, [open, present,enterDuration,entryToken,fullpage])
  useLayoutEffect(()=>()=>{motion.current?.dispose();motion.current=null},[])
  if (!present) return null
  return <div ref={ref} className={`court-panel-presence${full?' fullpage-presence':''}`} inert={!open}>{open ? children : latest.current}</div>
}
