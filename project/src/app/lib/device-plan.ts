/**
 * 设备动作参数规划（纯函数，可隔离测试）。
 *
 * 只根据「本次已保存的卡片」生成调用参数；未填必填字段直接拒绝，
 * 不静默换默认值。生产环境不注册任何模拟适配器，这里只产出计划。
 */

import type {SceneCard} from './scenes'
import {validKitchenDelivery} from './kitchen-delivery.ts'

export type DeviceTask = 'query-calendar' | 'open-alipay' | 'save-draft' | 'open-map'

export type DevicePlan =
  | { kind: 'query-calendar' }
  | { kind: 'open-app'; appName: string; summary: string; merchantId?: string }
  | { kind: 'save-draft'; phone: string; message: string }

export type PlanResult = { ok: true; plan: DevicePlan } | { ok: false; reason: string }

export function buildDevicePlan(task: DeviceTask, card?: SceneCard): PlanResult {
  if(card?.kind==='todo'||card?.kind==='work')return {ok:false,reason:'今日待办仅在本地保存。'}
  switch (task) {
    case 'query-calendar':
      return { ok: true, plan: { kind: 'query-calendar' } }

    case 'open-alipay': {
      if (card?.kind !== 'kitchen') return { ok: false, reason: '没有可确认的传膳方案。' }
      const selected = card.dishes.find(dish => dish.name === card.selectedDish)
      if (!selected) return { ok: false, reason: '请选一道菜。' }
      if (card.budget != null && selected.price > card.budget) return { ok: false, reason: '这道菜超出预算。' }
      if (!validKitchenDelivery(card)) return {ok:false,reason:'请补全地址、联系人和手机号。'}
      return {
        ok: true,
        plan: {
          kind: 'open-app',
          appName: '美团',
          merchantId: selected.merchantId,
          summary: `${selected.name} · 送到 ${card.address}${card.budget != null ? ` · 预算 ${card.budget} 文` : ''}`,
        },
      }
    }

    case 'open-map': {
      if (card?.kind !== 'march') return { ok: false, reason: '没有可确认的出行方案。' }
      if (!card.destination) return { ok: false, reason: '目的地还没定，臣不敢乱走。' }
      if (!card.mode) return { ok: false, reason: '出行方式还没选，臣不敢乱走。' }
      return {
        ok: true,
        plan: { kind: 'open-app', appName: '高德地图', summary: `去 ${card.destination} · ${card.mode}` },
      }
    }

    case 'save-draft': {
      if (card?.kind !== 'memorial') return { ok: false, reason: '没有可保存的回复草稿。' }
      return { ok: true, plan: { kind: 'save-draft', phone: card.recipient, message: card.draft } }
    }

    default:
      return { ok: false, reason: '这个动作还没有接好。' }
  }
}
