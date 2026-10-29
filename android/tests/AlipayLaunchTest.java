package com.xiaoazi.standalone;
public final class AlipayLaunchTest {
 public static void main(String[] args){
  final int[] calls={0};AlipayLaunch.Platform platform=p->{calls[0]++;if(!p.equals("com.eg.android.AlipayGphone"))throw new AssertionError("arbitrary package");return true;};
  eq(AlipayLaunch.open(true,0,platform),"started");
  eq(AlipayLaunch.open(false,0,platform),"cancelled");
  for(int fields:new int[]{1,2,3})eq(AlipayLaunch.open(true,fields,platform),"invalid_request");
  if(calls[0]!=1)throw new AssertionError("invalid request launched");
  eq(AlipayLaunch.open(true,0,p->false),"app_missing");
  eq(AlipayLaunch.open(true,0,p->{throw new Exception();}),"launch_failed");
  System.out.println("AlipayLaunch: fixed package, empty payload, foreground, missing and failed launch passed");
 }
 static void eq(String a,String b){if(!a.equals(b))throw new AssertionError(a+" != "+b);}
}
