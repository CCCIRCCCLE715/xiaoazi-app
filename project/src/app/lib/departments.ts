import type {SceneCard,SceneContext} from './scenes'
export type Department = 'home' | 'kitchen' | 'todo' | 'march' | 'calendar' | 'permissions' | 'memories' | 'results'
export const DEPARTMENTS:ReadonlyArray<{id:Department;label:string}> = [
 {id:'home',label:'首页'}, {id:'kitchen',label:'御膳房'}, {id:'todo',label:'军机处'}, {id:'march',label:'御马监'},
 {id:'calendar',label:'日历和日程'}, {id:'permissions',label:'权限管理'}, {id:'memories',label:'记忆列表'}, {id:'results',label:'执行结果'},
]
export function currentDepartment(card:SceneCard|undefined,context:SceneContext):Department|undefined {
 if(card?.kind==='kitchen'||card?.kind==='todo'||card?.kind==='march')return card.kind
 return !card&&context.sceneId==='idle'?'home':undefined
}

export function departmentPath(id:Department){return id==='home'?'/':['kitchen','todo','march'].includes(id)?'/court?department='+id:'/'+id}
