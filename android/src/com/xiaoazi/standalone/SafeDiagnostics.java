package com.xiaoazi.standalone;
import java.util.*;
/** No free strings, recognition text, audio, paths, model payloads or credentials are accepted. */
final class SafeDiagnostics {
 private final ArrayDeque<Map<String,Object>> events=new ArrayDeque<>();
 private static String pick(String value,String allowed){return Arrays.asList(allowed.split(",")).contains(value)?value:"unknown";}
 synchronized void asr(String provider,String phase,String code,int nativeCode){
  Map<String,Object> row=new LinkedHashMap<>();row.put("at",System.currentTimeMillis());row.put("area","asr");
  row.put("provider",pick(provider,"system,on-device,vosk,sensevoice-int8,none"));
  row.put("phase",pick(phase,"request,permission,loading,create,start,ready,recognizing,final,error,cancel,fallback,stop"));
  row.put("code",pick(code,"none,asr-too-long,permission,service-missing,timeout,cancelled,no-speech,language,start-failed,asr-client,asr-busy,asr-network,asr-audio,asr-server,asr-rate-limit,asr-disconnected,offline-model,offline-audio,offline-init"));
  row.put("nativeCode",Math.max(-1,Math.min(100,nativeCode)));add(row);
 }
 synchronized void media(String phase,String failure,int error,int ready,int network,double time,double duration){
  Map<String,Object> row=new LinkedHashMap<>();row.put("at",System.currentTimeMillis());row.put("area","song");row.put("source","local-session");
  row.put("phase",pick(phase,"idle,ready,starting,playing,paused,blocked,ended,error,missing"));row.put("failure",pick(failure,"none,autoplay,decode,network,unsupported,aborted,unknown"));
  row.put("mediaErrorCode",Math.max(0,Math.min(4,error)));row.put("readyState",Math.max(0,Math.min(4,ready)));row.put("networkState",Math.max(0,Math.min(3,network)));
  row.put("currentTime",number(time));row.put("duration",number(duration));add(row);
 }
 private double number(double n){return Double.isFinite(n)?Math.max(0,Math.min(86400,n)):0;}
 private void add(Map<String,Object> row){events.add(row);while(events.size()>80)events.removeFirst();}
 synchronized List<Map<String,Object>> snapshot(){List<Map<String,Object>> copy=new ArrayList<>();for(Map<String,Object> row:events)copy.add(new LinkedHashMap<>(row));return copy;}
}
