package com.xiaoazi.standalone;
public final class SafeDiagnosticsTest{
 public static void main(String[] args){SafeDiagnostics log=new SafeDiagnostics();String secret="sk-test-private-transcript-and-url";log.asr(secret,secret,secret,555);log.media(secret,secret,99,99,99,Double.NaN,Double.POSITIVE_INFINITY);
  if(log.snapshot().toString().contains(secret))throw new AssertionError("untrusted text escaped whitelist");
  for(int i=0;i<100;i++)log.asr("system","error","asr-client",5);
  if(log.snapshot().size()!=80)throw new AssertionError("log must be bounded");
  log.snapshot().clear();if(log.snapshot().size()!=80)throw new AssertionError("snapshot immutable from outside");
  System.out.println("safe diagnostics 3 checks passed");
 }
}
