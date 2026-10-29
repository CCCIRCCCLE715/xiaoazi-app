package com.xiaoazi.standalone;
/** Permission ownership survives an OS dialog pause. Outcomes only prompt another user tap. */
final class MicrophonePermission {
 enum Notice { GRANTED_RETRY, DENIED }
 private String id;private int requestCode=-1;private boolean foreground=true;private Notice notice;
 void begin(String value,int code){cancel();id=value;requestCode=code;}
 String pendingId(){return id;}
 void cancel(){id=null;requestCode=-1;notice=null;}
 void pause(){foreground=false;}
 Notice resume(){foreground=true;return takeNotice();}
 Notice result(int code,boolean granted){
  if(id==null||code!=requestCode)return null;
  id=null;requestCode=-1;notice=granted?Notice.GRANTED_RETRY:Notice.DENIED;
  return foreground?takeNotice():null;
 }
 private Notice takeNotice(){Notice value=notice;notice=null;return value;}
}
