/**
 * 语音识别会话控制器（与具体 Provider 解耦）。
 *
 * 约束：
 *  - 只有 Provider 明确配置且协议已核对（state === 'ready'）才允许开始；
 *  - 只有 Provider 确认开始后才进入听旨；
 *  - partial 只用于展示，不触发任何业务；
 *  - 只有当前会话的唯一非空 final 交给输入控制器，松手与取消策略由其控制；
 *  - 取消、后台、离页、dispose 后到达的事件一律丢弃；
 *  - 停止等待 final 超时会安全结束并释放资源，允许重试。
 *
 * 本文件不包含任何真实识别实现；模拟 Provider 只存在于隔离测试中。
 */

import type { AsrProvider, AsrSession, ProviderState } from './providers'

export type AsrFailure =
  | 'not-configured'
  | 'permission'
  | 'language'
  | 'asr-too-long'
  | 'no-speech'
  | 'service-missing'
  | 'start-failed'
  | 'asr-client'
  | 'asr-busy'
  | 'asr-network'
  | 'asr-audio'
  | 'asr-server'
  | 'asr-rate-limit'
  | 'asr-disconnected'
  | 'offline-model'
  | 'offline-audio'
  | 'offline-init'
  | 'timeout'
  | 'cancelled'

export type AsrPhase = 'idle' | 'starting' | 'listening' | 'recognizing' | 'error'

export interface AsrUiState {
  phase: AsrPhase
  sessionId?: string
  /** 仅用于展示，不进入业务 */
  partial: string
  failure?: AsrFailure
  message?: string
}

export interface AsrControllerOptions {
  onFinal: (text: string, sessionId: string, rawText?:string) => void
  onState?: (state: AsrUiState) => void
  /** 停止后等待 final 的上限 */
  finalTimeoutMs?: number
}

export interface AsrController {
  state: () => AsrUiState
  isConfigured: () => boolean
  start: () => Promise<void>
  stop: () => Promise<void>
  cancel: (reason?: string) => void
  dispose: () => void
}

const FAILURE_TEXT: Record<AsrFailure, string> = {
  'not-configured': '语音识别尚未配置',
  language: '中文识别模型不可用，可重试或在设置关闭本地优先，文字输入仍可用',
  permission: '麦克风权限被拒绝，可在系统设置里开启后重试',
  'asr-too-long':'这段话太长，请分两次说。',
  'no-speech': '没有听到声音，请再说一次',
  'service-missing': '本机没有可用的语音识别服务',
  'asr-client':'系统识别服务启动失败（CLIENT），请在设置中使用内置离线识别',
  'asr-busy':'系统识别服务正忙，可用内置离线识别',
  'asr-network':'系统识别网络失败，可用内置离线识别',
  'asr-audio':'系统服务未能采集声音，请检查麦克风占用',
  'asr-server':'系统识别服务返回错误，可用内置离线识别',
  'asr-rate-limit':'系统识别请求受限，可用内置离线识别',
  'asr-disconnected':'系统识别服务已断开，可用内置离线识别',
  'offline-model':'离线中文模型准备失败，请查看设置中的语音诊断',
  'offline-audio':'离线识别未能启动麦克风，请检查权限与占用',
  'offline-init':'离线识别引擎启动失败，请导出语音诊断',
  'start-failed': '语音识别没能启动，请重试',
  timeout: '识别超时，请重试',
  cancelled: '本轮已取消',
}

export function describeAsrFailure(failure: AsrFailure): string {
  return FAILURE_TEXT[failure]
}

/** 供界面判断能否进入听旨态：已配置且协议已核对 */
export function isAsrReady(state: ProviderState): boolean {
  return state === 'ready'
}

