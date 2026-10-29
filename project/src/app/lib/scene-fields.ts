export function parseBudget(text: string): number | undefined {
  const arabic = text.match(/(\d{1,3})\s*(?:元|文|块|以内|以下)/)
  if (arabic) return Number(arabic[1])
  const chinese = text.match(/([零一二两三四五六七八九十]{1,3})\s*(?:元|文|块|以内|以下)/)
  if (!chinese) return undefined
  const map: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  }
  const raw = chinese[1]
  if (raw === '十') return 10
  const ten = raw.indexOf('十')
  if (ten >= 0) {
    const tens = ten === 0 ? 1 : map[raw[ten - 1]]
    const ones = ten === raw.length - 1 ? 0 : map[raw[ten + 1]]
    if (tens === undefined || ones === undefined) return undefined
    return tens * 10 + ones
  }
  return map[raw]
}

export function parseAddress(text: string): string | undefined {
  const match = text.match(/(?:送到\s*([^，。,.!！\s]{1,20})|送\s*(公司|家里|家|办公室)(?=[，。,.!！\s]|$))/)
  return match?.[1] ?? match?.[2]
}

