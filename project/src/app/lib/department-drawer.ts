type Frame={opacity:number;transform:string}
type AnimationHandle={playState:string;finished:Promise<unknown>;cancel():void}
type Surface={isOpen():boolean;show():void;hide():void;focusRow():void;restoreFocus():void;read():Frame;apply(frame:Frame):void;animate(frames:Frame[],options:KeyframeAnimationOptions):AnimationHandle}
/** Native modal lifetime outlasts its exit; only the latest request can dismiss it. */
export function createDepartmentDrawer(surface:Surface,onOpening:()=>void,onExpanded:(value:boolean)=>void){
 let animation:AnimationHandle|undefined,target=false,revision=0
 function update(open:boolean,keyboard:boolean,reduced:boolean){
  if(target===open)return
  target=open;const ticket=++revision
  const snapshot=animation?.playState==='running'?surface.read():undefined
  animation?.cancel();animation=undefined
  const start=snapshot??{opacity:open?0:1,transform:open?'translateX(-100%)':'none'}
  const end={opacity:open?1:0,transform:open?'none':'translateX(-100%)'}
  if(reduced){start.transform='none';end.transform='none'}
  if(open){if(!surface.isOpen())surface.show();onOpening()}
  onExpanded(open)
  const finish=()=>{if(ticket!==revision||target)return;surface.hide();surface.restoreFocus()}
  if(keyboard){surface.apply(end);if(!open)finish()}
  else {
   animation=surface.animate([start,end],{duration:reduced?80:220,easing:'var(--ease-out)',fill:'both'})
   void animation.finished.then(finish).catch(()=>undefined)
  }
  if(open)surface.focusRow()
 }
 return {open:(keyboard:boolean,reduced:boolean)=>update(true,keyboard,reduced),close:(keyboard:boolean,reduced:boolean)=>update(false,keyboard,reduced),dispose(){++revision;target=false;animation?.cancel();animation=undefined;if(surface.isOpen())surface.hide()}}
}
