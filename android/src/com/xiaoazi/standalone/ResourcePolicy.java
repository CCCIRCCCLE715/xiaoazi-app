package com.xiaoazi.standalone;
import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ResourcePolicy {
  private static final Pattern RANGE=Pattern.compile("bytes=(\\d*)-(\\d*)");
  private ResourcePolicy() {}
  public static String assetPath(String url) {
    try {
      URI u=new URI(url);
      if(!"https".equals(u.getScheme()) || !"appassets.androidplatform.net".equals(u.getHost()) || u.getPort()!=-1 || u.getUserInfo()!=null) return null;
      String path=u.getPath();
      if(path==null || path.indexOf('\\')>=0 || path.indexOf('\0')>=0 || path.indexOf('%')>=0) return null;
      for(String s:path.split("/",-1)) if(s.equals(".")||s.equals("..")) return null;
      if(path.equals("/")||path.isEmpty()) return "web/index.html";
      return "web/"+path.substring(1);
    } catch(Exception e) {return null;}
  }
  public static long[] range(String header,long size) {
    if(header==null) return null;
    Matcher m=RANGE.matcher(header.trim());
    if(size<=0 || !m.matches() || (m.group(1).isEmpty()&&m.group(2).isEmpty())) throw new IllegalArgumentException("invalid range");
    try {
      long start,end;
      if(m.group(1).isEmpty()) {
        long suffix=Long.parseLong(m.group(2));if(suffix<=0)throw new IllegalArgumentException("invalid suffix");
        start=Math.max(0,size-suffix);end=size-1;
      }else{
        start=Long.parseLong(m.group(1));end=m.group(2).isEmpty()?size-1:Math.min(Long.parseLong(m.group(2)),size-1);
      }
      if(start>=size || start>end)throw new IllegalArgumentException("unsatisfiable range");
      return new long[]{start,end};
    }catch(NumberFormatException e){throw new IllegalArgumentException("range overflow",e);}
  }
  public static String mime(String path) {
    String p=path.toLowerCase(Locale.ROOT);
    if(p.endsWith(".html"))return "text/html";
    if(p.endsWith(".js")||p.endsWith(".mjs"))return "application/javascript";
    if(p.endsWith(".css"))return "text/css";
    if(p.endsWith(".json"))return "application/json";
    if(p.endsWith(".webm"))return "video/webm";
    if(p.endsWith(".m4a"))return "audio/mp4";
    if(p.endsWith(".mp4"))return "video/mp4";
    if(p.endsWith(".mp3"))return "audio/mpeg";
    if(p.endsWith(".wav"))return "audio/wav";
    if(p.endsWith(".png"))return "image/png";
    if(p.endsWith(".svg"))return "image/svg+xml";
    if(p.endsWith(".jpg")||p.endsWith(".jpeg"))return "image/jpeg";
    if(p.endsWith(".woff2"))return "font/woff2";
    return "application/octet-stream";
  }
}
