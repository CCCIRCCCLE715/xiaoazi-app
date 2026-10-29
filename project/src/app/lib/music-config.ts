import musicTapVideo from '@/assets/character/actions-v6/music-tap-alpha.webm'
import preview from '@/assets/audio/special-person-preview.m4a'
/** Official Apple public preview, stored locally. This is not the full recording. */
export const MUSIC_TRACK={src:preview,title:'特别的人',artist:'方大同',kind:'官方试听',duration:30.003991} as const
/** Root-authorized internal review candidate. This is not final motion acceptance. */
export const MUSIC_GESTURE={src:musicTapVideo,action:'music-tap' as const,tapCueSec:2.625,previewEnabled:true,finalAccepted:false}
