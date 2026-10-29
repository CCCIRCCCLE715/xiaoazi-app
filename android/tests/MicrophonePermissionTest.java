package com.xiaoazi.standalone;
public final class MicrophonePermissionTest {
 static void check(boolean value){if(!value)throw new AssertionError();}
 public static void main(String[] args){
  MicrophonePermission p=new MicrophonePermission();p.begin("first",101);p.pause();check(p.result(101,true)==null);check(p.resume()==MicrophonePermission.Notice.GRANTED_RETRY);check(p.resume()==null);
  p.begin("denied",102);p.pause();check(p.result(102,false)==null);check(p.resume()==MicrophonePermission.Notice.DENIED);
  p.begin("cancelled",103);p.cancel();check(p.result(103,true)==null);check(p.resume()==null);
  p.begin("old",104);p.begin("new",105);check(p.result(104,true)==null);check("new".equals(p.pendingId()));check(p.result(105,true)==MicrophonePermission.Notice.GRANTED_RETRY);
  p.begin("leave",106);p.pause();check(p.result(106,true)==null);p.cancel();check(p.resume()==null);
  p.begin("early-resume",107);p.pause();check(p.resume()==null);check(p.result(107,true)==MicrophonePermission.Notice.GRANTED_RETRY);check(p.result(107,true)==null);
  System.out.println("MicrophonePermission6 lifecycle policies passed; notices only, no automatic recording command");
 }
}
