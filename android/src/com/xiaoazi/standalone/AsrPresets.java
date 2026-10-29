package com.xiaoazi.standalone;
import java.text.Normalizer;
import java.util.ArrayList;
/** Bounded post-recognition correction only. Never executes a command and never turns a substring into a preset. */
final class AsrPresets {
 static ArrayList<String> biasingStrings(){ArrayList<String> words=new ArrayList<>();words.add("黄白，你的稿子呢？");words.add("御驾亲蹬");words.add("小A子你好");words.add("小A子快救我");words.add("我要出行");words.add("骑车去公司");words.add("我要没钱了");words.add("朕要没钱了");words.add("帮我找优惠券");words.add("帮我找团购券");return words;}
 static String normalize(String raw){
  if(raw==null)return "";
  // Quotes/negation/explanation must survive. Only punctuation and spaces around the entire phrase may vary.
  String full=Normalizer.normalize(raw,Normalizer.Form.NFKC).replaceAll("[\\s，,。.!！?？、:：;；]","");
  if(full.matches("(?:黄白|黄柏|黄百)(?:你的?|的)?(?:稿子|搞子)(?:呢|在哪(?:里)?|写完了吗|写好了吗|好了吗)"))return "黄白，你的稿子呢？";

  return raw.replace("优惠卷","优惠券").replace("团购卷","团购券").replaceFirst("^小[阿aA]子(?=[，,\\s]*(?:你好|您好|嗨|哈喽|hello|hi))","小A子");
 }
}
