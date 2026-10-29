package com.xiaoazi.standalone;
public final class SpeechSegmentsTest {
 static int checks;static void eq(Object a,Object b){checks++;if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 public static void main(String[] args){
  SpeechSegments s=new SpeechSegments();eq(s.partial("今天"),"今天");eq(s.commit(1,"今天我们"),"今天我们");eq(s.partial("要干"),"今天我们 要干");eq(s.commit(2,"要干什么"),"今天我们 要干什么");eq(s.commit(2,"要干什么"),"今天我们 要干什么");eq(s.finish("请呈上来"),"今天我们 要干什么 请呈上来");eq(s.finish("重复尾巴"),"今天我们 要干什么 请呈上来");eq(s.commit(3,"迟到"),"今天我们 要干什么 请呈上来");
  SpeechSegments repeat=new SpeechSegments();repeat.commit(1,"好好");repeat.commit(2,"好好");eq(repeat.finish(""),"好好 好好");
  SpeechSegments partial=new SpeechSegments();partial.partial("未定稿");eq(partial.finish("正确尾句"),"正确尾句");
  SpeechSegments empty=new SpeechSegments();empty.commit(1,"");eq(empty.finish(""),"");
  SpeechSegments bounded=new SpeechSegments();boolean overflow=false;try{bounded.commit(1,new String(new char[4001]).replace('\0','我'));}catch(IllegalArgumentException e){overflow=true;}eq(overflow,true);
  System.out.println("SpeechSegments: "+checks+" checks passed");
 }
}
