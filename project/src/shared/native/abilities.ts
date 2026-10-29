/**
 * 本 App 实际用到的设备原子能力。
 * 能力名与参数均取自当前项目已接入的连接器清单，不要凭记忆新增。
 */

import { callAbility } from './mcp'

/* ---------------- 语音播报（TTS · speak_text） ---------------- */

export function speakText(text: string) {
  return callAbility('speak_text', { text })
}

export function stopSpeakText() {
  return callAbility('stop_speak_text', {})
}

/* ---------------- 日历（日历 · calendar_*） ---------------- */

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatDateTime(date: Date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

export function queryTodayEvents() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 0)
  return callAbility('calendar_query_event', {
    start_time: formatDateTime(start),
    end_time: formatDateTime(end),
  })
}

export function addEvent(input: {
  title: string
  startTime: string
  endTime: string
  description?: string
  location?: string
}) {
  return callAbility('calendar_add_event', {
    title: input.title,
    start_time: input.startTime,
    end_time: input.endTime,
    description: input.description ?? '',
    location: input.location ?? '',
    is_all_day: false,
  })
}

/* ---------------- 剪贴板 / 应用 / 浏览器（通用原子能力） ---------------- */

export function readClipboard() {
  return callAbility('common_ability_clipboard_text', {})
}

export function openAppByName(appName: string) {
  return callAbility('open_app_by_name', { appName })
}

export function openAppActivity(packageName: string, className: string) {
  return callAbility('open_app_by_package', { packageName, className })
}

export function openUrl(url: string) {
  return callAbility('open_url_with_browser', { url })
}

export function getAppList() {
  return callAbility('common_ability_get_app_list', {})
}

/* ---------------- 短信（信息 · sms_*） ---------------- */

export function saveSmsDraft(phone: string, message: string) {
  return callAbility('sms_draft_save', { phone_number: phone, message })
}

export function sendSmsDirect(phone: string, message: string) {
  return callAbility('sms_send_direct', { phone, message })
}

/* ---------------- 触感反馈（通用原子能力 · start_vibration） ---------------- */

export function vibrate(durationMs = 30) {
  return callAbility('start_vibration', { duration_ms: durationMs })
}
