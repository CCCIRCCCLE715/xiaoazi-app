import {isCouponIntent} from './coupon-intent'
import {DEFAULT_KITCHEN_DELIVERY} from './kitchen-delivery'
import {bossDraftChallenge} from './preset-commands'
import {isClientComplaint,isRestIntent} from './client-ending-intent'
import { isMusicIntent } from './music-intent'
import { isTodoIntent,isWorkIntent } from './todo-intent'
import { parseBudget, parseAddress } from './scene-fields'
export { parseBudget, parseAddress } from './scene-fields'
import type { ActionId } from '../components/CharacterStage'
import { SCENE_DEFINITIONS, findSceneDefinition } from './scene-config'
import {isNonCommand, isWakeIntent, parseWakeTime, isProtectionIntent, isSceneDenied, isMarchInformation } from './wakeup'
import type { EnvironmentId } from './environments'

/**
 * 八个使用场景的有限脚本。
 * 台词与边界来自《皇上模拟器 v5》与《语音接入与动作切段补充方案》。
 * 这是演示脚本，不接实时大模型；对外需标注「超前体验版本」。
 */

export type SceneId =
  | 'todo'
  | 'work'
  | 'idle'
  | 'morning'
  | 'kitchen'
  | 'coupons'
  | 'protect'
  | 'memorial'
  | 'march'
  | 'poem'
  | 'ending'
  | 'client-ending'
  | 'music'

export type SceneStage = 'idle' | 'collect' | 'confirm' | 'done'

export interface KitchenMerchant {
  merchantId: 'pork-rice' | 'kfc' | 'damixiansheng'
  aliases?: string[]
  id: string
  name: string
  merchantName: string
  note: string
  price: number
  rating: number
  distanceKm: number
  shareUrl: string
  menuUrl: string
}

export interface KitchenCard {
  kind: 'kitchen'
  selectedDish?: string | null
  /** 用户未提供时为 null，不默认成事实 */
  budget: number | null
  taste: string | null
  address: string | null
  contactName: string | null
  phone: string | null
  dishes: KitchenMerchant[]
}

export interface MorningCard {
  kind: 'morning'
  /** 空白表示尚未读取系统日历；draft 为用户本地草稿 */
  items: Array<{ title: string; time: string; place?: string; draft?: boolean }>
  suggestion: string
}

export interface MemorialCard {
  kind: 'memorial'
  source: string
  points: string[]
  draft: string
  recipient: string
}

export interface MarchCard {
  kind: 'march'
  /** 未填写时为 null，不默认成「公司」 */
  destination: string | null
  stage?: 'choose' | 'route'
  mode: '步行' | '打车' | '骑行' | null
  options: Array<{ label: '步行' | '打车' | '骑行'; detail: string; source: string }>
}

export interface MusicCard {
  kind: 'music'
  title: string
  artist: string
}

export interface TodoCard {
  selection?:import('./document-mode').WorkFileSelection;kind:'todo';document?:{id:string;name:string;items:Array<{title:string;dueLabel:string|null;sourceId:string;quote:string;label:string}>};command?:'approve'|'revise'|'hold';commandNonce?:number}

export interface WorkCard {kind:'work';selection?:import('./document-mode').WorkFileSelection;command?:'approve'|'revise'|'hold';commandNonce?:number}

export interface CouponsCard { kind:'coupons' }

export type SceneCard = CouponsCard | WorkCard | TodoCard | KitchenCard | MorningCard | MemorialCard | MarchCard | MusicCard

export interface SceneContext {
  sceneId: SceneId
  stage: SceneStage
  /** 传膳收集到的字段；null 表示用户还没提供 */
  budget?: number | null
  address?: string | null
  contactName?: string | null
  phone?: string | null
  taste?: string | null
  /** 护驾上下文：先护主，听到「是老板」才认怂 */
  protectReady?: boolean
  /** 当前是否有唯一待确认项 */
  pending?: boolean
}

export interface SceneReply {
  alarmTime?:string
  page?: 'alarm-ring'
  environment?: EnvironmentId
  text: string
  action: ActionId
  card?: SceneCard
  context: SceneContext
  /** 需要设备执行的动作类型，仅在准奏后触发 */
  task?: 'query-calendar' | 'open-alipay' | 'save-draft' | 'open-map'
}

export const EMPTY_CONTEXT: SceneContext = { sceneId: 'idle', stage: 'idle' }

