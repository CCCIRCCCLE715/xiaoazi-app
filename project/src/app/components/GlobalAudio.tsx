import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createBackgroundMusic } from '../lib/background-music'
import { BACKGROUND_MUSIC_SOURCE } from '../lib/audio-config'
const MusicContext=createContext({available:false,muted:false,toggle:()=>{}})
export const useBackgroundMusic=()=>useContext(MusicContext)
/** Mounted above Routes: scene and page changes never replace the music track. */
export function GlobalAudio({children}:{children:ReactNode}) {
 const audio=useRef<HTMLAudioElement>(null),controller=useRef<ReturnType<typeof createBackgroundMusic>|null>(null)
 const [muted,setMuted]=useState(false)
 useEffect(()=>{
  const music=createBackgroundMusic(audio.current!);controller.current=music;music.source(BACKGROUND_MUSIC_SOURCE)
  let recording=false
  const record=(event:Event)=>{recording=Boolean((event as CustomEvent<boolean>).detail);if(recording)music.suspend()}
  window.addEventListener('xiaoazi:recording',record)
  const gesture=()=>{if(!recording)music.gesture()},hide=()=>{if(document.hidden)music.suspend()},pause=()=>music.suspend()
  const exclusive=(event:Event)=>music.exclusive(Boolean((event as CustomEvent<boolean>).detail))
  window.addEventListener('xiaoazi:music-exclusive',exclusive)
  const voiceEvent=(event:Event)=>{if(!(event.target instanceof HTMLAudioElement)||!event.target.hasAttribute('data-scene-audio'))return;music.duck(event.type==='playing')}
  document.addEventListener('pointerdown',gesture,true);document.addEventListener('keydown',gesture,true);document.addEventListener('visibilitychange',hide)
  for(const event of ['playing','pause','ended','error'])document.addEventListener(event,voiceEvent,true)
  window.addEventListener('pagehide',pause);window.addEventListener('xiaoazi:pause',pause)
  return()=>{window.removeEventListener('xiaoazi:recording',record);window.removeEventListener('xiaoazi:music-exclusive',exclusive);music.dispose();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',hide);for(const event of ['playing','pause','ended','error'])document.removeEventListener(event,voiceEvent,true);window.removeEventListener('pagehide',pause);window.removeEventListener('xiaoazi:pause',pause)}
 },[])
 const toggle=()=>{const next=!muted;controller.current?.mute(next);setMuted(next)}
 return <MusicContext.Provider value={{available:Boolean(BACKGROUND_MUSIC_SOURCE),muted,toggle}}><audio ref={audio} data-background-music preload="auto" hidden />{children}</MusicContext.Provider>
}
