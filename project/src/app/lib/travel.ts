import type { SceneReply, MarchCard } from './scenes'
import { MARCH_OPTIONS } from './scenes'
export type TravelMode = '步行' | '打车' | '骑行'
export const TRAVEL_LABEL: Record<TravelMode, string> = { 步行: '走路', 打车: '打车', 骑行: '骑车' }
/** Pure presentation boundary: route results require both user-provided fields. */
export function travelReply(destination?: string | null, mode?: TravelMode | null): SceneReply {
 const route=Boolean(destination&&mode)
 const card:MarchCard={kind:'march',destination:destination||null,mode:mode||null,stage:route?'route':'choose',options:MARCH_OPTIONS}
 return {
  text:route?(mode==='骑行'?`去${destination}，御驾亲蹬。`:`去${destination}，${mode==='步行'?'走路':'打车'}。请在地图里核对。`):mode?'陛下想去哪里？':'陛下，今日如何出行？',
  action:'point',environment:'street',card,
  context:{sceneId:'march',stage:route?'confirm':'collect',pending:route},
  ...(route?{task:'open-map' as const}:{}),
 }
}
