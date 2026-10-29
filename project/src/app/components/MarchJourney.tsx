import { useEffect, useState, type CSSProperties } from 'react'
import {HangzhouMap} from './HangzhouMap'
import {TravelIcon} from './TravelIcon'
import type {TravelMode} from '../lib/travel'
import { createMarchPresentation, MARCH_TIMING, type MarchPhase } from '../lib/march-presentation'

/** One official Bicycle resource shared with the mode chooser. */
export function MarchJourney({token,mode,destination,frameReady=true}:{frameReady?:boolean;token:number;mode:TravelMode|null;destination:string|null}) {
 const [phase,setPhase]=useState<MarchPhase>('bike')
 useEffect(()=>{
  if(mode!=='骑行'){setPhase('cancelled');return}
  if(!frameReady)return
  const controller=createMarchPresentation(setPhase)
  const preference=matchMedia('(prefers-reduced-motion: reduce)')
  let stopped=false
  controller.arm(token,preference.matches);if(frameReady&&!document.hidden)controller.frame(token)
  const cancel=()=>{stopped=true;controller.cancel()}
  const hide=()=>{if(document.hidden)cancel()}
  const reduce=()=>{if(frameReady&&!stopped&&!document.hidden&&preference.matches){controller.arm(token,true);controller.frame(token)}}
  document.addEventListener('visibilitychange',hide);preference.addEventListener('change',reduce)
  for(const event of ['pagehide','xiaoazi:voice-stop','xiaoazi:pause'])window.addEventListener(event,cancel)
  return()=>{controller.cancel();document.removeEventListener('visibilitychange',hide);preference.removeEventListener('change',reduce);for(const event of ['pagehide','xiaoazi:voice-stop','xiaoazi:pause'])window.removeEventListener(event,cancel)}
 },[token,mode,frameReady])
 return <MarchVisual phase={frameReady?phase:'waiting'} token={token} mode={mode} destination={destination}/>
}

export function MarchVisual({phase,mode,destination,token=0}:{phase:MarchPhase;mode:TravelMode|null;destination:string|null;token?:number}) {
 const riding=mode==='骑行',compact=['compact','duration','map','route','arrived'].includes(phase),summary=['duration','map','route','arrived'].includes(phase)
 return <div className="march-visual hangzhou-journey" data-phase={phase} data-compact={compact} data-summary={summary} data-riding={riding}
  style={{'--march-route-duration':`${MARCH_TIMING.routeMs}ms`} as CSSProperties} aria-label="杭州地图与出行路线">
  {riding&&<><div className="march-bike-traveller" aria-hidden><TravelIcon mode="骑行" size={134}/></div><div className="march-summary"><span>骑行</span><strong>参考18<small>分钟</small></strong></div></>}
  {mode&&!riding&&<div className="march-transport-preview"><TravelIcon mode={mode} size={40}/><strong>{mode}</strong><span>{mode==='打车'?'未叫车':'请在外部地图核对路线'}</span></div>}
  <HangzhouMap phase={riding?phase:'waiting'} token={token}/>
  <p className="hangzhou-map-caption">杭州 · 西湖东岸—武林广场</p>
  <p className="hangzhou-destination-note">{destination?`前往${destination} · 请在地图中确认当前位置和路线`:'输入目的地，规划这次出行'}</p>
 </div>
}
