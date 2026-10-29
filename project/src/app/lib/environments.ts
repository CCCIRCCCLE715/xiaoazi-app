import audienceHallBg from '@/assets/ui/audience_hall-v2.png'
import bedchamberBg from '@/assets/ui/bedchamber-v2.png'
import restaurantBg from '@/assets/ui/restaurant-v2.png'
import streetBg from '@/assets/ui/street-v2.png'

/**
 * 四环境场景注册表（集中配置）。
 *
 * 触发词以随包 `scenes/scene-config.json` 为准，只补充少量同义表达；
 * 后续要调整规则，改这一处即可。
 *
 * 环境只决定「舞台背景 + 当前话题」，与设备调用完全解耦：
 * 进入古代街道不等于已打开地图，进入古代餐馆不等于已下单。
 *
 * 四张v2背景由imagegen重新生成，纵深留白、低对比，原图另存；
 * 角色视频与海报仍为 1440×1440。手机端构图与合成效果待真机验收。
 */

export type EnvironmentId = 'bedchamber' | 'audience_hall' | 'restaurant' | 'street'

export interface EnvironmentDef {
  id: EnvironmentId
  name: string
  /** 进入该环境的表达 */
  enter: string[]
  /** 背景素材 */
  background: string
}

export const DEFAULT_ENVIRONMENT: EnvironmentId = 'bedchamber'

export const ENVIRONMENTS: EnvironmentDef[] = [
  {
    id: 'bedchamber',
    name: '寝宫',
    enter: ['回寝宫', '回宫', '休息', '晚安', '睡觉', '歇着'],
    background: bedchamberBg,
  },
  {
    id: 'audience_hall',
    name: '早朝',
    enter: ['早朝', '议事', '安排今天', '工作', '上朝'],
    background: audienceHallBg,
  },
  {
    id: 'restaurant',
    name: '传膳',
    enter: ['今天吃什么', '吃饭', '饿了', '外卖', '传膳', '用膳'],
    background: restaurantBg,
  },
  {
    id: 'street',
    name: '摆驾',
    enter: ['今天去哪玩', '出去逛逛', '去哪玩', '路线', '导航', '摆驾', '出宫'],
    background: streetBg,
  },
]

export function findEnvironment(id: EnvironmentId): EnvironmentDef {
  return ENVIRONMENTS.find((item) => item.id === id) ?? ENVIRONMENTS[0]
}

/** 引用而非指令：把词放进引号、或在「你说 / 刚才说 / 提到」之后，不触发切换 */
function isQuotedOrMentioned(text: string, word: string): boolean {
  const index = text.indexOf(word)
  if (index < 0) return false
  const before = text.slice(Math.max(0, index - 6), index)
  if (/[「『"“'‘]/.test(before) || /你说|你说过|刚才说|刚说|提到|说起/.test(before)) return true
  return /[」』"”'’]/.test(text.slice(index + word.length, index + word.length + 2))
}

/** 否定：否定词紧邻关键词时不触发 */
function isNegated(text: string, word: string): boolean {
  const index = text.indexOf(word)
  if (index < 0) return false
  const before = text.slice(Math.max(0, index - 5), index)
  if (/别人|别处|别的|别家/.test(before)) return false
  return /不要|不用|不必|别|甭|不想/.test(before)
}

export interface EnvironmentResolution {
  /** 未匹配到有效切换时保持当前环境 */
  next: EnvironmentId
  /** 命中但被否定 / 引用 / 歧义时，记录原因用于诊断 */
  blocked?: 'negated' | 'quoted' | 'ambiguous' | 'no-match'
  matched?: EnvironmentId
}

/**
 * 只在「最终有效意图」上切换：
 * - 否定、引用不触发
 * - 一句话同时命中多个环境视为歧义，保持当前环境
 * - 无匹配保持当前环境
 */
export function resolveEnvironment(text: string, current: EnvironmentId): EnvironmentResolution {
  const hits = new Set<EnvironmentId>()
  let sawNegated = false
  let sawQuoted = false

  for (const env of ENVIRONMENTS) {
    for (const word of env.enter) {
      if (!text.includes(word)) continue
      if (isNegated(text, word)) {
        sawNegated = true
        continue
      }
      if (isQuotedOrMentioned(text, word)) {
        sawQuoted = true
        continue
      }
      hits.add(env.id)
    }
  }

  if (hits.size === 0) {
    if (sawNegated) return { next: current, blocked: 'negated' }
    if (sawQuoted) return { next: current, blocked: 'quoted' }
    return { next: current, blocked: 'no-match' }
  }
  if (hits.size > 1) return { next: current, blocked: 'ambiguous' }

  const matched = [...hits][0]
  return { next: matched, matched }
}
