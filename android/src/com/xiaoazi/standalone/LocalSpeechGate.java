package com.xiaoazi.standalone;
import com.k2fsa.sherpa.onnx.*;
import java.io.File;import java.util.Arrays;
/** Local neural speech/no-speech decision only. Never crops or rewrites the utterance. */
final class LocalSpeechGate implements AutoCloseable {
 private Vad vad;
 LocalSpeechGate(File directory){
  SileroVadModelConfig silero=SileroVadModelConfig.builder().setModel(new File(directory,"silero_vad_v5.onnx").getAbsolutePath()).setThreshold(.5f).setMinSpeechDuration(.1f).setMinSilenceDuration(.2f).setWindowSize(512).setMaxSpeechDuration(30).build();
  vad=new Vad(VadModelConfig.builder().setSileroVadModelConfig(silero).setSampleRate(16000).setNumThreads(1).setProvider("cpu").setDebug(false).build());
 }
 boolean hasSpeech(float[] full){
  if(vad==null)throw new IllegalStateException("gate closed");
  vad.reset();vad.clear();boolean speech=false;float[] frame=new float[512];
  try{
   for(int i=0;i<full.length;i+=512){Arrays.fill(frame,0);System.arraycopy(full,i,frame,0,Math.min(512,full.length-i));vad.acceptWaveform(frame);speech|=vad.isSpeechDetected()||!vad.empty();while(!vad.empty())vad.pop();}
   vad.flush();return speech||vad.isSpeechDetected()||!vad.empty();
  }finally{Arrays.fill(frame,0);vad.reset();vad.clear();}
 }
 public void close(){if(vad!=null){vad.release();vad=null;}}
}
