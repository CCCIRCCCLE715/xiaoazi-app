import {persistEdicts} from './edict-storage'
import {notifyCourtRecords} from './memories'
import {currentDepartment,type Department} from './departments'
import {travelReply, type TravelMode} from './travel'
import {parseDestination} from './scenes'
import type {ImportedDocument} from './document-extract'
import type {DocumentAnalysis} from './document-contract'
import {documentIdentity} from './document-identity'
import { useCallback, useEffect, useRef, useState } from 'react'
import {cancelModelReply,routeNativeIntent,openMeituan,meituanFailure} from './native-assistant'

import { createReplyDelay } from './reply-delay'

import { storage } from '@/shared/lib/storage'
import {
  openAppByName,
  queryTodayEvents,
  saveSmsDraft,
  speakText,
  stopSpeakText,
  vibrate,
} from '@/shared/native/abilities'
import { describeDeviceError } from '@/shared/native/mcp'
import type { VoiceCue } from './scene-voice'
import type { ActionId } from '../components/CharacterStage'
import {
  DEFAULT_ENVIRONMENT,
  findEnvironment,
  resolveEnvironment,
  type EnvironmentId,
} from './environments'
import type { EdictKind, EdictStatus } from './imperial'
import {
  applyReceipt,
  createEpoch,
  createSubmitLock,
  isBossConfession,
  isStopCommand,
  resolvePendingCommand,
} from './routing'
import { MARCH_QUERY_VOICE, IDLE_GREETING_VOICE, HOME_GREETING_VOICE, findSceneDefinition } from './scene-config'
import { buildDevicePlan } from './device-plan'
import {
  EMPTY_CONTEXT,
  KITCHEN_DISHES,
  findKitchenDish,
  detectScene,
  enterScene,
  resolveSceneVoice,
  parseAddress,
  parseBudget,
  parseTaste,
  type SceneCard,
  type SceneContext,
  type SceneReply,
} from './scenes'

import {localDecision,validateDecision,decisionReply,presetVoiceAllowed} from './intent-router'
import { routeTodoInput,isWorkIntent } from './todo-intent'
import type {WorkFileSelection} from './document-mode'
import {normalizeDomainSpeech,isIdleGreeting} from './domain-speech'

const EDICTS_KEY = 'court.edicts'

export interface Edict {
  id: string
  kind: EdictKind
  title: string
  userText: string
  reply: string
  status: EdictStatus
  result?: string
  createdAt: number
}

export interface CourtState {
  alarmRequest?:{id:number;time?:string}
  recordError?:string
  launchError?:string
  navigateDepartment:(destination:Department)=>boolean
  localNavigation:boolean
  openWorkTasks:(selection:WorkFileSelection)=>Promise<void>
  startDocument:()=>number
  presentDocument:(result:DocumentAnalysis,document:ImportedDocument,token:number)=>Promise<void>
  failDocument:(error:unknown,token:number)=>Promise<void>
  line: string
  modelReply: boolean
  action: ActionId
  voiceCue?: VoiceCue
  card?: SceneCard
  context: SceneContext
  environment: EnvironmentId
  environmentNotice?: string
  replyPending: boolean
  busy: boolean
  draftState: { dirty: boolean; invalid: boolean }
  reportDraftState: (dirty: boolean, invalid: boolean) => void
  edicts: Edict[]
  submit: (text: string) => Promise<void>
  updateKitchen: (patch: { selectedDish?: string | null; budget?: number | null; taste?: string | null; address?: string | null; contactName?: string | null; phone?: string | null }) => void
  updateMarch: (patch: { destination?: string; mode?: TravelMode }) => void
  addDraft: (title: string) => void
  closeTodo: (message:string, token?:number) => void
  todoNotice: (message:string, token?:number) => void
  react: () => void
  reactionNonce: number
  messageNonce: number
  approve: () => Promise<void>
  leave: () => void
  hold: () => void
  revoke: () => void
  revise: () => void
  reset: () => void
  onActionEnd: () => void
}

const TASK_TITLE: Record<string, string> = {
  'query-calendar': '查今日日程',
  'open-alipay': '御膳房传膳',
  'save-draft': '回复草稿',
  'open-map': '摆驾出宫',
}