function makeSessionId() {
  return `asr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createAsrController(
  provider: AsrProvider,
  options: AsrControllerOptions,
): AsrController {
  const timeoutMs = options.finalTimeoutMs ?? provider.finalTimeoutMs ?? 8000
  let current: { id: string; session: AsrSession; settled: boolean } | null = null
  let ui: AsrUiState = { phase: 'idle', partial: '' }
  let timer: ReturnType<typeof setTimeout> | undefined
  let waiter: (() => void) | undefined

  function emit(patch: Partial<AsrUiState>) {
    ui = { ...ui, ...patch }
    options.onState?.(ui)
  }

  function isLive(sessionId: string) {
    return current !== null && current.id === sessionId && !current.settled
  }

  function releaseWaiter() {
    const resolve = waiter
    waiter = undefined
    resolve?.()
  }

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function release() {
    clearTimer()
    if (!current) return
    try {
      current.session.cancel()
      current.session.dispose()
    } catch {
      // 释放失败不影响状态收口
    }
    current = null
  }

  function finish(sessionId: string, text: string, rawText?:string) {
    if (!isLive(sessionId)) return // 旧会话 / 已取消 / 已结束：丢弃
    if (current?.settled) return // 重复 final：只认一次
    const value = text.trim()
    if (!value) return // 空 final 不作为识别结果
    if (current) current.settled = true
    clearTimer()
    const id = sessionId
    release()
    emit({ phase: 'idle', sessionId: undefined, partial: '', failure: undefined, message: undefined })
    releaseWaiter()
    options.onFinal(value, id, rawText)
  }

  function fail(sessionId: string | undefined, failure: AsrFailure) {
    if (sessionId && !isLive(sessionId) && current?.id !== sessionId) return
    clearTimer()
    release()
    emit({
      phase: 'error',
      sessionId: undefined,
      partial: '',
      failure,
      message: describeAsrFailure(failure),
    })
    releaseWaiter()
  }

  async function start() {
    if (!isAsrReady(provider.state)) {
      fail(undefined, 'not-configured')
      return
    }
    if (current) return

    const sessionId = makeSessionId()
    ui = { phase: 'starting', sessionId, partial: '' }
    options.onState?.(ui)

    // 先占位，防止 open 期间重复点击
    const noop = async (): Promise<void> => undefined
    const placeholder: { id: string; session: AsrSession; settled: boolean } = {
      id: sessionId,
      session: {
        sessionId,
        start: noop,
        stop: noop,
        cancel: () => undefined,
        dispose: () => undefined,
      },
      settled: false,
    }
    current = placeholder

    try {
      const session = await provider.open(sessionId, {
        onPartial: (text) => {
          if (!isLive(sessionId)) return
          emit({ partial: text })
        },
        onRecognizing: () => {if(isLive(sessionId))emit({phase:'recognizing'})},
        onFinal: (text,rawText) => finish(sessionId, text,rawText),
        onError: (failure) => fail(sessionId, failure),
      })
      if (!isLive(sessionId)) {
        // 打开过程中已被取消
        session.cancel()
        session.dispose()
        return
      }
      placeholder.session = session
      await session.start()
      if (!isLive(sessionId)) return
      if(ui.phase==='starting')emit({ phase: 'listening' })
    } catch (error) {
      fail(sessionId, classifyStartFailure(error))
    }
  }

  async function stop() {
    const record = current
    if (!record || record.settled) return
    emit({ phase: 'recognizing' })

    const finalArrived = new Promise<void>((resolve) => {
      waiter = resolve
    })
    timer = setTimeout(() => {
      if (isLive(record.id)) fail(record.id, 'timeout')
    }, timeoutMs)

    try {
      await record.session.stop()
    } catch (error) {
      fail(record.id, classifyStartFailure(error))
      return
    }
    // stop 只是请求结束采音，最终文本仍须等 onFinal；超时会安全收口
    await finalArrived
  }

  function cancel(reason = '本轮已取消') {
    const sessionId = current?.id
    if (sessionId) fail(sessionId, 'cancelled')
    emit({ phase: 'idle', sessionId: undefined, partial: '', failure: 'cancelled', message: reason })
  }

  function dispose() {
    release()
    // 离页 / 卸载只做资源释放，不在新界面上留提示
    emit({ phase: 'idle', sessionId: undefined, partial: '', failure: undefined, message: undefined })
    releaseWaiter()
  }

  return {
    state: () => ui,
    isConfigured: () => isAsrReady(provider.state),
    start,
    stop,
    cancel,
    dispose,
  }
}

function classifyStartFailure(error: unknown): AsrFailure {
  const message = error instanceof Error ? error.message : String(error)
  if(["asr-too-long", "asr-client", "asr-busy", "asr-network", "asr-audio", "asr-server", "asr-rate-limit", "asr-disconnected", "offline-model", "offline-audio", "offline-init"].includes(message))return message as AsrFailure
  if(message==='language')return 'language'
  if(message==='service-missing')return 'service-missing'
  if(message==='cancelled')return 'cancelled'
  if(message==='timeout')return 'timeout'
  if (/permission|denied|not authorized|拒权/i.test(message)) return 'permission'
  if (/no.?speech|无语音/i.test(message)) return 'no-speech'
  if (/missing|unavailable|not.?available|不支持/i.test(message)) return 'service-missing'
  return 'start-failed'
}