// Ratings, distances and prices are configured display values, not live platform data.
// Menu URLs were resolved from the user's three share links on 2026-10-26.
const KITCHEN_MERCHANTS = {
 'pork-rice': {merchantName:'阿祥嫂隆江猪脚饭（绿汀路店）',rating:4.7,distanceKm:0.8,shareUrl:'http://dpurl.cn/iDtbFr6z',menuUrl:'https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str=gD8ern5C-jUHjOxPzI9pxgI'},
 kfc: {merchantName:'肯德基宅急送（余杭塘路二店）',rating:4.8,distanceKm:1.2,shareUrl:'http://dpurl.cn/5RszkGkz',menuUrl:'https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str=0mXmohyRUnuWDH7ziG0GcwI'},
 damixiansheng: {merchantName:'大米先生新鲜现炒（浙大校友店）',rating:4.9,distanceKm:0.5,shareUrl:'http://dpurl.cn/Y8mLgnuz',menuUrl:'https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str=3NhpXKTH4JPLPTgF2zvg5gI'},
}
// Common menu ideas and reference prices, not this branch's verified live inventory.
const MENU_ITEMS: Pick<KitchenMerchant,'id'|'merchantId'|'name'|'note'|'price'|'aliases'>[] = [
 {id:'pork-rice',merchantId:'pork-rice',name:'猪脚饭',note:'卤猪脚配米饭，经典卤香',price:22},
 {id:'kfc',merchantId:'kfc',name:'香辣鸡腿堡套餐',aliases:['肯德基'],note:'香辣鸡腿堡，搭配薯条与饮料',price:26},
 {id:'damixiansheng',merchantId:'damixiansheng',name:'农家小炒肉饭',aliases:['大米先生'],note:'小炒肉配米饭，鲜香下饭',price:29},
 {id:'pork-duck',merchantId:'pork-rice',name:'烧鸭饭',note:'烧鸭配米饭，咸香入味',price:24},
 {id:'pork-combo',merchantId:'pork-rice',name:'猪脚双拼饭',note:'猪脚搭配卤味，一份双拼',price:28},
 {id:'pork-chicken',merchantId:'pork-rice',name:'卤鸡腿饭',note:'卤鸡腿配米饭，酱香口味',price:23},
 {id:'kfc-crispy',merchantId:'kfc',name:'劲脆鸡腿堡套餐',note:'酥脆鸡腿堡，搭配薯条与饮料',price:25},
 {id:'kfc-wings',merchantId:'kfc',name:'新奥尔良烤翅',note:'烤翅小食，微甜带辣',price:19},
 {id:'kfc-nuggets',merchantId:'kfc',name:'上校鸡块',note:'鸡块小食，蘸酱搭配',price:15},
 {id:'dami-pepper',merchantId:'damixiansheng',name:'辣椒炒肉饭',note:'辣椒与肉片现炒，配米饭',price:28},
 {id:'dami-tomato',merchantId:'damixiansheng',name:'番茄炒蛋饭',note:'番茄炒蛋配米饭，酸甜家常',price:22},
 {id:'dami-chicken',merchantId:'damixiansheng',name:'香菇滑鸡饭',note:'香菇搭配鸡肉，配米饭',price:26},
]
export const KITCHEN_DISHES: KitchenMerchant[] = MENU_ITEMS.map(item=>({...KITCHEN_MERCHANTS[item.merchantId],...item}))

export function findKitchenDish(text:string){
 if(isNonCommand(text)||/你说|他说|她说|引用|举例/.test(text)||/(?:不要(?!辣)|不吃|不点|别|不用|是什么|什么意思|如何)/.test(text))return undefined
 const matches=KITCHEN_DISHES.filter(dish=>[dish.name,...dish.aliases??[]].some(name=>text.includes(name)))
 return matches.length===1?matches[0]:undefined
}

export const MORNING_ITEMS = [
  { title: '早朝', time: '09:00', place: '会议室' },
  { title: '审阅奏折', time: '14:30' },
]

export const MEMORIAL_SAMPLE = '改到 16:00、带样机、今晚确认细节'

export const MEMORIAL_POINTS = ['时间改到 16:00', '需要带样机', '今晚确认细节']

export const MEMORIAL_DRAFT = '收到，改到 16:00，我带样机过去，今晚把细节确认给你。'

