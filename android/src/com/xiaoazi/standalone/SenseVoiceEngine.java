package com.xiaoazi.standalone;
import com.k2fsa.sherpa.onnx.*;
import java.io.File;
/** Non-streaming model. Construct and decode on the single ASR worker, never the UI thread. */
final class SenseVoiceEngine implements AutoCloseable {
 static final String ID="sensevoice-int8",MODEL="SenseVoiceSmall INT8 2024-07-17",RUNTIME="sherpa-onnx 2.0.0";
 static final int THREADS=2,SAMPLE_RATE=16000;
 private OfflineRecognizer recognizer;
 private LocalSpeechGate gate;
 SenseVoiceEngine(File directory){
  OfflineSenseVoiceModelConfig voice=OfflineSenseVoiceModelConfig.builder().setModel(new File(directory,"model.int8.onnx").getAbsolutePath()).setLanguage("zh").setInverseTextNormalization(true).build();
  OfflineModelConfig model=OfflineModelConfig.builder().setSenseVoice(voice).setTokens(new File(directory,"tokens.txt").getAbsolutePath()).setNumThreads(THREADS).setProvider("cpu").setDebug(false).build();
  OfflineRecognizerConfig config=OfflineRecognizerConfig.builder().setFeatureConfig(FeatureConfig.builder().setSampleRate(SAMPLE_RATE).setFeatureDim(80).setDither(0).build()).setOfflineModelConfig(model).setDecodingMethod("greedy_search").build();
  gate=new LocalSpeechGate(directory);
  try{recognizer=new OfflineRecognizer(config);}catch(RuntimeException|LinkageError|OutOfMemoryError e){gate.close();throw e;}
 }
 String decode(float[] samples){
  if(recognizer==null)throw new IllegalStateException("model closed");
  if(!gate.hasSpeech(samples))return "";
  OfflineStream stream=recognizer.createStream();
  try{stream.acceptWaveform(samples,SAMPLE_RATE);recognizer.decode(stream);return recognizer.getResult(stream).getText().trim();}
  finally{stream.release();}
 }
 public void close(){if(recognizer!=null){recognizer.release();recognizer=null;}if(gate!=null){gate.close();gate=null;}}
}
