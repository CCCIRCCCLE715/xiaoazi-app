export type Point={x:number;y:number}
export type FloatingBounds={width:number;height:number;top:number;bottom:number;size:number;pad:number}
export function clampFloating(p:Point,b:FloatingBounds):Point {
 return {x:Math.max(b.pad,Math.min(p.x,Math.max(b.pad,b.width-b.size-b.pad))),y:Math.max(b.top,Math.min(p.y,Math.max(b.top,b.height-b.bottom-b.size)))}
}
export function createFloatingGesture(){
 let gesture:{id:number;x:number;y:number;origin:Point;position:Point;dragged:boolean}|null=null
 return {
  down(id:number,x:number,y:number,p:Point){if(gesture)return false;gesture={id,x,y,origin:p,position:p,dragged:false};return true},
  move(id:number,x:number,y:number,b:FloatingBounds):Point|null{const g=gesture;if(!g||g.id!==id)return null;if(Math.hypot(x-g.x,y-g.y)>=8)g.dragged=true;if(!g.dragged)return null;return g.position=clampFloating({x:g.origin.x+x-g.x,y:g.origin.y+y-g.y},b)},
  up(id:number,b:FloatingBounds):{activate:boolean;position:Point}|null{const g=gesture;if(!g||g.id!==id)return null;gesture=null;return {activate:!g.dragged,position:clampFloating({...g.position,x:g.position.x+b.size/2<b.width/2?b.pad:b.width-b.size-b.pad},b)}},
  cancel(){gesture=null},
 }
}
