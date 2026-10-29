import {useLayoutEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react'
import {clampFloating,createFloatingGesture,type FloatingBounds,type Point} from '../lib/floating-character'
/** One existing shell is transformed. The canvas and its decoder ownership never move in React. */
export function useFloatingCharacter(active:boolean,restore:()=>void,keyboardInset:number){
 const shell=useRef<HTMLDivElement>(null),position=useRef<Point|null>(null),bounds=useRef<FloatingBounds>({width:390,height:844,top:12,bottom:112,size:88,pad:12})
 const geometry=useRef('')
 const previousActive=useRef<boolean|undefined>(undefined)
 // pointerUp may close the page before the browser emits its click. Keep this
 // guard across that render so the same physical tap cannot greet on home.
 const suppressNativeClick=useRef(false)
 const gesture=useRef(createFloatingGesture()).current
 const [style,setStyle]=useState<CSSProperties>({}),[dragging,setDragging]=useState(false)
 const paint=(immediate=false)=>{const node=shell.current,stage=node?.parentElement,screen=stage?.parentElement;if(!node||!stage||!screen)return
  const dock=screen.querySelector<HTMLElement>('.court-dock'),dockHeight=dock?.offsetHeight??90;screen.style.setProperty('--fullscreen-dock-height',`${dockHeight+keyboardInset}px`)
  const width=screen.clientWidth,height=screen.clientHeight-keyboardInset
  const size=Math.min(88,width*.226),top=12,bottom=dockHeight+12
  bounds.current={width,height,top,bottom,size,pad:12}
  position.current=clampFloating(position.current??{x:width-size-12,y:top},bounds.current)
  const {x,y}=position.current,w=node.offsetWidth,h=node.offsetHeight
  geometry.current=[width,height,dockHeight,w,h,stage.offsetLeft,stage.offsetTop,node.offsetLeft,node.offsetTop].join(',')
  setStyle(active?{transform:`translate3d(${x+size/2-stage.offsetLeft-node.offsetLeft-w/2}px,${y+size/2-stage.offsetTop-node.offsetTop-h/2}px,0) scale(${size/Math.min(w,h)})`,transition:immediate?'none':undefined}:{transform:'translate3d(0,0,0) scale(1)'})
 }
 const paintRef=useRef(paint);paintRef.current=paint
 useLayoutEffect(()=>{gesture.cancel();setDragging(false);paintRef.current(previousActive.current===active);previousActive.current=active;const node=shell.current!,stage=node.parentElement!,screen=stage.parentElement!,dock=screen.querySelector<HTMLElement>('.court-dock');const ro=new ResizeObserver(()=>{const next=[screen.clientWidth,screen.clientHeight-keyboardInset,dock?.offsetHeight??90,node.offsetWidth,node.offsetHeight,stage.offsetLeft,stage.offsetTop,node.offsetLeft,node.offsetTop].join(',');if(next===geometry.current)return;gesture.cancel();setDragging(false);paintRef.current(true)});ro.observe(node);ro.observe(screen);ro.observe(stage);if(dock)ro.observe(dock);return()=>{ro.disconnect();gesture.cancel()}},[active,keyboardInset,gesture])
 const cancel=()=>{gesture.cancel();setDragging(false)}
 const pointerDown=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!e.isPrimary||e.button!==0)return;if(!active){suppressNativeClick.current=false;return}if(!gesture.down(e.pointerId,e.clientX,e.clientY,position.current!))return;suppressNativeClick.current=true;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)}
 const pointerMove=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!active)return;const next=gesture.move(e.pointerId,e.clientX,e.clientY,bounds.current);if(next){setDragging(true);position.current=next;paint()}}
 const pointerUp=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!active)return;const result=gesture.up(e.pointerId,bounds.current);if(!result)return;e.preventDefault();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setDragging(false);if(result.activate)restore();else{position.current=result.position;paint()}}
 const consumeClick=(detail:number)=>{if(detail===0)return false;const suppress=suppressNativeClick.current;suppressNativeClick.current=false;return suppress}
 return {shell,style,dragging,pointerDown,pointerMove,pointerUp,cancel,consumeClick}
}
