export type MarchPhase = 'waiting'|'bike'|'compact'|'duration'|'map'|'route'|'arrived'|'cancelled'
/** One demonstration, relative to a fresh painted point frame. Never a progress loop. */
export const MARCH_TIMING = {enterMs:200,bikeUntilMs:1200,compactMs:250,staggerMs:60,routeMs:1400} as const
export function createMarchPresentation(change:(phase:MarchPhase)=>void) {
 let current:number|undefined,started=false,reduced=false,generation=0
 const timers=new Set<ReturnType<typeof setTimeout>>()
 const clear=()=>{++generation;for(const timer of timers)clearTimeout(timer);timers.clear()}
 return {
  arm(token:number,reduce=false){clear();current=token;started=false;reduced=reduce;change('waiting')},
  frame(token:number){
   if(current!==token||started)return
   started=true
   if(reduced){change('arrived');return}
   change('bike');const guard=generation
   const {bikeUntilMs,compactMs,staggerMs,routeMs}=MARCH_TIMING
   const routeAt=bikeUntilMs+compactMs+2*staggerMs
   const steps:[number,MarchPhase][]=[[bikeUntilMs,'compact'],[bikeUntilMs+compactMs,'duration'],[routeAt-staggerMs,'map'],[routeAt,'route'],[routeAt+routeMs,'arrived']]
   for(const [at,phase] of steps){const timer=setTimeout(()=>{timers.delete(timer);if(guard===generation&&current===token)change(phase)},at);timers.add(timer)}
  },
  cancel(){clear();current=undefined;started=false;change('cancelled')},
 }
}
