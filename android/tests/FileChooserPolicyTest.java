package com.xiaoazi.standalone;
public class FileChooserPolicyTest {
 private static int checks;
 private static void check(boolean ok,String label){checks++;if(!ok)throw new AssertionError(label);}
 public static void main(String[] args){
  // Only an unambiguous audio input can select the audio filter. Vendor normalization must default to documents.
  String[][] documents={null,new String[]{},new String[]{null},new String[]{""},new String[]{"*/*"},new String[]{"application/octet-stream"},new String[]{".pdf"},new String[]{"application/pdf"},new String[]{".docx","application/pdf"},new String[]{"audio/*","*/*"},new String[]{"audio/*",".pdf"},new String[]{"image/png"}};
  for(String[] types:documents)check(FileChooserPolicy.documentAccept(types),"ambiguous/document input must not open audio picker: "+java.util.Arrays.toString(types));
  for(String[] types:new String[][]{new String[]{"audio/*"},new String[]{" AUDIO/MPEG "},new String[]{"audio/wav","audio/mp4"},new String[]{".mp3,.m4a"},new String[]{"application/ogg"}})check(!FileChooserPolicy.documentAccept(types),"known audio input: "+java.util.Arrays.toString(types));
  for(String mime:new String[]{null,""," application/octet-stream ","binary/octet-stream","application/x-download","application/download","application/force-download","*/*","application/unknown","unknown/unknown","application/pdf","APPLICATION/PDF; charset=binary"})check(FileChooserPolicy.allowedDocument("待办-两页中文.PDF",mime,1024),"vendor PDF metadata: "+mime);
  check(FileChooserPolicy.allowedDocument("工作.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document",100),"docx");
  check(FileChooserPolicy.allowedDocument("表格.xlsx","application/octet-stream",100),"xlsx");
  check(FileChooserPolicy.allowedDocument("待办.pdf",null,-1),"unknown metadata size is checked by bounded stream later");
  for(String name:new String[]{"a.doc","a.xls","a.exe","a.pdf.exe","a.html"})check(!FileChooserPolicy.allowedDocument(name,"application/octet-stream",100),"blocked extension "+name);
  for(String mime:new String[]{"image/png","audio/mpeg","video/mp4","application/x-msdownload"})check(!FileChooserPolicy.allowedDocument("a.pdf",mime,100),"conflicting MIME "+mime);
  for(long size:new long[]{0,10485761,-2})check(!FileChooserPolicy.allowedDocument("a.pdf","application/pdf",size),"bad size "+size);
  check(FileChooserPolicy.allowedDocument("a.pdf","application/pdf",10485760),"10MiB boundary");
  check(!FileChooserPolicy.allowedDocument(null,"application/pdf",10),"missing filename");
  check(FileChooserPolicy.metadataOnlyAccept(new String[]{"application/pdf,application/x-xiaoazi-work-plan"}),"work metadata marker");
  check(FileChooserPolicy.metadataOnlyAccept(new String[]{" APPLICATION/X-XIAOAZI-WORK-PLAN "}),"normalized work marker");
  check(!FileChooserPolicy.metadataOnlyAccept(new String[]{"application/pdf"}),"restored real analysis picker");
  check(!FileChooserPolicy.metadataOnlyAccept(new String[]{"audio/*"}),"audio path unaffected");
  System.out.println("File chooser policy: "+checks+" checks passed");
 }
}
