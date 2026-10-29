import voice from '@/assets/audio/client-ending-apology.wav'
import video from '@/assets/character/actions-v11/ending-apology-alpha.webm'
/** Root-authorized review candidate. Original media readiness and user acceptance stay separate. */
export const ENDING_APOLOGY={
 action:'ending-apology' as const,
 src:video,
 firstPoster:'/poster/ending-apology-first.png',lastPoster:'/poster/ending-apology-last.png',
 sha256:'ca3fe1593d61a4cd4cf4a26463a6898db0807b3b70d169e31d6b8fe0991e3f51',
 durationSec:10.125,frameCount:243,playbackRate:1,
 voice:{src:voice,durationSec:8.924512,sha256:'c82589839fb28904fc683ba45f9f885b4e2f2f139e8370af9f0bea262a3bd770'},
 previewEnabled:true,
 finalAccepted:false,
 loop:false,
 handoff:'design/voice-stage-v4/starfish-ending-apology-v1/deliverables/integration-handoff.json',
} as const
