import type {CSSProperties} from 'react'
import walk from '@/assets/icons/phosphor-regular/person-simple-walk.svg'
import taxi from '@/assets/icons/phosphor-regular/car-profile.svg'
import bicycle from '@/assets/icons/phosphor-regular/bicycle.svg'
import type {TravelMode} from '../lib/travel'
/** Unmodified, local Phosphor Regular SVGs; mask inherits the semantic color token. */
export const TRAVEL_ICONS:Record<TravelMode,string>={步行:walk,打车:taxi,骑行:bicycle}
export function TravelIcon({mode,size=28}:{mode:TravelMode;size?:number}) {
 const source=TRAVEL_ICONS[mode]
 return <span className="travel-icon" data-icon-source={source} data-icon-mode={mode} aria-hidden="true" style={{width:size,height:size,maskImage:`url("${source}")`,WebkitMaskImage:`url("${source}")`} as CSSProperties}/>
}
