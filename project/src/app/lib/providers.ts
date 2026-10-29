/**
 * Shared provider types and legacy placeholders.
 * v8 standalone runtime uses native-assistant.ts: Keystore-backed native HTTPS
 * dialogue and bundled non-streaming SenseVoice. The CourtPage/useCourt paths call that
 * adapter directly; these legacy object exports are not the active configuration.
 * Map/Step capsule device abilities remain unconfigured. Model text never executes tools.
 */

export type ProviderState = 'unconfigured' | 'unverified' | 'ready'

export class ProviderUnavailableError extends Error {
  readonly provider: string

  constructor(provider: string) {
    super(`${provider} 尚未配置`)
    this.name = 'ProviderUnavailableError'
    this.provider = provider
  }
}

/* ---------------- Model Provider ---------------- */

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ModelRequest {
  messages: ModelMessage[]
  /** 只允许模型从这份白名单里选择工具 */
  tools: readonly string[]
}

export interface ModelReply {
  text: string
  intent?: StructuredIntent
}

export interface ModelProvider {
  id: string
  state: ProviderState
  complete: (request: ModelRequest) => Promise<ModelReply>
}

export const modelProvider: ModelProvider = {
  id: 'unconfigured',
  state: 'unconfigured',
  async complete() {
    throw new ProviderUnavailableError('模型服务')
  },
}

/* ---------------- ASR Provider ---------------- */

export type AsrFailureReason =
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

export interface AsrProviderEvents {
  /** 采音已结束，正在等待最终结果 */
  onRecognizing?: () => void
  /** 中间结果：只用于展示，不触发业务 */
  onPartial: (text: string) => void
  /** 最终结果：每个会话只应到达一次 */
  onFinal: (text: string, rawText?:string) => void
  onError: (failure: AsrFailureReason) => void
}

export interface AsrSession {
  sessionId: string
  start: () => Promise<void>
  /** 请求结束采音；最终文本通过 onFinal 送达 */
  stop: () => Promise<void>
  cancel: () => void
  dispose: () => void
}

export interface AsrProvider {
  id: string
  /** Release-to-final budget for a local non-streaming decoder. */
  finalTimeoutMs?: number
  /** 只有 'ready'（已配置且协议已核对）才允许进入会话链 */
  state: ProviderState
  open: (sessionId: string, events: AsrProviderEvents) => Promise<AsrSession>
}

export const asrProvider: AsrProvider = {
  id: 'unconfigured',
  state: 'unconfigured',
  async open() {
    throw new ProviderUnavailableError('语音识别服务')
  },
}

/* ---------------- Map Adapter ---------------- */

export interface RouteRequest {
  from: string
  to: string
  mode: 'driving' | 'riding' | 'walking'
}

export interface RouteResult {
  distanceMeters: number
  durationSeconds: number
  /** 数据来源：真实服务或脚本示意 */
  source: 'provider' | 'script'
}

export interface MapAdapter {
  id: string
  state: ProviderState
  route: (request: RouteRequest) => Promise<RouteResult>
}

export const mapAdapter: MapAdapter = {
  id: 'unconfigured',
  state: 'unconfigured',
  async route() {
    throw new ProviderUnavailableError('地图服务')
  },
}

/* ---------------- 结构化意图：本地白名单与校验 ---------------- */

/** 只允许这些设备能力被结构化意图触发；新增能力必须先核对 schema */
export const ALLOWED_TOOLS = [
  'calendar_query_event',
  'calendar_add_event',
  'common_ability_clipboard_text',
  'sms_draft_save',
  'open_app_by_name',
  'open_app_by_package',
  'speak_text',
  'stop_speak_text',
  'start_vibration',
] as const

export type AllowedTool = (typeof ALLOWED_TOOLS)[number]

/** 会离开本 App 或改变系统状态的动作，必须经用户确认 */
const CONFIRM_REQUIRED: ReadonlySet<AllowedTool> = new Set([
  'calendar_add_event',
  'sms_draft_save',
  'open_app_by_name',
  'open_app_by_package',
])

export interface StructuredIntent {
  tool: string
  args: Record<string, unknown>
  requiresConfirm: boolean
}

export type IntentValidation =
  | { ok: true; intent: StructuredIntent }
  | { ok: false; reason: string }

/** 参数校验：类型、范围、必填；不通过就不执行 */
export function validateIntent(raw: unknown): IntentValidation {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: '意图不是对象' }
  }
  const candidate = raw as { tool?: unknown; args?: unknown }
  if (typeof candidate.tool !== 'string' || !candidate.tool) {
    return { ok: false, reason: '缺少工具名' }
  }
  if (!(ALLOWED_TOOLS as readonly string[]).includes(candidate.tool)) {
    return { ok: false, reason: `工具不在白名单：${candidate.tool}` }
  }
  const tool = candidate.tool as AllowedTool
  const args =
    typeof candidate.args === 'object' && candidate.args !== null
      ? (candidate.args as Record<string, unknown>)
      : {}

  if (tool === 'calendar_query_event') {
    if (typeof args.start_time !== 'string' || typeof args.end_time !== 'string') {
      return { ok: false, reason: '查询日程缺少起止时间' }
    }
  }

  if (tool === 'open_app_by_name') {
    if (typeof args.appName !== 'string' || !args.appName.trim()) {
      return { ok: false, reason: '缺少应用名' }
    }
  }

  if (tool === 'sms_draft_save') {
    if (typeof args.message !== 'string' || !args.message.trim()) {
      return { ok: false, reason: '短信草稿为空' }
    }
  }

  return {
    ok: true,
    intent: { tool, args, requiresConfirm: CONFIRM_REQUIRED.has(tool) },
  }
}
