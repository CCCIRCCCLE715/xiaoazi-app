package com.xiaoazi.standalone;
import java.io.*;import java.security.*;import java.util.*;
/** Copies only named, pinned bundled model assets. Network and recording input are not accepted. */
final class BundledModelStore {
 interface Source {InputStream open(String name)throws IOException;}
 static final class Entry {
  final String name,sha;final long bytes;
  Entry(String name,long bytes,String sha){if(!name.matches("[A-Za-z0-9_.-]{1,100}")||name.equals(".")||name.equals("..")||bytes<1||!sha.matches("[a-f0-9]{64}"))throw new IllegalArgumentException();this.name=name;this.bytes=bytes;this.sha=sha;}
 }
 private final File directory;private final Entry[] entries;
 BundledModelStore(File directory,Entry[] entries){this.directory=directory;this.entries=entries.clone();}
 boolean installed(){for(Entry e:entries)if(new File(directory,e.name).length()!=e.bytes)return false;return true;}
 synchronized void prepare(Source source)throws IOException{
  if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("model storage");
  for(Entry entry:entries){
   File destination=new File(directory,entry.name);if(valid(destination,entry))continue;
   File stage=new File(directory,entry.name+".preparing");
   try{
    long copied=0;MessageDigest digest=digest();
    try(InputStream in=source.open(entry.name);FileOutputStream out=new FileOutputStream(stage)){
     byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1){copied+=n;if(copied>entry.bytes)throw new IOException("model size");out.write(buffer,0,n);digest.update(buffer,0,n);}out.getFD().sync();
    }
    if(copied!=entry.bytes||!entry.sha.equals(hex(digest.digest())))throw new IOException("model checksum");
    if(destination.exists()&&!destination.delete())throw new IOException("model replace");
    if(!stage.renameTo(destination))throw new IOException("model move");
   }finally{stage.delete();}
  }
 }
 private boolean valid(File file,Entry entry)throws IOException{
  if(!file.isFile()||file.length()!=entry.bytes)return false;MessageDigest digest=digest();
  try(InputStream in=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)digest.update(buffer,0,n);}
  return entry.sha.equals(hex(digest.digest()));
 }
 private MessageDigest digest()throws IOException{try{return MessageDigest.getInstance("SHA-256");}catch(NoSuchAlgorithmException e){throw new IOException(e);}}
 private static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
}
