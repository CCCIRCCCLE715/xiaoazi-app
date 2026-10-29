import { useLayoutEffect, useRef } from 'react'
/** Feet sit near y=1310/1440 in the original transparent square, not at its edge.
 * Match object-fit:contain using the smaller shell dimension. Keep contact steady
 * across gestures; only viewport/card layout changes reposition the ground plane.
 */
export function CharacterShadow(){
 const ref=useRef<HTMLDivElement>(null)
 useLayoutEffect(()=>{
  const node=ref.current!,shell=node.parentElement!
  const resize=()=>{
   const width=shell.clientWidth,height=shell.clientHeight,side=Math.min(width,height)
   node.style.left=`${width/2+side*.018}px`
   node.style.top=`${(height-side)/2+side*.912}px`
   node.style.width=`${side*.5}px`
   node.style.height=`${Math.max(12,side*.075)}px`
  }
  resize();const observer=new ResizeObserver(resize);observer.observe(shell)
  return()=>observer.disconnect()
 },[])
 return <div ref={ref} className="character-shadow" aria-hidden="true"/>
}
