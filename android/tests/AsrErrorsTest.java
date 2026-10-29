package com.xiaoazi.standalone;
public final class AsrErrorsTest{
 public static void main(String[] args){
  if(!AsrErrors.classify(5).equals("asr-client"))throw new AssertionError("ERROR_CLIENT must retain its identity");
  if(!AsrErrors.classify(8).equals("asr-busy"))throw new AssertionError("ERROR_RECOGNIZER_BUSY");
  if(!AsrErrors.classify(2).equals("asr-network"))throw new AssertionError("ERROR_NETWORK");
  if(!AsrErrors.classify(12).equals("language"))throw new AssertionError("language");
  if(!AsrErrors.fallback(5)||!AsrErrors.fallback(8)||!AsrErrors.fallback(2)||!AsrErrors.fallback(12))throw new AssertionError("local fallback for failed system service");
  if(AsrErrors.fallback(9)||AsrErrors.fallback(6)||AsrErrors.fallback(7))throw new AssertionError("no repeat on permission denial or silent input");
  System.out.println("ASR error policy 8 checks passed");
 }
}
