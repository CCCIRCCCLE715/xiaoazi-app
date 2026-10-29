package com.xiaoazi.standalone;
import java.util.Arrays;
/** One bounded in-memory utterance. No segments, partial inference, file or network. */
final class OfflineUtterance {
 private final int maximum,minimum;private short[] pcm;private int used;private boolean begun,stopped,cancelled,consumed;
 OfflineUtterance(int maximum,int minimum){if(maximum<minimum||minimum<1)throw new IllegalArgumentException();this.maximum=maximum;this.minimum=minimum;pcm=new short[Math.min(16000,maximum)];}
 synchronized boolean begin(){if(stopped||cancelled||consumed)return false;begun=true;return true;}
 synchronized boolean stopped(){return stopped;}
 synchronized boolean cancelled(){return cancelled;}
 synchronized void append(short[] frames,int count){
  if(count<0||count>frames.length)throw new IllegalArgumentException();
  if(cancelled||consumed||!begun)return;
  if(used+count>maximum)throw new IllegalArgumentException("utterance limit");
  if(used+count>pcm.length){short[] old=pcm;pcm=Arrays.copyOf(old,Math.min(maximum,Math.max(used+count,pcm.length*2)));Arrays.fill(old,(short)0);}
  System.arraycopy(frames,0,pcm,used,count);used+=count;
 }
 synchronized void stop(){stopped=true;}
 synchronized void cancel(){cancelled=true;stopped=true;clear();}
 synchronized int queuedSamples(){return used;}
 synchronized float[] takeForDecode(){
  if(cancelled||consumed)return new float[0];
  if(!stopped)throw new IllegalStateException("not released");
  consumed=true;
  if(!begun||used<minimum){clear();return new float[0];}
  int peak=0;for(int i=0;i<used;i++)peak=Math.max(peak,Math.abs((int)pcm[i]));
  // Only digital silence is rejected here; quiet speech is not assigned a domain result.
  if(peak<4){clear();return new float[0];}
  float[] samples=new float[used];for(int i=0;i<used;i++)samples[i]=pcm[i]/32768f;
  clear();return samples;
 }
 private void clear(){Arrays.fill(pcm,(short)0);used=0;}
}
