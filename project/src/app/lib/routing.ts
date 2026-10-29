/**
 * 有限脚本的纯判定逻辑。
 * 单独成文件是为了能脱离 React 做行为断言（见 fixtures/scene-routing.test.ts）。
 */

export type PendingCommand = 'approve' | 'revise' | 'hold' | 'revoke'

/** 待确认项上的口令。顺序有讲究：先判否定，再判肯定。 */
export function resolvePendingCommand(text: string): PendingCommand | undefined {
  if (/撤旨|算了|不办了|取消刚才|取消这个|不做了/.test(text)) return 'revoke'
  if (/留中|稍后|等会儿|回头再说/.test(text)) return 'hold'
  if (/重拟|再写|换一种|重新拟/.test(text)) return 'revise'
  if (/准奏|照办|就这么办|就这么定|确认执行/.test(text)) return 'approve'
  return undefined
}

/** 只有明确承认「是老板」才认怂；无关或被否定的老板不触发 */
export function isBossConfession(text: string): boolean {
  if (/不是老板|别是老板|不是他/.test(text)) return false
  return /是老板|老板来了|就是老板/.test(text)
}

/** 取消整轮表演 / 停止播报 */
export function isStopCommand(text: string): boolean {
  return /停下|别说了|别播了|收起来|不听了|停止/.test(text)
}

/** 一句话里既有否定又指向外卖时，只作为否定，不进入传膳 */
export function isKitchenDenied(text: string): boolean {
  return /不要(点|订|买)?外卖|不用(点|订)?外卖|别(点|订)?外卖/.test(text)
}

/**
 * 轮次序号：新请求 / 取消 / 离页都会推进序号。
 * 旧异步回调拿到的 epoch 与当前不一致时，必须放弃界面更新
 * （真实设备回执仍按原记录落账，两者互不影响）。
 */
export function createEpoch() {
  let current = 0
  return {
    next: () => ++current,
    current: () => current,
    isCurrent: (epoch: number) => epoch === current,
  }
}

/**
 * 回执应用策略：真实设备回执始终落到原记录；
 * 只有回执仍属于当前轮次时，才允许更新新界面。
 * 取消、重拟、切场景、离页都会推进 epoch，使旧回执失去界面更新权。
 */
export function applyReceipt(options: {
  epoch: ReturnType<typeof createEpoch>
  token: number
  onRecord: () => void
  onUi: () => void
}): { recordUpdated: true; uiUpdated: boolean } {
  options.onRecord()
  if (!options.epoch.isCurrent(options.token)) {
    return { recordUpdated: true, uiUpdated: false }
  }
  options.onUi()
  return { recordUpdated: true, uiUpdated: true }
}

/**
 * 最新请求守卫：快速连续切换时，只允许最后一次请求生效。
 * 用于背景预解码：旧图的解码结果晚到时不得覆盖新图。
 */
export function createLatestGuard() {
  let current = 0
  return {
    begin: () => ++current,
    isCurrent: (id: number) => id === current,
  }
}

/**
 * 提交锁：准奏连点、新输入与在途执行之间的互斥。
 * 第一次进入后，后续调用直接返回 undefined，不重复发起设备调用。
 */
export function createSubmitLock() {
  let locked = false
  return {
    isLocked: () => locked,
    async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (locked) return undefined
      locked = true
      try {
        return await fn()
      } finally {
        locked = false
      }
    },
  }
}
