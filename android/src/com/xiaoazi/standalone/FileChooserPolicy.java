package com.xiaoazi.standalone;
import java.util.Locale;
public final class FileChooserPolicy {
 public static final String[] DOCUMENT_MIMES={"text/plain","text/markdown","text/csv","application/csv","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
 private static String normalizedMime(String mime){return mime==null?"":mime.split(";",2)[0].trim().toLowerCase(Locale.ROOT);}
 public static boolean documentAccept(String[] types){
  // Only an explicit, wholly audio accept list may use audio/*. Empty/wildcard vendor results are documents.
  if(types==null||types.length==0)return true;
  boolean audio=false;
  for(String type:types){
   if(type==null)return true;
   for(String part:type.split(",",-1)){
    String p=normalizedMime(part);
    if(p.matches("audio/(\\*|[a-z0-9.+-]+)")||p.equals("application/ogg")||p.matches("\\.(mp3|m4a|wav|ogg|oga|aac|flac|opus|aif|aiff)"))audio=true;
    else return true;
   }
  }
  return !audio;
 }
 public static boolean metadataOnlyAccept(String[] types){
  if(types==null)return false;
  for(String type:types)if(type!=null)for(String part:type.split(","))if(normalizedMime(part).equals("application/x-xiaoazi-work-plan"))return true;
  return false;
 }
 public static boolean allowedDocument(String name,String mime,long size){
  if(name==null||name.length()>240||size>10*1024*1024||size==0||size < -1)return false;
  String lower=name.toLowerCase(Locale.ROOT);if(!lower.matches(".*\\.(txt|md|csv|pdf|docx|xlsx)$"))return false;
  String type=normalizedMime(mime);
  if(type.isEmpty()||type.equals("*/*")||type.equals("application/octet-stream")||type.equals("binary/octet-stream")||type.equals("application/x-download")||type.equals("application/download")||type.equals("application/force-download")||type.equals("application/unknown")||type.equals("unknown/unknown"))return true;
  for(String m:DOCUMENT_MIMES)if(m.equals(type))return true;return false;
 }
}