/**
 * 地图服务未配置时不编造距离与时间。
 * 这里只列出行方式，真实路线与耗时留待地图 Adapter 接入后填写。
 */
export const MARCH_OPTIONS: Array<{ label: '步行' | '打车' | '骑行'; detail: string; source: string }> = [
  { label: '步行', detail: '请在地图里核对步行路线', source: '地图服务未配置' },
  { label: '打车', detail: '需要在地图里核对路线与价格', source: '地图服务未配置' },
  { label: '骑行', detail: '需要在地图里核对路线与耗时', source: '地图服务未配置' },
]

/** 场景词表集中在 scene-config.ts，这里只负责否定判断与顺序 */
const SCENE_WORDS = SCENE_DEFINITIONS.map((item) => ({
  scene: item.scene as SceneId,
  words: item.keywords,
}))

/** 否定判断：命中否定词且紧邻场景词时，不触发该场景 */
function isNegated(text: string, word: string) {
  const index = text.indexOf(word)
  if (index < 0) return false
  const prefix = text.slice(Math.max(0, index - 4), index)
  if (/别人|别处|别的|别家/.test(prefix)) return false
  return /不要|不用|别|不必|甭|不想/.test(prefix)
}

export function detectScene(text: string): SceneId | undefined {
  if(isNonCommand(text))return undefined
  if(isCouponIntent(text))return 'coupons'
  if(bossDraftChallenge(text))return 'protect'
  if(isProtectionIntent(text))return 'protect'
  if(isWorkIntent(text))return 'work'
  if(isClientComplaint(text))return 'client-ending'
  if(isRestIntent(text))return 'ending'
  if(isProtectionIntent(text))return 'protect'
  if(isTodoIntent(text))return 'todo'
  if(isMusicIntent(text))return 'music'
  for (const item of SCENE_WORDS) {
    if(item.scene==='coupons'||item.scene==='work'||item.scene==='todo'||item.scene==='music'||item.scene==='client-ending')continue
    if(item.scene==='march'&&isMarchInformation(text))continue
    if(isSceneDenied(text,item.scene))continue
    for (const word of item.words) {
      if (text.includes(word) && !isNegated(text, word) && !(item.scene==='protect'&&word==='谁敢')) return item.scene
    }
  }
  return undefined
}

/** Only explicit accepted intent selects a recording; inherited context never does. */
export function resolveSceneVoice(text:string,scene:SceneId) {
 if(isNonCommand(text)||detectScene(text)!==scene)return undefined
 if(scene==='morning')return undefined
 if(scene==='protect'&&!isProtectionIntent(text))return undefined
 return findSceneDefinition(scene)?.voice
}

