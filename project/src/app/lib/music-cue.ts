export interface MusicGesture {source:string;action:string;at:number;previewEnabled:boolean}
/** No wall-clock fallback: the renderer must present a real, current source frame. */
export function createMusicCue(fire:(token:number)=>void){
 let current:{token:number;gesture:MusicGesture}|undefined
 return{
  arm(token:number,gesture:MusicGesture){current=gesture.previewEnabled?{token,gesture}:undefined},
  frame(frame:{token:number;source?:string;action:string;time?:number}){
   if(!current||current.token!==frame.token||current.gesture.action!==frame.action||current.gesture.source!==frame.source||frame.time===undefined||!Number.isFinite(frame.time)||frame.time<current.gesture.at)return
   const token=current.token;current=undefined;fire(token)
  },
  cancel(){current=undefined},
 }
}
