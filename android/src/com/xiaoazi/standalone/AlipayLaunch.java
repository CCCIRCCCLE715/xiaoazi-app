package com.xiaoazi.standalone;
/** Fixed launcher entry only; no URI, merchant id, coupon id or package accepted from Web content. */
final class AlipayLaunch {
 interface Platform {boolean launch(String packageName) throws Exception;}
 static String open(boolean foreground,int payloadFields,Platform platform){
  if(!foreground)return "cancelled";
  if(payloadFields!=0)return "invalid_request";
  try{return platform.launch("com.eg.android.AlipayGphone")?"started":"app_missing";}
  catch(Exception e){return "launch_failed";}
 }
}
