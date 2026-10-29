package com.xiaoazi.standalone;
import android.content.Context;import android.media.*;import android.os.*;
import java.io.*;import java.util.Arrays;import java.util.concurrent.*;
/** Foreground AudioRecord -> one in-memory16k utterance -> bundled non-streaming SenseVoice. */
final class OfflineSpeech {
 interface Listener{void loading();void ready();void partial(String text);void result(String text);void error(String code);}
 static final String MODEL_NAME="sensevoice-small-int8-2024-07-17";
 private static final BundledModelStore.Entry[] FILES={
  new BundledModelStore.Entry("model.int8.onnx",239233841,"c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51"),
  new BundledModelStore.Entry("tokens.txt",315894,"f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc"),
  new BundledModelStore.Entry("silero_vad_v5.onnx",2313101,"6b99cbfd39246b6706f98ec13c7c50c6b299181f2474fa05cbc8046acc274396")};
 private final Context context;private final Handler main=new Handler(Looper.getMainLooper());
 private final ExecutorService io=Executors.newSingleThreadExecutor();private final File directory;private final BundledModelStore store;
 private SenseVoiceEngine model;private volatile Session active;private volatile boolean destroyed,modelLoaded;
 private volatile String readiness="preparing";private volatile long initMs=-1,decodeMs=-1,audioMs=-1;
 private static final class Session{final OfflineUtterance pcm=new OfflineUtterance(16000*30,1600);volatile AudioRecord audio;}
 OfflineSpeech(Context context){this.context=context.getApplicationContext();directory=new File(context.getNoBackupFilesDir(),MODEL_NAME);store=new BundledModelStore(directory,FILES);prewarm();}
 // Preparing the files and model is serialized off UI and never opens the microphone.
 void prewarm(){if(destroyed||modelLoaded)return;io.submit(()->{try{ensureModel();}catch(IOException|RuntimeException|LinkageError|OutOfMemoryError ignored){readiness="error";}});}
 private void ensureModel()throws IOException{
  if(model!=null||destroyed)return;readiness="preparing";long start=SystemClock.elapsedRealtime();
  try{store.prepare(name->context.getAssets().open("sensevoice/"+name));if(destroyed)return;model=new SenseVoiceEngine(directory);modelLoaded=true;readiness="ready";}
  catch(IOException|RuntimeException|LinkageError|OutOfMemoryError e){readiness="error";throw e;}
  finally{initMs=SystemClock.elapsedRealtime()-start;}
 }
 boolean loaded(){return modelLoaded;}boolean installed(){return store.installed();}
 String readiness(){return readiness;}long initMs(){return initMs;}long decodeMs(){return decodeMs;}long audioMs(){return audioMs;}
 private void post(Session s,Runnable action){main.post(()->{if(!destroyed&&active==s&&!s.pcm.cancelled())action.run();});}
 void start(Listener listener){
  cancel();final Session s=new Session();active=s;listener.loading();
  io.submit(()->{
   AudioRecord audio=null;short[] block=new short[1600];float[] samples=null;String result=null,error=null;
   try{
    if(s.pcm.cancelled()||destroyed)return;if(s.pcm.stopped())throw new NoSpeech();ensureModel();
    if(s.pcm.cancelled()||destroyed)return;if(s.pcm.stopped())throw new NoSpeech();
    int minimum=AudioRecord.getMinBufferSize(16000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
    if(minimum<=0)throw new CaptureFailure();
    audio=new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,16000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,Math.max(minimum*2,6400));s.audio=audio;
    if(audio.getState()!=AudioRecord.STATE_INITIALIZED)throw new CaptureFailure();
    synchronized(s){if(destroyed||!s.pcm.begin())return;audio.startRecording();if(audio.getRecordingState()!=AudioRecord.RECORDSTATE_RECORDING)throw new CaptureFailure();}
    post(s,()->{if(!s.pcm.stopped())listener.ready();});long deadline=SystemClock.elapsedRealtime()+30000;
    while(!s.pcm.stopped()&&!s.pcm.cancelled()&&!destroyed&&SystemClock.elapsedRealtime()<deadline){
     int n=audio.read(block,0,block.length);
     if(n<0){if(s.pcm.stopped()||s.pcm.cancelled())break;throw new CaptureFailure();}
     if(n>0)s.pcm.append(block,n);
    }
    if(!s.pcm.stopped()&&!s.pcm.cancelled()&&!destroyed)throw new UtteranceLimit();
    if(s.pcm.cancelled()||destroyed)return;
    // Release AudioRecord before running the non-streaming decoder. No VAD partials are emitted.
    s.audio=null;try{audio.stop();}catch(RuntimeException ignored){}audio.release();audio=null;
    samples=s.pcm.takeForDecode();audioMs=samples.length*1000L/16000;
    if(samples.length==0){error="no-speech";}else{
     long before=SystemClock.elapsedRealtime();try{result=model.decode(samples);}finally{decodeMs=SystemClock.elapsedRealtime()-before;}
    }
   }catch(NoSpeech e){error="no-speech";}catch(UtteranceLimit|IllegalArgumentException e){error="asr-too-long";}catch(SecurityException e){error="permission";}catch(CaptureFailure e){error="offline-audio";}
   catch(IOException e){error=model==null?"offline-model":"offline-init";}catch(LinkageError|RuntimeException|OutOfMemoryError e){error="offline-init";}
   finally{
    Arrays.fill(block,(short)0);if(samples!=null)Arrays.fill(samples,0);s.pcm.cancel();s.audio=null;
    if(audio!=null){try{audio.stop();}catch(RuntimeException ignored){}audio.release();}
   }
   final String words=result,failure=error;
   // PCM has been cleared; session identity is still fenced against newer holds/cancel/background.
   main.post(()->{if(!destroyed&&active==s){active=null;if(failure!=null)listener.error(failure);else if(words==null||words.isEmpty())listener.error("no-speech");else listener.result(words.substring(0,Math.min(4000,words.length())));}});
  });
 }
 void stop(){Session s=active;if(s!=null)synchronized(s){s.pcm.stop();stopCapture(s);}}
 void cancel(){Session s=active;active=null;if(s!=null)synchronized(s){s.pcm.cancel();stopCapture(s);}}
 private void stopCapture(Session s){AudioRecord a=s.audio;if(a!=null)try{a.stop();}catch(RuntimeException ignored){}}
 void destroy(){destroyed=true;cancel();io.submit(()->{if(model!=null){model.close();model=null;modelLoaded=false;}});io.shutdown();main.removeCallbacksAndMessages(null);}
 private static final class NoSpeech extends IOException{}
 private static final class CaptureFailure extends IOException{}private static final class UtteranceLimit extends IOException{}
}
