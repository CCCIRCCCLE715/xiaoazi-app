type Frame={opacity:number;transform:string}
type AnimationHandle={playState:string;finished:Promise<unknown>;cancel():void}
type Surface={read():Frame;animate(frames:Frame[],options:KeyframeAnimationOptions):AnimationHandle}
/** Keep the live form mounted; superseded exit completions cannot remove it. */
export function createPanelMotion(surface:Surface,onClosed:()=>void,entryTransform='translateY(28%) scale(.97)',exitTransform='translateY(18%) scale(.98)',exitDuration=160){
 let animation:AnimationHandle|undefined,wasOpen=false,revision=0
 return {
  update(open:boolean,reduced:boolean,enterDuration:number,layout?:{entryTransform:string;exitTransform:string;exitDuration:number}){
   const ticket=++revision
   const snapshot=animation?.playState==='running'?surface.read():undefined
   animation?.cancel()
   const start=snapshot??{opacity:open&&!wasOpen?0:1,transform:open?(wasOpen?'translateY(8px) scale(.99)':(layout?.entryTransform??entryTransform)):'none'}
   const end={opacity:open?1:0,transform:open?'none':(layout?.exitTransform??exitTransform)}
   if(reduced){start.transform='none';end.transform='none'}
   wasOpen=open
   animation=surface.animate([start,end],{duration:reduced?0:open?enterDuration:(layout?.exitDuration??exitDuration),easing:'cubic-bezier(0.32, 0.72, 0, 1)',fill:'both'})
   void animation.finished.then(()=>{if(ticket===revision&&!open)onClosed()}).catch(()=>undefined)
  },
  dispose(){++revision;animation?.cancel();animation=undefined},
 }
}
