/**
 * 场景集中配置：场景 → 背景 → 候选动作 → 结果 UI。
 *
 * 这里的 action 是「现有合格候选」的临时映射，不是为每个场景定制的新动作；
 * 等专用动作补交后，只需改这张表，不必改页面与状态机。
 *
 * 所有候选视频仍保持 1440×1440 / 24fps / 原速 / 透明 / contain，
 * 已拒收的裁切段（present / cower / cheer）不在此表出现。
 */

import {ENDING_APOLOGY} from './ending-apology-config'
import kitchenMealVoice from '@/assets/audio/kitchen-meal.mp3'
export {default as MORNING_RING_VOICE} from '@/assets/audio/wakeup.wav'
import protectHelpVoice from '@/assets/audio/protect-help-tail-clean.wav'
import poemPraiseVoice from '@/assets/audio/poem-praise-tail-clean.wav'
import todoPresentVoice from '@/assets/audio/todo-present.mp3'
import workDeadlineVoice from '@/assets/audio/todo-deadline.mp3'
import musicIntroVoice from '@/assets/audio/music-intro.mp3'
import marchQueryVoice from '@/assets/audio/march-query.mp3'
import idleGreetingVoice from '@/assets/audio/idle-greeting.mp3'
import homeGreetingVoice from '@/assets/audio/home-greeting.mp3'
export const MARCH_QUERY_VOICE=marchQueryVoice
export const IDLE_GREETING_VOICE=idleGreetingVoice
export const HOME_GREETING_VOICE=homeGreetingVoice
import marchRideVoice from '@/assets/audio/march-ride-tail-clean.wav'
import { MUSIC_GESTURE } from './music-config'
import type { ActionId } from '../components/CharacterStage'
import type { EnvironmentId } from './environments'
import type { SceneId } from './scenes'

export interface SceneDefinition {
  scene: Exclude<SceneId, 'idle'>
  /** 进入后切换到的背景 */
  environment: EnvironmentId
  /** 该场景默认播放的候选动作（临时映射） */
  action: ActionId
  /** 结果 UI 的卡片类型；none 表示只回一句话 */
  card: 'work' | 'todo' | 'kitchen' | 'coupons' | 'morning' | 'memorial' | 'march' | 'music' | 'none'
  keywords: string[]
  /** 临时映射说明，开发记录用，不上界面 */
  temporary?: string
  voice?: { src:string; placeholder:boolean }
}

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {scene:'coupons',environment:'restaurant',action:'point',card:'coupons',keywords:['优惠券','团购券','没钱了','囊中羞涩','手头紧'],temporary:'复用 point；未提供专用配音，不播放用膳台词'},
  {scene:'work',voice:{src:workDeadlineVoice,placeholder:false},environment:'audience_hall',action:ENDING_APOLOGY.action,card:'work',keywords:['工作安排','工作文件','甲方催稿']},
  {scene:'todo',voice:{src:todoPresentVoice,placeholder:false},environment:'audience_hall',action:'scroll',card:'todo',keywords:['批奏折','今日待办','待办清单'],temporary:'v9单侧右下呈示试用候选，上抬前奏和宽高光偏亮，用户外观审核待定'},
  {
    scene: 'kitchen',
    voice: { src:kitchenMealVoice, placeholder:false },
    environment: 'restaurant',
    action: 'think',
    card: 'kitchen',
    keywords: ['今天吃什么', '吃饭', '饿了', '传膳', '想吃', '外卖', '猪脚', '肯德基', '大米先生', '美食列表', '美食清单', '御膳房'],
    temporary: 'think 只是最接近的现有候选，不是专用「思量菜单」动作',
  },
  {
    scene: 'march',
    voice: { src:marchRideVoice, placeholder:false },
    environment: 'street',
    action: 'point',
    card: 'march',
    keywords: ['去哪玩', '出去逛逛', '路线', '导航', '摆驾', '出宫', '出行', '出门', '低调',  '御驾亲蹬', '骑行', '骑车', '打车'],
    temporary: 'point 为现有指向候选，落点与保持时间仍待验',
  },
  {
    scene: 'morning',
    environment: 'audience_hall',
    action: 'greet',
    card: 'morning',
    keywords: ['早朝', '议事', '安排今天', '工作', '上朝', '日程', '叫醒', '唤醒', '起床', '早上好'],
  },
  {
    scene: 'protect',
    voice:{src:protectHelpVoice,placeholder:false},
    environment: 'bedchamber',
    action: 'protect',
    card: 'none',
    keywords: ['护驾', '有人凶朕', '凶朕', '谁敢', '骂我', '很烦', '烦死', '不开心'],
    temporary: 'protect 缺完整起势与回位；认怂段已拒收，不播放',
  },
  {scene:'client-ending',environment:'bedchamber',action:ENDING_APOLOGY.previewEnabled?'ending-apology':'idle',card:'none',voice:{src:ENDING_APOLOGY.voice.src,placeholder:false},keywords:['甲方又发来要求了','甲方好烦啊','客户又催稿了','甲方要再改一版','在群里我不是皇上吗'],temporary:'Root-authorized dedicated bow review candidate; full1x motion, user visual acceptance pending; no UI or reply bubble'},
  {
    scene: 'ending',
    environment: 'bedchamber',
    action: 'ending',
    card: 'none',
    keywords: ['晚安', '回寝宫', '回宫', '休息', '睡觉', '我要睡了', '朕不是皇上'],
  },
  {
    scene: 'memorial',
    environment: 'audience_hall',
    action: 'reply',
    card: 'memorial',
    keywords: ['回消息', '回这条', '回复草稿'],
  },
  {
    scene: 'music',
    voice:{src:musicIntroVoice,placeholder:false},
    environment: 'bedchamber',
    action: MUSIC_GESTURE.previewEnabled?MUSIC_GESTURE.action:'idle',
    card: 'music',
    keywords: ['听曲', '垂帘听曲', '放首歌', '听歌', '选一首曲子'],
    temporary: '新轻点片获准内部预览，星角拉长和短扁眼未过最终验收',
  },
  {
    scene: 'poem',
    voice: { src:poemPraiseVoice, placeholder:false },
    environment: 'bedchamber',
    action: 'scroll',
    card: 'none',
    keywords: ['作诗', '捧场', '诗句', '窗前一杯水，喝完再接水', '窗前一杯水,喝完再接水'],
    temporary: '斜展好诗卷，尚未完成背后取藏',
  },
]

export function findSceneDefinition(scene: string): SceneDefinition | undefined {
  return SCENE_DEFINITIONS.find((item) => item.scene === scene)
}

/** 点击小A子时的反应：按当前环境挑一个现有合格候选 */
export const REACTION_CONFIG: Record<
  EnvironmentId,
  { actions: ActionId[]; lines: string[] }
> = {
  bedchamber: {
    actions: ['reply', 'listen'],
    lines: ['陛下，小A子在。', '臣候着呢，陛下吩咐。', '陛下可是有话要说？'],
  },
  audience_hall: {
    actions: ['reply', 'think'],
    lines: ['臣在听，陛下请讲。', '今日议事，臣记着呢。', '陛下有何吩咐？'],
  },
  restaurant: {
    actions: ['think', 'reply'],
    lines: ['陛下想吃点什么？', '御膳房候着旨意。', '臣这就去问问。'],
  },
  street: {
    actions: ['point', 'reply'],
    lines: ['陛下要往哪儿去？', '车驾候着，听陛下示下。', '臣把路看着呢。'],
  },
}
