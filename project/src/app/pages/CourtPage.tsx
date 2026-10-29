import {departmentPath} from '../lib/departments'
import {DepartmentMenu} from '../components/DepartmentMenu'
import {currentDepartment,type Department} from '../lib/departments'
import {useFloatingCharacter} from '../hooks/useFloatingCharacter'
import {useDocumentImport} from '../lib/useDocumentImport'
import {DocumentImportPanel} from '../components/DocumentImportPanel'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {createComposerController,type ComposerState} from '../lib/composer-controller'
import {CourtComposer} from '../components/CourtComposer'
import {HiddenSettings} from '../components/HiddenSettings'
import {nativeAsrProvider,openAssistantSettings} from '../lib/native-assistant'

import { CourtNotice } from '../components/CourtNotice'
import { PresencePanel } from '../components/PresencePanel'
import { CharacterShadow } from '../components/CharacterShadow'
import { CharacterStage } from '../components/CharacterStage'
import { SceneBackdrop } from '../components/SceneBackdrop'
import { createMusicCue } from '../lib/music-cue'
import { MUSIC_GESTURE } from '../lib/music-config'
import { MusicCard } from '../components/MusicCard'
import {WorkCard} from '../components/WorkCard'
import { TodoCard } from '../components/TodoCard'
import {CouponsCard} from '../components/CouponsCard'
import { SceneCard } from '../components/SceneCard'
import { useCourt } from '../lib/useCourt'
import { useKeyboardInset } from '../hooks/useKeyboardInset'

