/** Only actual listening requests open the player. Quoted commands are data. */
export function isMusicIntent(raw:string){
 const text=raw.normalize('NFKC').trim()
 const target='(?:垂帘听曲|听曲|听歌|放首歌|放一首歌|选一首曲子|选首曲子)'
 if(/取消|停止|停下|别播|不听了|收起来/.test(text))return false
 if(new RegExp('(?:不要|不用|不必|不想|别|甭|不需要)[^，。！？]{0,15}'+target).test(text))return false
 if(new RegExp('(?:你说|他说|她说|提到|引用|例如|举例)[^，。！？]{0,25}'+target).test(text))return false
 if(new RegExp(`^[“「『"'‘].*${target}.*[”」』"'’][。！？!?]*$`).test(text))return false
 if(new RegExp(target+'(?:是什么意思|是什么|什么意思|的意思|怎么读|怎么写)').test(text)||new RegExp('(?:什么是|如何理解)'+target).test(text))return false
 return new RegExp(target).test(text)
}