const SCENE_KIND: Record<string, EdictKind> = {
  morning: 'morning',
  kitchen: 'kitchen',
  memorial: 'memorial',
  march: 'march',
  music: 'entertain',
}

function makeId() {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
}

export function useCourt(): CourtState {
  const [line, setLine] = useState('')
  const [alarmRequest,setAlarmRequest]=useState<{id:number;time?:string}>()
  const [localNavigation,setLocalNavigation]=useState(false)
  const [modelReply,setModelReply]=useState(false)
  const [action, setAction] = useState<ActionId>('idle')
  const [voiceCue,setVoiceCue] = useState<VoiceCue>()
  const [card, setCard] = useState<SceneCard>()
  const [context, setContext] = useState<SceneContext>(EMPTY_CONTEXT)
  const [environment, setEnvironment] = useState<EnvironmentId>(DEFAULT_ENVIRONMENT)
  const [environmentNotice, setEnvironmentNotice] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [draftState, setDraftState] = useState({ dirty: false, invalid: false })
  const [reactionNonce, setReactionNonce] = useState(0)
  const [messageNonce,setMessageNonce]=useState(0)
  const [edicts, setEdicts] = useState<Edict[]>(() => storage.get(EDICTS_KEY, []))
  const edictsRef=useRef(edicts);edictsRef.current=edicts
  const [launchError,setLaunchError]=useState<string>()
  const [recordError,setRecordError]=useState<string>()
  const saveEdicts=useCallback((next:Edict[])=>{edictsRef.current=next;setEdicts(next);try{persistEdicts(window.localStorage,next);setRecordError(undefined);notifyCourtRecords()}catch(e){setRecordError((e as Error).message)}},[])
  const travelQuery=useRef<{destination?:string}|undefined>(undefined)
  const tapReply=useRef(false)
  const [replyPending,setReplyPending]=useState(false)
  const replying=useRef(false)
  const replyDelay=useRef(createReplyDelay()).current

  const pendingRef = useRef<SceneReply | undefined>(undefined)
  const epochGuard = useRef(createEpoch()).current
  const submitLock = useRef(createSubmitLock()).current
  const submittedRef = useRef(false)

  const bumpEpoch = useCallback(() => {
    setAlarmRequest(undefined);setLocalNavigation(false);replyDelay.cancel();tapReply.current=false;replying.current=false;setReplyPending(false);submittedRef.current=false;const token=epochGuard.next();cancelModelReply();setModelReply(false);setVoiceCue(undefined);silenceVoice();return token
  }, [epochGuard,replyDelay])

  const beginReply = useCallback((token:number, think=true, delayMs=1500) => {
    replyDelay.begin(token,delayMs);replying.current=true;setReplyPending(true)
    setLaunchError(undefined);setLine('');setEnvironmentNotice(undefined);setAction(think?'think':'idle');setReactionNonce(n=>n+1)
  },[replyDelay])
  const ready = useCallback(async(token:number) => {
    if(!await replyDelay.wait(token)||!epochGuard.isCurrent(token))return false
    replying.current=false;setReplyPending(false);return true
  },[replyDelay,epochGuard])
  useEffect(()=>{
    const cancel=()=>{travelQuery.current=undefined;if(pendingRef.current?.card?.kind==='march')pendingRef.current=undefined;bumpEpoch();setCard(prev=>prev?.kind==='march'?undefined:prev);setContext(prev=>prev.sceneId==='march'?EMPTY_CONTEXT:prev);setLine('');setAction('idle')}
    const hide=()=>{if(document.hidden)cancel()}
    document.addEventListener('visibilitychange',hide)
    window.addEventListener('pagehide',cancel);window.addEventListener('xiaoazi:pause',cancel)
    return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',cancel);window.removeEventListener('xiaoazi:pause',cancel);replyDelay.cancel();epochGuard.next();cancelModelReply();silenceVoice()}
  },[bumpEpoch,replyDelay,epochGuard])

  const appendEdict = useCallback((edict:Edict)=>{saveEdicts([edict,...edictsRef.current].slice(0,100))},[saveEdicts])

  // 让 submit 始终调用到最新的执行函数，避免闭包捕获旧的 edicts
  const executeRef = useRef<(pending: SceneReply, epoch: number) => Promise<void>>(undefined)

  const updateEdict = useCallback((id:string,patch:Partial<Edict>)=>{saveEdicts(edictsRef.current.map(item=>item.id===id?{...item,...patch}:item))},[saveEdicts])

  const reportDraftState = useCallback((dirty: boolean, invalid: boolean) => {
    setDraftState({ dirty, invalid })
  }, [])

  const applyReply = useCallback((reply: SceneReply, token: number, voiceText?:string) => {
    if (!epochGuard.isCurrent(token)) return
    setDraftState({ dirty: false, invalid: false })
    setAlarmRequest(reply.page==='alarm-ring'?{id:token,time:reply.alarmTime}:undefined)
    setLine(reply.text)
    setReactionNonce(value=>value+1)
    setAction(reply.action)
    const voice=voiceText?resolveSceneVoice(voiceText,reply.context.sceneId):undefined
    setVoiceCue(voice?{src:voice.src,id:token,action:reply.action}:undefined)
    setCard(reply.card)
    setContext(reply.context)
    pendingRef.current = reply.card && reply.context.pending ? reply : undefined
  }, [])

  const enterEnvironment = useCallback((id: EnvironmentId, reason: string) => {
    setEnvironment(id)
    setEnvironmentNotice(`已到${findEnvironment(id).name}${reason ? ` · ${reason}` : ''}`)
  }, [])

  const onActionEnd = useCallback(() => {
    if(!replying.current)setAction('idle')
  }, [])

  const updateKitchen = useCallback<CourtState['updateKitchen']>(
    (patch) => {
      if (card?.kind !== 'kitchen') return
      const next = { ...card, ...patch }
      if(patch.selectedDish)next.selectedDish=findKitchenDish(patch.selectedDish)?.name??patch.selectedDish
      const base=KITCHEN_DISHES
      next.dishes = next.budget == null ? base : base.filter((dish) => dish.price <= next.budget!)
      if (next.selectedDish && !next.dishes.some(d => d.name === next.selectedDish)) next.selectedDish = null
      setCard(next)
      setContext((prev) => ({ ...prev, ...patch }))
      if (pendingRef.current) pendingRef.current = { ...pendingRef.current, card: next }

      if (Object.keys(patch).some(key => key !== 'selectedDish')) setDraftState({ dirty: false, invalid: false })
      if(Object.keys(patch).every(key=>['address','contactName','phone'].includes(key)))return
      const token=bumpEpoch();beginReply(token);void ready(token).then(current=>{if(current){setAction('reply');setLine(patch.selectedDish ? `选好了，${patch.selectedDish}。` : next.selectedDish ? `${next.selectedDish}，按新要求记下了。` : '记下了，请选一份。')}})
    },
    [card,bumpEpoch,beginReply,ready],
  )

  const updateMarch = useCallback<CourtState['updateMarch']>((patch) => {
    if(card?.kind!=='march')return
    const next={...card,...patch,stage:'choose' as const}
    // Press/selection feedback is immediate; the answer shares the global send clock.
    setCard(next);setDraftState({dirty:false,invalid:false})
    pendingRef.current=undefined
    travelQuery.current={destination:next.destination||undefined}
    const token=bumpEpoch();beginReply(token)
    void ready(token).then(current=>{
      if(!current)return
      const reply=travelReply(next.destination,next.mode)
      applyReply(reply,token)
      if(reply.card?.kind==='march'&&reply.card.stage==='route'&&next.mode==='骑行')setVoiceCue({src:findSceneDefinition('march')!.voice!.src,id:token,action:'point'})
    })
  },[card,bumpEpoch,beginReply,ready,applyReply])

  const addDraft = useCallback<CourtState['addDraft']>(
    (title) => {
      if (card?.kind !== 'morning') return
      const next = {
        ...card,
        items: [...card.items, { title, time: '待定', draft: true }],
      }
      setCard(next)
      if (pendingRef.current) pendingRef.current = { ...pendingRef.current, card: next }
    },
    [card],
  )

  /** 点击反馈即时；角色回答和应答动作遵守同一最短等待。 */
  const react = useCallback(() => {
    // A tap owns only the idle interaction; it cannot erase a business result or pending command.
    if(card||context.sceneId!=='idle'||busy||submittedRef.current||(replying.current&&!tapReply.current))return
    const token=bumpEpoch();beginReply(token);tapReply.current=true
    void ready(token).then(current=>{if(!current)return;tapReply.current=false;setLine('陛下有何吩咐？');setAction('reply');setReactionNonce(n=>n+1);setVoiceCue({src:IDLE_GREETING_VOICE,id:token,action:'reply'})})
  }, [bumpEpoch,beginReply,ready,card,context.sceneId,busy])

  const submit = useCallback(
    async (text: string) => {
      const value = normalizeDomainSpeech(text.trim(),{waitingForTravelMode:Boolean(travelQuery.current)})
      if (!value) return
      submittedRef.current = true
      setMessageNonce(n=>n+1)

      const epoch = bumpEpoch()
      const local=localDecision(value)
      beginReply(epoch,!isStopCommand(value),local.scene==='morning'?2000:1500)
      const clientOnly=local.scene==='client-ending'
      const pending = clientOnly?undefined:pendingRef.current
      if(clientOnly){pendingRef.current=undefined;setCard(undefined);setContext({sceneId:'client-ending',stage:'collect',pending:false})}

      try {
        // 0. 停止 / 收起
        if (isStopCommand(value)) {
          travelQuery.current=undefined
          pendingRef.current = undefined
          setCard(undefined)
          setContext(EMPTY_CONTEXT)
          setAction('idle')
          void stopSpeakText().catch(() => undefined)
          if(await ready(epoch))setLine('好，小A子收声。')
          return
        }

        if(!card&&context.sceneId==='idle'&&isIdleGreeting(value)){
          if(!await ready(epoch))return
          setLine('哎哟，陛下，您可算想起咱啦！');setAction('reply');setReactionNonce(n=>n+1)
          setVoiceCue({src:HOME_GREETING_VOICE,id:epoch,action:'reply'});return
        }

        // The alarm deadline is measured from send, not from model completion.
        if(local.scene==='morning'){
          travelQuery.current=undefined;pendingRef.current=undefined;setCard(undefined)
          if(await ready(epoch))applyReply(decisionReply(local,value,context,card),epoch)
          return
        }

        // 1. 引用或否定的环境表达：只记录，不切换
        const envResolution = resolveEnvironment(value, environment)

        if(local.scene!=='coupons'&&context.sceneId==='kitchen'&&card?.kind==='kitchen'&&findKitchenDish(value)){
          const chosen=findKitchenDish(value)!
          if(!await ready(epoch))return
          const budget=parseBudget(value)??card.budget,address=parseAddress(value)??card.address,taste=parseTaste(value)??card.taste
          const dishes=budget==null?KITCHEN_DISHES:KITCHEN_DISHES.filter(d=>d.price<=budget)
          const over=budget!=null&&chosen.price>budget
          const next={...card,budget,address,taste,dishes,selectedDish:over?null:chosen.name};setCard(next)
          const fields={budget,address,taste};setContext(prev=>({...prev,...fields}))
          if(pendingRef.current)pendingRef.current={...pendingRef.current,card:next,context:{...pendingRef.current.context,...fields}}
          setLine(over?'这份超出预算，请换一份。':`选好了，${chosen.name}。`);setAction('reply');return
        }
        if(context.sceneId==='kitchen'&&card?.kind==='kitchen'&&['clarify','kitchen'].includes(local.scene)&&/(?:老样子|照旧)/.test(value)&&!/不要|不用|不必|不想|别|甭|取消|不照旧|不是|你说|他说|她说|提到|引用|例如|举例|什么|怎么|如何|[“”「」『』"'‘’]/.test(value)){
          if(!await ready(epoch))return
          const budget=parseBudget(value)??card.budget
          const dishes=card.dishes.filter(d=>budget==null||d.price<=budget),chosen=dishes[0]
          const next={...card,budget,dishes,selectedDish:chosen?.name??null}
          setCard(next)
          const nextContext:SceneContext={...context,budget,stage:'confirm',pending:Boolean(chosen)}
          setContext(nextContext)
          pendingRef.current=undefined
          if(!chosen){setLine('这个预算内还没有合适的餐食，请调整预算。');setAction('reply');return}
          const confirmed:SceneReply={text:`${chosen.name}，按这份安排。`,action:'reply',card:next,context:nextContext,task:'open-alipay'}
          pendingRef.current=confirmed
          await executeRef.current?.(confirmed,epoch)
          return
        }
        const todoInput=routeTodoInput(value,card?.kind==='todo'||card?.kind==='work')
        if(todoInput?.kind==='command'&&(card?.kind==='todo'||card?.kind==='work')){
          if(!await ready(epoch))return
          setCard({...card,command:todoInput.command,commandNonce:epoch});setAction('idle');return
        }

        // 2. 待确认项上的口令（重拟后旧确认失效，由 epoch 保证）
        if(todoInput?.kind==='open'||isWorkIntent(value))pendingRef.current=undefined
        if (pending&&todoInput?.kind!=='open'&&!isWorkIntent(value)) {
          const command = resolvePendingCommand(value)
          if (command === 'approve') {
            await executeRef.current?.(pending, epoch)
            return
          }
          if (command === 'revise') {
            // 旧确认立即作废：递增 epoch，新的草稿成为唯一待确认项
            if(!await ready(epoch))return
            const nextPending: SceneReply = { ...pending, text: '臣重新拟一稿，陛下过目。', action: 'reply' }
            pendingRef.current = nextPending
            setLine(nextPending.text)
            setAction('reply')
            setCard(pending.card)
            setContext({ ...pending.context, stage: 'confirm', pending: true })
            return
          }
          if (command === 'hold') {
            await hold(epoch)
            return
          }
          if (command === 'revoke') {
            await revoke(epoch)
            return
          }
        }

        // 3. 护驾上下文：只认「是老板」
        if (context.protectReady && isBossConfession(value)) {
          if(!await ready(epoch))return
          applyReply(
            {
              text: '小A子给大人请安。',
              action: 'reply', // 认怂段已拒收，用 reply 候选，不播放裁切段
              context: { sceneId: 'protect', stage: 'done', protectReady: false },
            },
            epoch,
          )
          return
        }

        // Classification and the minimum response delay share the same foreground interval.
        submittedRef.current=false
        if(context.sceneId!=='march'||localDecision(value).scene!=='march')setCard(undefined) // A travel choice keeps its immediate selected feedback during thought.
        let raw:string|undefined
        try{raw=await routeNativeIntent(value,context.sceneId)}catch{/* fall back locally; never render network/model text */}
        if(!await ready(epoch))return
        const validated=raw?validateDecision(raw,value):undefined
        const decision=validated&&validated.scene!=='clarify'&&!validated.clarify?validated:localDecision(value)
        if(decision.scene!=='clarify'&&!decision.clarify){
          if(decision.scene==='march'){
            const destination=decision.slots.destination??(decision.slots.mode?travelQuery.current?.destination??(card?.kind==='march'?card.destination:undefined):undefined)
            const mode=decision.slots.mode??(decision.slots.destination&&context.sceneId==='march'&&card?.kind==='march'&&card.stage==='choose'&&!card.destination?card.mode:undefined)
            travelQuery.current={destination:destination||undefined}
            const reply=travelReply(destination,mode)
            applyReply(reply,epoch)
            if(!mode)setVoiceCue({src:MARCH_QUERY_VOICE,id:epoch,action:'point'})
            else if(reply.card?.kind==='march'&&reply.card.stage==='route'&&mode==='骑行')setVoiceCue({src:findSceneDefinition('march')!.voice!.src,id:epoch,action:'point'})
            enterEnvironment('street','');return
          }
          travelQuery.current=undefined
          const reply=decisionReply(decision,value,context,card)
          applyReply(reply,epoch)
          const voice=findSceneDefinition(reply.context.sceneId)?.voice
          const allowedVoice=presetVoiceAllowed(reply.context.sceneId,value)
          if(voice&&allowedVoice)setVoiceCue({src:voice.src,id:epoch,action:reply.action})
          if(reply.environment)enterEnvironment(reply.environment,'')
          return
        }

        if(context.sceneId==='march'&&travelQuery.current){
          const destination=/^(?:我要|我想|带我|目的地是)?(?:去|到|往)/.test(value)&&!/不要|不用|不想|别|取消|不去|[“”"'「」]/.test(value)?parseDestination(value):undefined
          if(destination){travelQuery.current={destination};applyReply(travelReply(destination,card?.kind==='march'?card.mode:undefined),epoch)}
          else applyReply(travelReply(travelQuery.current.destination),epoch)
          return
        }
        travelQuery.current=undefined
        // 4. 当前场景补字段（传膳）
        if (context.sceneId === 'kitchen' && !detectScene(value) && (parseBudget(value)!==undefined||parseAddress(value)!==undefined||parseTaste(value)!==undefined)) {
          const budget = parseBudget(value) ?? context.budget
          const address = parseAddress(value) ?? context.address
          const taste = parseTaste(value) ?? context.taste
          const nextContext: SceneContext = { ...context, budget, address, taste }
          const reply = enterScene('kitchen', value, nextContext)
          applyReply({ ...reply, context: { ...nextContext, ...reply.context } }, epoch)
          return
        }

        // Keep the current card editable while asking one bounded, preset question.
        // Environment-only movement is local, never a model operation.
        if(envResolution.blocked==='quoted')setEnvironmentNotice('这是一句引用，没有换地方。')
        else if(envResolution.blocked==='ambiguous')setEnvironmentNotice('听出两个去处，先留在原处。')
        if(envResolution.matched){enterEnvironment(envResolution.matched,'')}
        setLine('陛下要用膳、看待办，还是摆驾？')
        setAction('reply');setReactionNonce(n=>n+1)

      } finally {
        if(epochGuard.isCurrent(epoch))submittedRef.current = false
      }
    },
    [applyReply, bumpEpoch,beginReply,ready, context, enterEnvironment, environment,card],
  )

  const executePending = useCallback(
    async (pending: SceneReply, epoch: number) => {
      if (!pending.task) return
      const task = pending.task
      await submitLock.run(async () => {
      setBusy(true)

      const planResult = buildDevicePlan(task, pending.card)

      const edict: Edict = {
        id: makeId(),
        kind: SCENE_KIND[pending.context.sceneId] ?? 'chat',
        title: TASK_TITLE[task] ?? '圣旨',
        userText: pending.text,
        reply: pending.text,
        status: 'approved',
        createdAt: Date.now(),
      }
      appendEdict(edict)
      pendingRef.current = undefined
      setContext((prev) => ({ ...prev, pending: false, stage: 'done' }))

      if (!planResult.ok) {
        updateEdict(edict.id, { status: 'failed', result: planResult.reason })
        if(!await ready(epoch)){setBusy(false);return}
        setLine(planResult.reason)
        setAction('reply')
        setBusy(false)
        return
      }
      const plan = planResult.plan

      try {
        if(!(plan.kind==='open-app'&&plan.appName==='美团'))await vibrate(24)
        let result: string
        switch (plan.kind) {
          case 'query-calendar': {
            const events = await queryTodayEvents()
            result = events.text || '今日暂无别的日程。'
            break
          }
          case 'open-app': {
            if(plan.appName==='美团')await openMeituan(plan.merchantId)
            else await openAppByName(plan.appName)
            result =
              plan.appName === '美团'
                ? '已打开美团。'
                : `已发起打开地图（${plan.summary}），路线与时间请在地图里核对。`
            break
          }
          case 'save-draft': {
            await saveSmsDraft(plan.phone, plan.message)
            result = '回复已存进短信草稿箱，等陛下用印。'
            break
          }
          default:
            result = '已照办。'
        }
        // 真实回执始终落到原记录；只有仍是当前轮时才更新新界面
        await ready(epoch)
        applyReceipt({
          epoch: epochGuard,
          token: epoch,
          onRecord: () => updateEdict(edict.id, { status: 'done', result }),
          onUi: () => {
            setLine(result)
            setAction('reply')
          },
        })
      } catch (error) {
        const isMeituan=plan.kind==='open-app'&&plan.appName==='美团'
        const message = isMeituan?meituanFailure(error):describeDeviceError(error)
        await ready(epoch)
        applyReceipt({
          epoch: epochGuard,
          token: epoch,
          onRecord: () => updateEdict(edict.id, { status: 'failed', result: message }),
          onUi: () => {
            if(isMeituan){pendingRef.current=pending;setContext(prev=>({...prev,pending:true,stage:'confirm'}));setLaunchError(message)}
            setLine(message)
            setAction('reply')
          },
        })
      } finally {
        setBusy(false)
      }
      })
    },
    [appendEdict, epochGuard, submitLock, updateEdict,ready],
  )

  executeRef.current = executePending

  const hold = useCallback(async (token?:number) => {
    travelQuery.current=undefined
    const epoch=token??bumpEpoch();if(token===undefined)beginReply(epoch)
    const pending = pendingRef.current
    pendingRef.current = undefined
    setContext((prev) => ({ ...prev, pending: false, stage: 'collect' }))
    setCard(undefined)
    if (pending) appendEdict({id:makeId(),kind:SCENE_KIND[pending.context.sceneId]??'chat',title:'留中',userText:pending.text,reply:pending.text,status:'held',result:'留中不发。',createdAt:Date.now()})
    if(!await ready(epoch))return
    setLine('留中不发，小A子替陛下收着。');setAction('reply')
  }, [appendEdict, bumpEpoch,beginReply,ready])

  const revoke = useCallback(async(token?:number) => {
    travelQuery.current=undefined
    const epoch=token??bumpEpoch();if(token===undefined)beginReply(epoch)
    pendingRef.current = undefined
    setCard(undefined)
    setContext(EMPTY_CONTEXT)
    if(!await ready(epoch))return
    setLine('已撤旨。已经发出的外部操作无法收回，请到对应应用里核对。')
    setAction('reply')
  }, [bumpEpoch,beginReply,ready])

  const revise = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending) return
    const token=bumpEpoch();beginReply(token)
    if(!await ready(token))return
    pendingRef.current = { ...pending, text: '臣重新拟一稿，陛下过目。' }
    setLine('臣重新拟一稿，陛下过目。')
    setAction('reply')
  }, [bumpEpoch,beginReply,ready])

  const leave = useCallback(() => {
    // 离页：推进轮次并停播报；已下发的设备操作不声称撤回
    bumpEpoch()
    setAction('idle')
    setLine('') // 同时移除旧回复，避免长 AI 文本失去 modelReply 的高度约束
    silenceVoice()
  }, [bumpEpoch])

  const reset = useCallback(() => {
    travelQuery.current=undefined
    bumpEpoch()
    pendingRef.current = undefined
    setCard(undefined)
    setContext(EMPTY_CONTEXT)
    setLine('')
    setAction('idle')
  }, [bumpEpoch])

  const navigateDepartment=useCallback((destination:Department)=>{
    if(destination!=='home'&&destination!=='kitchen'&&destination!=='todo'&&destination!=='march')return false
    // A menu selection is local navigation, never a fabricated spoken request.
    if(currentDepartment(card,context)===destination&&!(destination==='home'&&replyPending))return false
    bumpEpoch();travelQuery.current=undefined;pendingRef.current=undefined
    setBusy(false);setDraftState({dirty:false,invalid:false});setLine('');setAction('idle');setEnvironmentNotice(undefined)
    setLocalNavigation(true);setReactionNonce(n=>n+1);setMessageNonce(n=>n+1)
    if(destination==='home'){setCard(undefined);setContext(EMPTY_CONTEXT);return true}
    const reply=destination==='march'?travelReply(null,null):enterScene(destination,'',EMPTY_CONTEXT)
    setCard(reply.card);setContext(reply.context)
    if(reply.environment)setEnvironment(reply.environment)
    if(reply.context.pending)pendingRef.current={...reply,text:'',action:'idle'}
    if(destination==='march')travelQuery.current={destination:undefined}
    return true
  },[bumpEpoch,card,context,replyPending])

  const todoNotice=useCallback(async(message:string,token?:number)=>{
    const epoch=token??bumpEpoch();if(token===undefined)beginReply(epoch)
    if(!await ready(epoch))return
    setLine(message);setAction('reply');setReactionNonce(n=>n+1)
  },[bumpEpoch,beginReply,ready])
  const closeTodo=useCallback(async(message:string,token?:number)=>{
    const epoch=token??bumpEpoch();if(token===undefined)beginReply(epoch)
    if(!epochGuard.isCurrent(epoch))return
    pendingRef.current=undefined;setCard(undefined)
    if(!await ready(epoch))return
    setContext({sceneId:card?.kind==='work'?'work':'todo',stage:'done',pending:false});setAction('idle');setLine(message)
  },[bumpEpoch,beginReply,ready,card])

  const openWorkTasks=useCallback(async(selection:WorkFileSelection)=>{
    const token=bumpEpoch();travelQuery.current=undefined;pendingRef.current=undefined
    setCard(undefined);setContext(EMPTY_CONTEXT);setMessageNonce(n=>n+1);beginReply(token)
    if(!await ready(token))return
    const reply=enterScene('work','',EMPTY_CONTEXT)
    applyReply({...reply,card:{kind:'work',selection}},token)
    setVoiceCue({src:findSceneDefinition('work')!.voice!.src,id:token,action:reply.action})
    enterEnvironment('audience_hall','')
  },[bumpEpoch,beginReply,ready,applyReply,enterEnvironment])

  const startDocument=useCallback(()=>{
    travelQuery.current=undefined;const token=bumpEpoch();pendingRef.current=undefined;setCard(undefined);setContext(EMPTY_CONTEXT);setMessageNonce(n=>n+1);beginReply(token);return token
  },[bumpEpoch,beginReply])
  const presentDocument=useCallback(async(result:DocumentAnalysis,document:ImportedDocument,token:number)=>{
    if(!await ready(token))return
    if(result.category==='other'){setLine('此文未列待办，陛下可换一份。');setAction('reply');setCard(undefined);return}
    const id=await documentIdentity(document)
    if(!epochGuard.isCurrent(token))return
    const voice=findSceneDefinition('todo')!.voice!
    applyReply({text:'文件事项，陛下过目。',action:'ending-apology',environment:'audience_hall',context:{sceneId:'todo',stage:'confirm',pending:false},card:{kind:'todo',document:{id,name:document.name,items:result.items.map(i=>({...i,label:document.units.find(u=>u.sourceId===i.sourceId)!.label}))}}},token)
    setVoiceCue({src:voice.src,id:token,action:'ending-apology'});enterEnvironment('audience_hall','')
  },[ready,epochGuard,applyReply,enterEnvironment])
  const failDocument=useCallback(async(_error:unknown,token:number)=>{if(!await ready(token))return;setLine('呈奏未成，请核对后重试。');setAction('reply');setVoiceCue(undefined)},[ready])

  return {
    alarmRequest,navigateDepartment,localNavigation,recordError,launchError,
    openWorkTasks,startDocument,presentDocument,failDocument,
    closeTodo,todoNotice,
    modelReply,replyPending,
    line,
    action,
    voiceCue,
    card,
    context,
    environment,
    environmentNotice,
    busy,
    draftState,
    reportDraftState,
    edicts,
    submit,
    updateKitchen,
    updateMarch,
    addDraft,
    react,
    reactionNonce,
    messageNonce,
    leave,
    approve: () => {
      const pending = pendingRef.current
      if (!pending) return Promise.resolve()
      const token=bumpEpoch();beginReply(token)
      return executePending(pending,token)
    },
    hold:()=>{void hold()},
    revoke:()=>{void revoke()},
    revise:()=>{void revise()},
    reset,
    onActionEnd,
  }
}

/** 供界面在离开页面时停止播报；不改变任何业务状态 */
export function silenceVoice() {
  window.dispatchEvent(new Event('xiaoazi:voice-stop'))
  void stopSpeakText().catch(() => undefined)
}

/** 供未来 Model Provider 复用的语音播报出口 */
export function speakLine(text: string) {
  void speakText(text).catch(() => undefined)
}
