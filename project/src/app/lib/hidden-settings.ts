/** Each activation is a single completed click or keyboard activation. */
export function createHiddenSettingsController(options:{onOpen:()=>void;onChange?:(visible:boolean)=>void}){
 let shown=false,disposed=false,timer:ReturnType<typeof setTimeout>|undefined
 function hide(){if(timer!==undefined)clearTimeout(timer);timer=undefined;shown=false;if(!disposed)options.onChange?.(false)}
 return {resume(){disposed=false},visible:()=>shown,hide,activate(){if(disposed)return;if(shown){hide();options.onOpen();return}shown=true;options.onChange?.(true);timer=setTimeout(hide,5000)},dispose(){hide();disposed=true}}
}
