package com.xiaoazi.standalone;
public final class AsrPresetsTest {
 static int checks;
 static void eq(String a,String b){checks++;if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 public static void main(String[] args){
  for(String raw:new String[]{"黄 白 你 的 稿子 呢","黄柏，你的稿子呢？","黄百你的稿子呢","黄白你的搞子呢","黄白稿子好了吗","黄柏你的搞子写完了吗"})eq(AsrPresets.normalize(raw),"黄白，你的稿子呢？");
  for(String raw:new String[]{"御 驾 亲 蹬","御驾亲登","欲驾亲登","御驾轻登","御驾亲灯","御驾亲征"})eq(AsrPresets.normalize(raw),raw);
  for(String raw:new String[]{""," ","不要说黄白你的稿子呢","他说黄白你的稿子呢","“黄白你的稿子呢”","黄白你的稿子呢是什么意思","不要御驾亲登","御驾亲登怎么读","骑车去公司","黄白你的稿子没写完吗","我今天想吃不辣的饭","御驾亲登去医院","灯坏了","不要御驾亲灯","明天八点叫醒我","他说黄白你的稿子写完了吗"})eq(AsrPresets.normalize(raw),raw);
  eq(AsrPresets.normalize("小a子你好"),"小A子你好");
  eq(AsrPresets.normalize("小阿子，你好啊"),"小A子，你好啊");
  for(String raw:new String[]{"不要说小阿子你好","他说小阿子你好","“小阿子你好”","小阿子去公司"})eq(AsrPresets.normalize(raw),raw);
  if(!AsrPresets.biasingStrings().contains("小A子你好"))throw new AssertionError("greeting hotword missing");
  System.out.println(checks+" ASR normalization checks passed; text only, not microphone accuracy");
 }
}
