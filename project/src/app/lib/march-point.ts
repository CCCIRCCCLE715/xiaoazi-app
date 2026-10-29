import type {Clip} from './character-player'
/** Original 1x point footage with one readable pointing-pose hold for the new 7.206644s voice. */
export function marchPointClip(clip:Clip,riding:boolean):Clip{return riding?{...clip,displayHold:{at:2.625,ms:3500}}:clip}
