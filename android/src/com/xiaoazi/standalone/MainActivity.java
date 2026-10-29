package com.xiaoazi.standalone;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
  private String diagnosticExport;private static final int DIAGNOSTIC_DOCUMENT=0x5a31;
  private WebView web;
  private AssistantBridge assistant;
  private boolean selectingDocument,selectingWorkPlan;
  private final java.util.concurrent.ExecutorService fileWorker=java.util.concurrent.Executors.newSingleThreadExecutor();
  private final PendingFileSelection<Uri[]> audioSelection=new PendingFileSelection<>();
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    getWindow().setStatusBarColor(Color.rgb(24,18,17));
    getWindow().setNavigationBarColor(Color.rgb(24,18,17));
    FrameLayout root=new FrameLayout(this);
    root.setBackgroundColor(Color.rgb(24,18,17));
    if(Build.VERSION.SDK_INT>=35) {
      root.setOnApplyWindowInsetsListener((v,insets)->{
        Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
        v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
        return insets;
      });
    }
    web=new WebView(this);
    root.addView(web,new FrameLayout.LayoutParams(-1,-1));
    setContentView(root);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
    // Content access supports user-selected SAF audio; navigation/resource loading
    // is still restricted to appassets by the WebViewClient below. No file access.
    s.setAllowFileAccess(false);s.setAllowContentAccess(true);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setSupportMultipleWindows(false);
    s.setJavaScriptCanOpenWindowsAutomatically(false);
    WebView.setWebContentsDebuggingEnabled(false);
    web.setBackgroundColor(Color.TRANSPARENT);
    web.setWebChromeClient(new WebChromeClient(){
      @Override public Bitmap getDefaultVideoPoster(){return Bitmap.createBitmap(1,1,Bitmap.Config.ARGB_8888);}
      @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
        if(ResourcePolicy.assetPath(view.getUrl())==null){callback.onReceiveValue(null);return true;}
        selectingDocument=FileChooserPolicy.documentAccept(params.getAcceptTypes());
        selectingWorkPlan=FileChooserPolicy.metadataOnlyAccept(params.getAcceptTypes());
        int request=audioSelection.begin(callback::onReceiveValue);
        Intent picker=new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);picker.setType(selectingDocument?"*/*":"audio/*");
        // No MIME whitelist: vendor document providers may mark PDFs as generic binary. Validate after selection.
        picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,false);
        picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try{startActivityForResult(picker,request);}
        catch(RuntimeException e){audioSelection.complete(request,null);Toast.makeText(MainActivity.this,"手机未找到文件选择器",Toast.LENGTH_SHORT).show();}
        return true;
      }
    });
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return ResourcePolicy.assetPath(request.getUrl().toString())==null;}
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return resource(request);}
    });
    assistant=new AssistantBridge(this,web);
    web.addJavascriptInterface(assistant,"XiaoaziNative");
    web.loadUrl("https://appassets.androidplatform.net/#/");
  }
  @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(assistant!=null)assistant.permissionResult(code,results);}
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
    if(requestCode==DIAGNOSTIC_DOCUMENT){String report=diagnosticExport;diagnosticExport=null;if(resultCode==RESULT_OK&&data!=null&&report!=null&&data.getData()!=null&&"content".equalsIgnoreCase(data.getData().getScheme())){try(java.io.OutputStream out=getContentResolver().openOutputStream(data.getData(),"wt")){if(out==null)throw new java.io.IOException();out.write(report.getBytes(java.nio.charset.StandardCharsets.UTF_8));Toast.makeText(this,"脱敏诊断已保存",Toast.LENGTH_SHORT).show();}catch(Exception e){Toast.makeText(this,"保存失败，请重试",Toast.LENGTH_SHORT).show();}}return;}
    if(audioSelection.matches(requestCode)){
      if(resultCode!=RESULT_OK||data==null||data.getData()==null){audioSelection.complete(requestCode,null);return;}
      final Uri uri=data.getData();final boolean document=selectingDocument,metadataOnly=selectingWorkPlan;
      if(!"content".equalsIgnoreCase(uri.getScheme())){audioSelection.complete(requestCode,null);return;}
      fileWorker.submit(()->{
        boolean valid=false;org.json.JSONObject selection=new org.json.JSONObject();String failure=document?"请选择受支持的文档，单个文件不超过10MiB":"请选择音频文件";
        try{
          String mime=getContentResolver().getType(uri);
          if(document){
            String name=null;long size=-1;
            try(android.database.Cursor cursor=getContentResolver().query(uri,new String[]{android.provider.OpenableColumns.DISPLAY_NAME,android.provider.OpenableColumns.SIZE},null,null,null)){if(cursor!=null&&cursor.moveToFirst()){name=cursor.getString(0);if(!cursor.isNull(1))size=cursor.getLong(1);}}
            valid=FileChooserPolicy.allowedDocument(name,mime,size);
            if(valid&&metadataOnly){selection.put("name",name);selection.put("type",mime==null?"":mime);selection.put("bytes",Math.max(0,size));}
            if(valid&&!metadataOnly)try(InputStream input=getContentResolver().openInputStream(uri)){if(input==null)throw new java.io.IOException();byte[] buffer=new byte[16384];long bytes=0;int n;while((n=input.read(buffer))!=-1){bytes+=n;if(bytes>10*1024*1024){valid=false;break;}}if(bytes==0)valid=false;}
          }else valid=mime!=null&&(mime.toLowerCase(java.util.Locale.ROOT).startsWith("audio/")||mime.equalsIgnoreCase("application/ogg"));
        }catch(Exception e){valid=false;failure="文件暂时无法读取，请重新选择";}
        final boolean ok=valid;final String message=failure;
        runOnUiThread(()->{if(!audioSelection.matches(requestCode))return;if(!ok)Toast.makeText(MainActivity.this,message,Toast.LENGTH_LONG).show();if(metadataOnly){
          // Never return the URI: WebView must not open the document to construct a File.
          audioSelection.complete(requestCode,null);
          if(ok)web.evaluateJavascript("window.dispatchEvent(new CustomEvent('xiaoazi:work-file-selected',{detail:"+selection.toString()+"}));",null);
        }else audioSelection.complete(requestCode,ok?new Uri[]{uri}:null);});
      });return;
    }
    super.onActivityResult(requestCode,resultCode,data);
  }
  void exportDiagnostic(String report){
    if(report==null||report.length()>65536)return;diagnosticExport=report;
    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"xiaoazi-v9-diagnostics.json");
    try{startActivityForResult(intent,DIAGNOSTIC_DOCUMENT);}catch(RuntimeException e){diagnosticExport=null;Toast.makeText(this,"手机未找到文件保存界面",Toast.LENGTH_SHORT).show();}
  }
  org.json.JSONObject probeBundledSong(){
    org.json.JSONObject report=new org.json.JSONObject();android.media.MediaMetadataRetriever metadata=null;
    try{
      String name=null;for(String candidate:getAssets().list("web/assets"))if(candidate.startsWith("special-person-preview-")&&candidate.endsWith(".m4a")){name=candidate;break;}
      if(name==null){report.put("stage","asset-missing");return report;}
      try(AssetFileDescriptor fd=getAssets().openFd("web/assets/"+name)){
        report.put("openFd",true);report.put("bytes",fd.getLength());report.put("mime",ResourcePolicy.mime(name));
        metadata=new android.media.MediaMetadataRetriever();metadata.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());
        report.put("durationMs",metadata.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION));
        report.put("hasAudio",metadata.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO));
        String decoder=new android.media.MediaCodecList(android.media.MediaCodecList.REGULAR_CODECS).findDecoderForFormat(android.media.MediaFormat.createAudioFormat("audio/mp4a-latm",44100,2));
        report.put("aacDecoderAvailable",decoder!=null);report.put("stage","metadata-readable");
      }
    }catch(Exception e){try{report.put("stage","native-asset-read-failed");report.put("exceptionType",e instanceof java.io.IOException?"io":"metadata");}catch(Exception ignored){}}
    finally{if(metadata!=null)try{metadata.release();}catch(Exception ignored){}}
    return report;
  }
  private WebResourceResponse empty(int status,String reason,Map<String,String> headers){
    return new WebResourceResponse("text/plain","UTF-8",status,reason,headers,new ByteArrayInputStream(new byte[0]));
  }
  private WebResourceResponse resource(WebResourceRequest request){
    Map<String,String> headers=new HashMap<>();
    headers.put("X-Content-Type-Options","nosniff");
    headers.put("Cache-Control","no-store");
    String path=ResourcePolicy.assetPath(request.getUrl().toString());
    if(path==null)return empty(403,"Forbidden",headers);
    if(!request.getMethod().equals("GET")&&!request.getMethod().equals("HEAD"))return empty(405,"Method Not Allowed",headers);
    AssetFileDescriptor fd=null;InputStream stream=null;
    try{
      fd=getAssets().openFd(path);long length=fd.getLength();
      String header=null;
      for(Map.Entry<String,String> e:request.getRequestHeaders().entrySet())if(e.getKey().equalsIgnoreCase("Range"))header=e.getValue();
      long[] range;
      try{range=ResourcePolicy.range(header,length);}catch(IllegalArgumentException e){fd.close();headers.put("Content-Range","bytes */"+length);return empty(416,"Range Not Satisfiable",headers);}
      long start=range==null?0:range[0],end=range==null?length-1:range[1],count=end-start+1;
      headers.put("Accept-Ranges","bytes");headers.put("Content-Length",Long.toString(count));
      if(range!=null)headers.put("Content-Range","bytes "+start+"-"+end+"/"+length);
      if(request.getMethod().equals("HEAD")){fd.close();return empty(range==null?200:206,range==null?"OK":"Partial Content",headers);}
      stream=fd.createInputStream();
      long left=start;while(left>0){long n=stream.skip(left);if(n==0){if(stream.read()<0)throw new java.io.EOFException();n=1;}left-=n;}
      String mime=ResourcePolicy.mime(path);
      return new WebResourceResponse(mime,mime.startsWith("text/")||mime.contains("javascript")||mime.endsWith("json")?"UTF-8":null,range==null?200:206,range==null?"OK":"Partial Content",headers,new LimitedStream(stream,count));
    }catch(Exception e){
      try{if(stream!=null)stream.close();else if(fd!=null)fd.close();}catch(Exception ignored){}
      return empty(404,"Not Found",headers);
    }
  }
  @Override public void onBackPressed(){String route=Uri.parse(web.getUrl()).getFragment();if(route!=null&&(route.equals("/morning")||route.startsWith("/morning?")))return;if(web.canGoBack())web.goBack();else super.onBackPressed();}
  @Override protected void onPause(){
    if(assistant!=null)assistant.pause();
    web.evaluateJavascript("document.querySelectorAll('audio,video').forEach(m=>m.pause());window.dispatchEvent(new Event('xiaoazi:pause'));",null);
    web.onPause();web.pauseTimers();super.onPause();
  }
  @Override protected void onResume(){super.onResume();if(assistant!=null)assistant.resume();if(web!=null){web.resumeTimers();web.onResume();}}
  @Override protected void onDestroy(){if(assistant!=null)assistant.destroy();audioSelection.cancel();fileWorker.shutdownNow();diagnosticExport=null;if(web!=null){web.stopLoading();web.destroy();web=null;}super.onDestroy();}
}
