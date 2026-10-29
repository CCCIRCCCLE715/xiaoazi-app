package com.xiaoazi.standalone;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;
/** HTTPS-only transport. No credentials in URLs, redirects, logs or errors. */
final class ModelHttp {
 interface Connections { HttpsURLConnection open(URL url)throws IOException; }
 static final class Failure extends Exception { final String code; Failure(String code){super(code);this.code=code;} }
 static URL endpoint(String value){
  try{
   if(value==null||value.length()>2048||!value.equals(value.trim())||value.matches(".*[\\x00-\\x20\\x7f].*"))throw new IllegalArgumentException();
   URI uri=new URI(value);
   if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getPort()==0||uri.getPort()<-1)throw new IllegalArgumentException();
   String path=uri.getRawPath()==null?"":uri.getRawPath();while(path.endsWith("/"))path=path.substring(0,path.length()-1);
   if(path.contains("..")||path.contains("%"))throw new IllegalArgumentException();
   if(!path.endsWith("/chat/completions"))path+="/chat/completions";
   return new URI("https",null,uri.getHost(),uri.getPort(),path,null,null).toURL();
  }catch(Exception e){throw new IllegalArgumentException("invalid_endpoint");}
 }
 private final Connections factory;
 private volatile HttpsURLConnection connection; private volatile boolean cancelled;
 ModelHttp(){this(url->(HttpsURLConnection)url.openConnection());}
 ModelHttp(Connections factory){this.factory=factory;}
 void cancel(){cancelled=true;HttpsURLConnection active=connection;if(active!=null)active.disconnect();}
 String post(URL url,String key,String body)throws Failure{
  if(cancelled)throw new Failure("cancelled");
  if(key==null||key.isEmpty()||key.length()>8192||!key.matches("[\\x21-\\x7e]+"))throw new Failure("key_invalid");
  try{
   connection=factory.open(url);HttpsURLConnection c=connection;
   if(cancelled)throw new Failure("cancelled");
   c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(20000);c.setRequestMethod("POST");c.setDoOutput(true);
   c.setRequestProperty("Authorization","Bearer "+key);c.setRequestProperty("Content-Type","application/json; charset=utf-8");c.setRequestProperty("Accept","application/json");
   byte[] request=body.getBytes(StandardCharsets.UTF_8);if(request.length>65536)throw new Failure("request_too_large");
   c.setFixedLengthStreamingMode(request.length);try(OutputStream out=c.getOutputStream()){out.write(request);}
   int status=c.getResponseCode();
   if(status>=300&&status<400)throw new Failure("redirect_blocked");
   if(status<200||status>=300)throw new Failure(status==401||status==403?"authentication":status==429?"rate_limit":"http_error");
   String type=c.getContentType();if(type==null||!type.toLowerCase(java.util.Locale.ROOT).contains("application/json"))throw new Failure("invalid_response");
   ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){
    byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1){if(cancelled)throw new Failure("cancelled");if(out.size()+n>524288)throw new Failure("response_too_large");out.write(buf,0,n);}
   }
   if(cancelled)throw new Failure("cancelled");return new String(out.toByteArray(),StandardCharsets.UTF_8);
  }catch(SocketTimeoutException e){throw new Failure("timeout");}
   catch(IOException|RuntimeException e){throw new Failure(cancelled?"cancelled":"network");}
  finally{HttpsURLConnection c=connection;connection=null;if(c!=null)c.disconnect();}
 }
}
