import plan from './work-tasks.json'
import {createTodoSession,type TodoDay} from './todo-day'
export const WORK_PLAN=plan
export const workPlanKey=(date:string)=>`app.court.work-plan.v1.${date}`
export function workPlanDay(date:string):TodoDay {
 return {version:1,date,source:'user-local',confirmed:false,held:false,items:plan.tasks.map(task=>({id:`${date}-${task.id}`,time:task.time,title:task.title,category:'工作',done:false}))}
}
export function createWorkPlanSession(...args:Parameters<typeof createTodoSession>){
 return createTodoSession(args[0],args[1],args[2],{key:workPlanKey,seed:workPlanDay})
}
export function workTaskDetails(id:string){return plan.tasks.find(task=>id.endsWith('-'+task.id))}
