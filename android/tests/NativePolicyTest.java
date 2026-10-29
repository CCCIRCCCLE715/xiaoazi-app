package com.xiaoazi.standalone;
public final class NativePolicyTest {
 static int checks; static void eq(Object got,Object want){checks++;if(!got.equals(want))throw new AssertionError(got+" != "+want);}
 static void invalid(String url){checks++;try{ModelHttp.endpoint(url);throw new AssertionError("accepted "+url);}catch(IllegalArgumentException expected){}}
 public static void main(String[] args)throws Exception{
 eq(ModelHttp.endpoint("https://api.deepseek.com").toString(),"https://api.deepseek.com/chat/completions");
 eq(ModelHttp.endpoint("https://example.com/v1/").toString(),"https://example.com/v1/chat/completions");
 eq(ModelHttp.endpoint("https://example.com/v1/chat/completions").toString(),"https://example.com/v1/chat/completions");
 invalid("http://example.com");invalid("https://secret@example.com");invalid("https://example.com?key=secret");invalid("https://example.com/#x");invalid("file:///x");
 RequestEpoch gate=new RequestEpoch();long old=gate.begin();long active=gate.begin();eq(gate.isCurrent(old),false);eq(gate.isCurrent(active),true);gate.cancel();eq(gate.isCurrent(active),false);
 System.out.println("NativePolicy: "+checks+" checks passed");}}