export function parseDestination(text: string): string | undefined {
  const match = text.match(/(?:去|到|往)\s*([^，。,.!！\s]{1,12})/)
  const value = match?.[1]?.replace(/(?:怎么走|怎么去|如何走|吗|呢|吧)$/,'').replace(/^[“「『‘"']|[”」』’"']$/g,'')
  // 「出去逛逛」「去哪玩」不是目的地
  if (!value || /^[逛哪玩]/.test(value)) return undefined
  return value
}

export function parseTaste(text: string): string | undefined {
  const match = text.match(/(少辣|不辣|微辣|中辣|多辣|不要辣|清淡|重口)/)
  return match?.[1]
}

/** 进入场景时的第一句回应 */
export function enterScene(scene: SceneId, text: string, prev: SceneContext): SceneReply {
  switch (scene) {
    case 'work':
      return {text:'今日工作，陛下过目。',action:findSceneDefinition('work')!.action,environment:'audience_hall',card:{kind:'work'},context:{sceneId:'work',stage:'confirm',pending:false}}
    case 'todo':
      return {text:'今日待办，陛下过目。',action:findSceneDefinition('todo')?.action??'idle',environment:'audience_hall',card:{kind:'todo'},context:{sceneId:'todo',stage:'confirm',pending:false}}
    case 'morning':
      if(isWakeIntent(text)){
        return {text:'',action:'idle',page:'alarm-ring',alarmTime:parseWakeTime(text),context:{sceneId:'morning',stage:'idle',pending:false}}
      }
      if (text.includes('安排') || text.includes('日程')) {
        return {
          text: '请陛下安排今日之事。',
          action: 'greet',
          card: {
            kind: 'morning',
            items: [],
            suggestion: '尚未读取系统日历。准奏后查询真实日程，或先记一条本地草稿。',
          },
          context: { sceneId: 'morning', stage: 'confirm', pending: true },
          task: 'query-calendar',
        }
      }
      return {
        text: '小A子在，陛下请吩咐。',
        action: 'greet',
        context: { sceneId: 'morning', stage: 'idle' },
      }

    case 'coupons':
      return {text:'陛下，省钱的事交给小A子。券是否可用，还得在商家页面核对。',action:'point',environment:'restaurant',card:{kind:'coupons'},context:{sceneId:'coupons',stage:'confirm',pending:false}}

    case 'kitchen': {
      // 配送默认值由用户明确提供；预算和口味仍只采用明确要求。
      const budget = parseBudget(text) ?? prev.budget ?? null
      const address = parseAddress(text) ?? prev.address ?? DEFAULT_KITCHEN_DELIVERY.address
      const contactName = prev.contactName ?? DEFAULT_KITCHEN_DELIVERY.contactName
      const phone = prev.phone ?? DEFAULT_KITCHEN_DELIVERY.phone
      const taste = parseTaste(text) ?? prev.taste ?? null
      const context: SceneContext = { sceneId: 'kitchen', stage: 'collect', budget, address, contactName, phone, taste }
      const dishes = budget === null ? KITCHEN_DISHES : KITCHEN_DISHES.filter((dish) => dish.price <= budget)
      return {
        text: '陛下想吃哪一份？',
        action: 'think',
        card: {
          kind: 'kitchen',
          budget,
          taste,
          address,
          contactName,
          phone,
          dishes,
          selectedDish:dishes.find(d=>d.id===findKitchenDish(text)?.id)?.name,
        },
        context: { ...context, stage: 'confirm', pending: true },
        task: 'open-alipay',
      }
    }

    case 'protect': {
      const comfort = /骂|烦|不开心|难过/.test(text)
      return {
        text: bossDraftChallenge(text)?'大胆！谁敢这样跟陛下说话？':comfort
          ? '陛下别往心里去。谁要再敢多嘴，小A子先挡着。'
          : '大胆！谁敢忤逆陛下？',
        action: 'protect',
        context: { sceneId: 'protect', stage: 'collect', protectReady: !comfort },
      }
    }

    case 'memorial':
      return {
        text: '拟好回话了，请陛下过目。',
        action: 'reply',
        card: {
          kind: 'memorial',
          source: MEMORIAL_SAMPLE,
          points: MEMORIAL_POINTS,
          draft: MEMORIAL_DRAFT,
          recipient: '对方',
        },
        context: { sceneId: 'memorial', stage: 'confirm', pending: true },
        task: 'save-draft',
      }

    case 'march': {
      // 不把上一次传膳的地址当成目的地
      const destination =
        parseDestination(text) ?? null
      return {
        text: destination
          ? `去${destination}，地图里核对路线。`
          : '陛下想去哪里？',
        action: 'point',
        card: {
          kind: 'march',
          destination,
          mode: /走路|步行/.test(text) ? '步行' : /打车/.test(text) ? '打车' : /骑行|骑车|低调|御驾亲蹬/.test(text) ? '骑行' : null,
          options: MARCH_OPTIONS,
        },
        context: { sceneId: 'march', stage: 'confirm', pending: true },
        task: 'open-map',
      }
    }

    case 'poem':
      return {
        text: '好诗！陛下写出了生生不息。',
        action: 'scroll',
        context: { sceneId: 'poem', stage: 'idle' },
      }

    case 'client-ending':
      return {text:'',action:findSceneDefinition('client-ending')?.action??'idle',context:{sceneId:'client-ending',stage:'idle',pending:false}}

    case 'ending': {
      const rest = isRestIntent(text)
      return {
        text: rest ? '陛下早些歇息，小A子守着。' : '回禀陛下，在那个群里，您是臣。',
        action: 'ending',
        context: { sceneId: 'ending', stage: 'idle' },
      }
    }

    case 'music':
      return {
        text: '陛下请听曲。',
        action: findSceneDefinition('music')?.action??'idle',
        environment:'bedchamber',
        card: {
          kind: 'music',
          title: '特别的人',
          artist:'方大同',
        },
        context: { sceneId: 'music', stage: 'confirm', pending: false },
      }

    default:
      return {
        text: '我在。陛下想办什么，只管吩咐。',
        action: 'idle',
        context: EMPTY_CONTEXT,
      }
  }
}
