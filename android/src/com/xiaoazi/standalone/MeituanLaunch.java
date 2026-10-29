package com.xiaoazi.standalone;
/** Only configured merchants and the installed Meituan package may be launched. */
final class MeituanLaunch {
 interface Platform {boolean launch(String packageName,String merchantUrl) throws Exception;}
 static String open(boolean foreground,int payloadFields,String merchantId,Platform platform){
  if(!foreground)return "cancelled";
  if(payloadFields!=(merchantId==null?0:1))return "invalid_request";
  String menuUrl=null;
  if(merchantId!=null){
   String poi;
   switch(merchantId){
    case "pork-rice":poi="gD8ern5C-jUHjOxPzI9pxgI";break;
    case "kfc":poi="0mXmohyRUnuWDH7ziG0GcwI";break;
    case "damixiansheng":poi="3NhpXKTH4JPLPTgF2zvg5gI";break;
    default:return "invalid_request";
   }
   menuUrl="https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str="+poi;
  }
  try{return platform.launch("com.sankuai.meituan",menuUrl)?"started":"app_missing";}
  catch(Exception e){return "launch_failed";}
 }
}
