export function createAlarmDismiss(dismiss:(id:string,token:string)=>void){
 let drag:{pointer:number;start:number;travel:number;id:string;token:string}|undefined
 return{begin(pointer:number,start:number,travel:number,id:string,token:string){drag=travel>0&&id&&token?{pointer,start,travel,id,token}:undefined},cancel(){drag=undefined},end(pointer:number,x:number,id:string,token:string){const d=drag;drag=undefined;if(!d||d.pointer!==pointer||d.id!==id||d.token!==token||x-d.start<d.travel*.8)return false;dismiss(id,token);return true}}
}