export function CourtPage({onNavigate=()=>{},department=''}:{onNavigate?:(path:string)=>void;department?:string}={}) {
  const court = useCourt()
  useEffect(()=>{if(court.alarmRequest!==undefined)onNavigate('/morning'+(court.alarmRequest.time?'?time='+encodeURIComponent(court.alarmRequest.time):''))},[court.alarmRequest,onNavigate])
  const initialDepartment=useRef('')
  useEffect(()=>{const id=department;if(id===initialDepartment.current)return;initialDepartment.current=id;if(id==='kitchen'||id==='todo'||id==='march')court.navigateDepartment(id)},[department,court.navigateDepartment])
  const documents=useDocumentImport(court)
  const documentsRef=useRef(documents.controller);documentsRef.current=documents.controller
  const keyboardInset = useKeyboardInset()
  const [listening,setListening]=useState(false)
  const [composerState,setComposerState]=useState<ComposerState>({mode:'voice',draft:'',notice:'',asr:{phase:'idle',partial:''},submitting:false})
  const courtRef=useRef(court);courtRef.current=court
  const composerRef=useRef<ReturnType<typeof createComposerController>|null>(null)
  if(!composerRef.current)composerRef.current=createComposerController(nativeAsrProvider,{
    onChange:setComposerState,
    onBeforeListen(){courtRef.current.leave();documentsRef.current.cancel();window.dispatchEvent(new Event('xiaoazi:voice-stop'))},
    async onSubmit(text){documentsRef.current.cancel();setListening(false);setPlaybackError('');void courtRef.current.submit(text)},
  })
  const composer=composerRef.current
  useEffect(()=>{if(court.recordError)composer.notice(court.recordError)},[court.recordError,composer])
  useEffect(()=>{if(court.launchError)composer.notice(court.launchError)},[court.launchError,composer])
  const recording=['starting','listening','recognizing'].includes(composerState.asr.phase)
  useEffect(()=>{
    window.dispatchEvent(new CustomEvent('xiaoazi:recording',{detail:recording}))
    return()=>{window.dispatchEvent(new CustomEvent('xiaoazi:recording',{detail:false}))}
  },[recording])
  useEffect(()=>{
    composer.resume()
    const cancel=()=>composer.cancel(),hide=()=>{if(document.hidden)cancel()}
    document.addEventListener('visibilitychange',hide);window.addEventListener('xiaoazi:pause',cancel);window.addEventListener('pagehide',cancel);window.addEventListener('blur',cancel)
    return()=>{composer.dispose();document.removeEventListener('visibilitychange',hide);window.removeEventListener('xiaoazi:pause',cancel);window.removeEventListener('pagehide',cancel);window.removeEventListener('blur',cancel)}
  },[composer])
  const [playbackError,setPlaybackError]=useState('')
  const [marchFrame,setMarchFrame]=useState<number>()
  const [musicTap,setMusicTap]=useState<number>()
  const musicCue=useRef(createMusicCue(setMusicTap)).current
  const acceptedMarchFrame=useRef<number|undefined>(undefined)

  useEffect(() => () => court.leave(), [court.leave])
  useEffect(()=>{
    const cancel=()=>{setMarchFrame(undefined);setMusicTap(undefined);musicCue.cancel()}
    const hide=()=>{if(document.hidden)cancel()}
    document.addEventListener('visibilitychange',hide)
    for(const event of ['pagehide','xiaoazi:voice-stop','xiaoazi:pause'])window.addEventListener(event,cancel)
    return()=>{document.removeEventListener('visibilitychange',hide);for(const event of ['pagehide','xiaoazi:voice-stop','xiaoazi:pause'])window.removeEventListener(event,cancel)}
  },[])
  useEffect(()=>{if(court.card?.kind==='music')musicCue.arm(court.reactionNonce,{source:new URL(MUSIC_GESTURE.src,document.baseURI).href,action:MUSIC_GESTURE.action,at:MUSIC_GESTURE.tapCueSec,previewEnabled:MUSIC_GESTURE.previewEnabled});else musicCue.cancel();return()=>musicCue.cancel()},[court.card?.kind,court.reactionNonce,musicCue])
  const characterOnly=court.context.sceneId==='client-ending'
  const showCard=Boolean(court.card)
  const fullpage=Boolean((court.card?.kind==='coupons'||court.card?.kind==='kitchen'||court.card?.kind==='march'||court.card?.kind==='todo'||court.card?.kind==='work')&&documents.state.phase==='closed')
  const restore=()=>{composer.cancel();documents.controller.cancel();setListening(false);setPlaybackError('');setMarchFrame(undefined);musicCue.cancel();court.reset()}
  const floating=useFloatingCharacter(fullpage,restore,keyboardInset)
  const activeDepartment=documents.state.phase!=='closed'||!court.card&&court.replyPending?undefined:currentDepartment(court.card,court.context)
  const selectDepartment=(destination:Department)=>{
    if(destination===activeDepartment&&destination!=='home')return
    composer.cancel();documents.controller.cancel();setListening(false);setPlaybackError('');setMarchFrame(undefined);musicCue.cancel()
    if(destination==='kitchen'||destination==='todo'||destination==='march')court.navigateDepartment(destination)
    else {court.leave();onNavigate(departmentPath(destination))}
  }

  return (
    <div className="court-screen" data-fullpage={fullpage} data-presentation={characterOnly?'character-only':undefined} data-keyboard={keyboardInset>0} data-environment={court.environment} data-action={court.action} data-card={showCard?court.card?.kind:undefined}
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined, '--keyboard-inset':`${keyboardInset}px` } as CSSProperties}>
      <SceneBackdrop environment={court.environment} />
      <DepartmentMenu active={activeDepartment} onOpening={()=>{window.dispatchEvent(new Event('xiaoazi:memorial-cancel'));composer.cancel();setListening(false)}} onSelect={selectDepartment}/>
      <HiddenSettings onOpen={()=>{composer.cancel();documents.controller.cancel();setListening(false);court.leave();void openAssistantSettings().catch(error=>composer.notice(error.message))}}/>
      <div className="court-stage">
        <div ref={floating.shell} className="character-shell" data-floating={fullpage} data-dragging={floating.dragging} style={floating.style}>
          {!characterOnly&&<CourtNotice persistent={court.modelReply} text={playbackError || (court.modelReply?`AI · ${court.line}`:court.line)} nonce={court.reactionNonce} />}
          <CharacterShadow />
          <CharacterStage pointHold={court.card?.kind==='march'&&court.card.mode==='骑行'} hideVoiceRetry={characterOnly||fullpage} onRecovery={characterOnly?(kind,recovery)=>{if(recovery)composer.recover(kind,recovery.message,recovery.retry);else composer.clearRecovery(kind)}:undefined} voiceCue={court.voiceCue} restartPoint={court.context.sceneId==='march'} restartAction={court.action==='ending-apology'||characterOnly||['reply','protect','point'].includes(court.voiceCue?.action??'')||court.card?.kind==='music'&&MUSIC_GESTURE.previewEnabled} onFrame={(key,mediaTime,source)=>{musicCue.frame({token:court.reactionNonce,action:key,time:mediaTime,source});if(key==='point'&&court.card?.kind==='march'&&acceptedMarchFrame.current!==court.reactionNonce){acceptedMarchFrame.current=court.reactionNonce;setMarchFrame(court.reactionNonce)}}} sequenceNext={!court.replyPending && !listening && court.card?.kind==='kitchen' && court.action==='think' ? 'point' : undefined} action={court.replyPending?court.action:listening || composerState.asr.phase==='listening'||composerState.asr.phase==='recognizing' ? 'listen' : court.action} onPlaybackError={setPlaybackError} nonce={court.reactionNonce} onActionEnd={court.onActionEnd} />
          <button type="button" aria-label={fullpage?'返回小A子':'唤一声小A子'} onPointerDown={floating.pointerDown} onPointerMove={floating.pointerMove} onPointerUp={floating.pointerUp} onPointerCancel={floating.cancel} onLostPointerCapture={floating.cancel}
           onClick={event=>{if(floating.consumeClick(event.detail))return;if(fullpage){if(event.detail===0)restore();return}composer.cancel();setListening(false);setPlaybackError('');court.react()}} className="court-character-tap" />
        </div>
      </div>
      {!characterOnly&&<PresencePanel fullpage={fullpage} open={showCard&&documents.state.phase==='closed'} entryToken={court.messageNonce} enterDuration={court.card?.kind==='todo'||court.card?.kind==='work'?220:court.card?.kind==='music'?240:court.card?.kind==='march'?200:260}>
        {showCard&&court.card?.kind==='coupons'?<CouponsCard onClose={restore}/>:showCard&&court.card?.kind==='music'?<MusicCard onCancelAuto={()=>musicCue.cancel()} tapToken={musicTap} requestToken={court.reactionNonce} voiceId={court.voiceCue?.id} onClose={court.hold}/>:showCard&&court.card?.kind==='work'?<WorkCard onUpload={()=>{composer.cancel();setListening(false);documents.controller.open()}} card={court.card} onClose={court.closeTodo} onNotice={court.todoNotice}/>:showCard&&court.card?.kind==='todo'?<TodoCard card={court.card} onClose={court.closeTodo} onNotice={court.todoNotice}/>:showCard&&court.card && <SceneCard fullpage={fullpage} key={court.card.kind} presentationToken={court.reactionNonce} presentationReady={court.localNavigation||marchFrame===court.reactionNonce} card={court.card} busy={court.busy} onApprove={() => void court.approve()}
          onRevise={court.revise} onHold={court.hold} onRevoke={court.revoke}
          onUpdateKitchen={court.updateKitchen} onUpdateMarch={court.updateMarch} onAddDraft={court.addDraft}
          draftState={court.draftState} onDraftState={court.reportDraftState} />}
      </PresencePanel>}
      <PresencePanel open={documents.state.phase!=='closed'} enterDuration={220}><DocumentImportPanel state={documents.state} controller={documents.controller}/></PresencePanel>
      <CourtComposer onAttach={()=>{window.dispatchEvent(new Event('xiaoazi:memorial-cancel'));composer.cancel();setListening(false);documents.controller.open()}} controller={composer} state={composerState} onFocusChange={setListening}/>
    </div>
  )
}
