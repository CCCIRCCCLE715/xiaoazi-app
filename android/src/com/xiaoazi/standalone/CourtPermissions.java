package com.xiaoazi.standalone;
import android.app.Activity;import android.content.Context;import android.content.Intent;import android.content.pm.PackageManager;import android.provider.Settings;import android.net.Uri;import org.json.*;
final class CourtPermissions {
 static JSONObject status(Context c)throws JSONException{return new JSONObject().put("microphone",c.checkSelfPermission("android.permission.RECORD_AUDIO")==PackageManager.PERMISSION_GRANTED?"granted":"denied");}
 static void open(Activity a,String permission){
  if(!"microphone".equals(permission))throw new IllegalArgumentException();
  a.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+a.getPackageName())));
 }
}
