package com.xiaoazi.standalone;
import com.sun.net.httpserver.*;
import javax.net.ssl.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.io.*;
import java.security.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
/** A real loopback TLS server exercises production HTTPS transport; no provider calls. */
public final class ModelHttpsTest {
 static int checks;static void check(boolean value,String why){checks++;if(!value)throw new AssertionError(why);}
 public static void main(String[] args)throws Exception{
  char[] pass="test-only-fixture".toCharArray();KeyStore ks=KeyStore.getInstance("PKCS12");try(InputStream in=new FileInputStream(args[0])){ks.load(in,pass);}
  KeyManagerFactory km=KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());km.init(ks,pass);TrustManagerFactory tm=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());tm.init(ks);
  SSLContext ssl=SSLContext.getInstance("TLS");ssl.init(km.getKeyManagers(),tm.getTrustManagers(),null);
  HttpsServer server=HttpsServer.create(new InetSocketAddress("127.0.0.1",0),0);server.setHttpsConfigurator(new HttpsConfigurator(ssl));ExecutorService executor=Executors.newCachedThreadPool();server.setExecutor(executor);
  AtomicInteger redirected=new AtomicInteger();String[] received=new String[3];CountDownLatch slow=new CountDownLatch(1);
  server.createContext("/ok/chat/completions",e->{received[0]=e.getRequestMethod();received[1]=e.getRequestHeaders().getFirst("Authorization");received[2]=new String(e.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);byte[] data="{\"choices\":[{\"message\":{\"content\":\"陛下，臣在。\"}}]}".getBytes(StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(200,data.length);e.getResponseBody().write(data);e.close();});
  server.createContext("/redirect/chat/completions",e->{e.getResponseHeaders().set("Location","/stolen");e.sendResponseHeaders(302,-1);e.close();});
  server.createContext("/stolen",e->{redirected.incrementAndGet();e.sendResponseHeaders(200,-1);e.close();});
  server.createContext("/error/chat/completions",e->{byte[] raw="FAKE_KEY_MUST_NOT_LEAK".getBytes();e.sendResponseHeaders(401,raw.length);e.getResponseBody().write(raw);e.close();});
  server.createContext("/large/chat/completions",e->{e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(200,600000);try{e.getResponseBody().write(new byte[600000]);}catch(IOException ignored){}e.close();});
  server.createContext("/slow/chat/completions",e->{e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(200,0);slow.countDown();try{for(int i=0;i<60;i++){e.getResponseBody().write(' ');e.getResponseBody().flush();Thread.sleep(50);}}catch(Exception ignored){}e.close();});
  server.start();int port=server.getAddress().getPort();ModelHttp.Connections opener=url->{HttpsURLConnection c=(HttpsURLConnection)new URL("https://localhost:"+port+url.getPath()).openConnection();c.setSSLSocketFactory(ssl.getSocketFactory());return c;};
  try{
   String body="{\"model\":\"deepseek-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}],\"stream\":false}";
   String response=new ModelHttp(opener).post(ModelHttp.endpoint("https://vendor.example/ok"),"FAKE_TEST_KEY",body);check(response.contains("陛下，臣在。"),"UTF8 response");check("POST".equals(received[0]),"POST method");check("Bearer FAKE_TEST_KEY".equals(received[1]),"Bearer header");check(body.equals(received[2]),"request UTF8 body");
   org.json.JSONObject doc=new org.json.JSONObject().put("units",new org.json.JSONArray().put(new org.json.JSONObject().put("sourceId","sheet-1-row-2").put("label","工作 第2行").put("text","2026-10-25 16:00前提交分镜；无日期事项不要默认今天。")));
   String documentBody=DocumentAnalysisContract.request(doc,"deepseek-flash").toString();
   new ModelHttp(opener).post(ModelHttp.endpoint("https://vendor.example/ok"),"FAKE_TEST_KEY",documentBody);
   check(documentBody.equals(received[2]),"production document request exact UTF8 over TLS");
   org.json.JSONObject delivered=new org.json.JSONObject(received[2]);org.json.JSONObject source=new org.json.JSONObject(delivered.getJSONArray("messages").getJSONObject(1).getString("content"));
   check(source.toString().equals(doc.toString()),"units only; no duplicate full text/file metadata");
   check(delivered.getInt("max_tokens")==6000,"document response budget distinct from ordinary intent");
   try{new ModelHttp(opener).post(ModelHttp.endpoint("https://vendor.example/ok"),"FAKE_TEST_KEY",new String(new char[22000]).replace('\0','文'));throw new AssertionError("UTF8 oversized accepted");}catch(ModelHttp.Failure failure){check("request_too_large".equals(failure.code),"whole UTF8 request bound");}
   for(String[] fixture:new String[][]{{"redirect","redirect_blocked"},{"error","authentication"},{"large","response_too_large"}}){try{new ModelHttp(opener).post(ModelHttp.endpoint("https://vendor.example/"+fixture[0]),"FAKE_TEST_KEY",body);throw new AssertionError("accepted "+fixture[0]);}catch(ModelHttp.Failure failure){check(fixture[1].equals(failure.code),fixture[0]+" status");check(!failure.getMessage().contains("FAKE"),"sanitized error");}}
   check(redirected.get()==0,"redirect not followed");
   ModelHttp delayed=new ModelHttp(opener);Future<?> pending=executor.submit(()->{try{delayed.post(ModelHttp.endpoint("https://vendor.example/slow"),"FAKE_TEST_KEY",body);throw new AssertionError("cancel ignored");}catch(ModelHttp.Failure failure){check("cancelled".equals(failure.code),"cancel slow TLS response");}});check(slow.await(3,TimeUnit.SECONDS),"slow stream started");delayed.cancel();pending.get(3,TimeUnit.SECONDS);
   System.out.println("ModelHttps: "+checks+" checks passed; real TLS loopback, fake key only");
  }finally{server.stop(0);executor.shutdownNow();}
 }
}
