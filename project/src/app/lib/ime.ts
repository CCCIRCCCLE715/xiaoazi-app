/**
 * 输入法（IME）与发送判定。
 *
 * 中文输入法组合期间按回车是在选词，不能当成发送；
 * 组合刚结束的极短时间内也可能再收到一次 Enter，需要短暂保护。
 */
export interface EnterKeyState {
  key: string
  shiftKey: boolean
  /** React 合成事件上的 nativeEvent.isComposing */
  isComposing: boolean
  /** 组件自己维护的组合状态 */
  compositionActive: boolean
  /** 组合结束后保护期截止时间戳（毫秒） */
  guardUntil?: number
  /** 当前时间戳，测试可注入 */
  now?: number
}

export function shouldSubmitOnEnter(state: EnterKeyState): boolean {
  if (state.key !== 'Enter' || state.shiftKey) return false
  if (state.isComposing || state.compositionActive) return false
  const now = state.now ?? Date.now()
  if (state.guardUntil !== undefined && now < state.guardUntil) return false
  return true
}

/** 空白（含全角空格）不发送 */
export function canSend(text: string): boolean {
  return text.replace(/[\s　]/g, '').length > 0
}
