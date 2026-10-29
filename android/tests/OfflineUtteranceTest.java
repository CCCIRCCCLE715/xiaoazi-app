package com.xiaoazi.standalone;
import java.util.*;
public final class OfflineUtteranceTest {
 static void yes(boolean b){if(!b)throw new AssertionError();}
 public static void main(String[] args){
  OfflineUtterance p=new OfflineUtterance(3200,1600);yes(p.begin());short[] a=new short[1600];Arrays.fill(a,(short)1600);p.append(a,a.length);
  try{p.takeForDecode();throw new AssertionError("not released");}catch(IllegalStateException expected){}
  p.stop();float[] decoded=p.takeForDecode();yes(decoded.length==1600&&Math.abs(decoded[0]-1600f/32768)<.000001);yes(p.queuedSamples()==0);yes(p.takeForDecode().length==0);
  OfflineUtterance cancelled=new OfflineUtterance(3200,1600);cancelled.cancel();yes(!cancelled.begin());yes(cancelled.takeForDecode().length==0);
  OfflineUtterance beforeReady=new OfflineUtterance(3200,1600);beforeReady.stop();yes(!beforeReady.begin());
  OfflineUtterance mid=new OfflineUtterance(3200,1600);yes(mid.begin());mid.append(a,a.length);mid.cancel();yes(mid.queuedSamples()==0);yes(mid.takeForDecode().length==0);
  OfflineUtterance silent=new OfflineUtterance(3200,1600);silent.begin();silent.append(new short[1600],1600);silent.stop();yes(silent.takeForDecode().length==0);
  OfflineUtterance shortTap=new OfflineUtterance(3200,1600);shortTap.begin();shortTap.append(a,100);shortTap.stop();yes(shortTap.takeForDecode().length==0);
  OfflineUtterance capped=new OfflineUtterance(3200,1600);capped.begin();capped.append(a,1600);capped.append(a,1600);try{capped.append(a,1);throw new AssertionError("unbounded PCM");}catch(IllegalArgumentException expected){}capped.cancel();yes(capped.queuedSamples()==0);
  System.out.println("OfflineUtterance: release-only once, cancellation/early release, silence, short touch and bounded PCM passed");
 }
}
