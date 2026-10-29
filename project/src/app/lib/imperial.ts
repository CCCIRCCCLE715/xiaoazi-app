/**
 * 圣旨簿的共享类型。
 * 场景台词与候选内容在 scenes.ts，不要在这里重复定义。
 */

export type EdictKind = 'kitchen' | 'morning' | 'memorial' | 'march' | 'entertain' | 'chat'

export type EdictStatus = 'proposed' | 'approved' | 'held' | 'revoked' | 'done' | 'failed'

export const XIAOA_NAME = '小A子'
