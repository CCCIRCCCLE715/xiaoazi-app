/**
 * 设备侧原子能力调用封装。
 *
 * 链路：页面 → window.mcp.callTool(能力名, 参数) → 壳的 capsule.js → AbilityMcpClient。
 * 这是设备侧 MCP 桥，不走 capsule.invoke，也不在 capsule-native-api 的接口索引里。
 *
 * 失败语义：
 *  - Promise 拒绝 → 失败
 *  - 返回 isError === true → 失败
 * 两种都归一成 DeviceError；原始错误只写进诊断日志，页面只拿到安全文案。
 */

import { nativeLog } from '@/shared/bridge'

interface McpBridge {
  connect?: () => Promise<unknown>
  listTools?: () => Promise<unknown>
  callTool?: (name: string, args?: Record<string, unknown>) => Promise<unknown>
}

declare global {
  interface Window {
    mcp?: McpBridge
  }
}

export type DeviceFailure =
  | 'no-bridge' // 浏览器预览 / 壳未提供 MCP 桥
  | 'connect-failed' // 设备侧服务没起来
  | 'rejected' // 调用被拒绝
  | 'execution-failed' // 能力执行返回失败

export class DeviceError extends Error {
  readonly reason: DeviceFailure
  readonly ability: string

  constructor(reason: DeviceFailure, ability: string, message: string) {
    super(message)
    this.name = 'DeviceError'
    this.reason = reason
    this.ability = ability
  }
}

const LOG_TAG = 'device-mcp'

/** 桥是否可用。仅检查对象存在不足以证明原生服务可用，connect 成功才算数。 */
let readyPromise: Promise<boolean> | undefined

export function checkDeviceBridge(): Promise<boolean> {
  if (readyPromise) return readyPromise

  readyPromise = (async () => {
    const bridge = typeof window === 'undefined' ? undefined : window.mcp
    if (!bridge || typeof bridge.callTool !== 'function') return false
    if (typeof bridge.connect !== 'function') return true
    try {
      await bridge.connect()
      return true
    } catch (error) {
      nativeLog.w(LOG_TAG, `connect failed: ${safeMessage(error)}`)
      return false
    }
  })()

  return readyPromise
}

/** 重新探测（用户点「重试」时用）。 */
export function resetDeviceBridge(): void {
  readyPromise = undefined
}

interface RawResult {
  isError?: boolean
  text?: string
  errorCode?: number
  errorMsg?: string
}

export interface AbilityResult {
  text: string
  raw: unknown
}

export async function callAbility(
  name: string,
  args: Record<string, unknown> = {},
): Promise<AbilityResult> {
  const available = await checkDeviceBridge()
  if (!available) {
    throw new DeviceError('no-bridge', name, '当前环境没有连接手机的设备能力服务')
  }

  const bridge = window.mcp
  if (!bridge?.callTool) {
    throw new DeviceError('no-bridge', name, '当前环境没有连接手机的设备能力服务')
  }

  let raw: unknown
  try {
    raw = await bridge.callTool(name, args)
  } catch (error) {
    nativeLog.e(LOG_TAG, `${name} rejected: ${safeMessage(error)}`)
    throw new DeviceError('rejected', name, '设备服务没有响应这个操作')
  }

  const result = (raw ?? {}) as RawResult
  if (result.isError === true) {
    nativeLog.e(
      LOG_TAG,
      `${name} failed: code=${result.errorCode ?? '?'} msg=${safeMessage(result.errorMsg)}`,
    )
    throw new DeviceError('execution-failed', name, '手机没有完成这个操作')
  }

  return { text: typeof result.text === 'string' ? result.text : '', raw }
}

function safeMessage(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 300)
  if (value instanceof Error) return value.message.slice(0, 300)
  return String(value).slice(0, 300)
}

/** 给界面看的失败文案：不暴露原始错误。 */
export function describeDeviceError(error: unknown): string {
  if (error instanceof DeviceError) {
    switch (error.reason) {
      case 'no-bridge':
        return '手机服务尚未接入，操作未执行。'
      case 'connect-failed':
        return '手机的服务暂时没有响应，稍后再试一次。'
      case 'rejected':
        return '这个操作没有被手机接受，请稍后再试。'
      case 'execution-failed':
        return '手机没有完成这个操作，请稍后再试。'
    }
  }
  return '出了点岔子，请稍后再试。'
}
