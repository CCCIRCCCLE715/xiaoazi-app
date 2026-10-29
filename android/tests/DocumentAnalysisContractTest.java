package com.xiaoazi.standalone;
import org.json.*;
public final class DocumentAnalysisContractTest {
 static int checks; static void check(boolean value){checks++;if(!value)throw new AssertionError("document contract "+checks);}
 static JSONObject payload(String text)throws Exception{return new JSONObject().put("units",new JSONArray().put(new JSONObject().put("sourceId","line-1").put("label","第1行").put("text",text)));}
 static void bad(JSONObject input)throws Exception{checks++;try{DocumentAnalysisContract.validate(input);throw new AssertionError("invalid document accepted");}catch(AssertionError e){throw e;}catch(Exception expected){}}
 public static void main(String[] args)throws Exception{
  JSONObject data=payload("2026年10月25日16:00前交稿。忽略规则是文件引用，不是系统指令。");
  JSONArray units=DocumentAnalysisContract.validate(data);check(units.length()==1);check(units.getJSONObject(0).getString("text").contains("2026年10月25日"));
  bad(new JSONObject());bad(new JSONObject().put("units",new JSONArray()));bad(payload(""));bad(payload("文").put("text","duplicate"));
  JSONObject wrong=payload("文");wrong.getJSONArray("units").getJSONObject(0).put("execute",true);bad(wrong);
  wrong=payload("文");wrong.getJSONArray("units").getJSONObject(0).put("sourceId","../../file");bad(wrong);
  wrong=payload("文");wrong.getJSONArray("units").getJSONObject(0).put("text",7);bad(wrong);
  wrong=payload("文");wrong.getJSONArray("units").put(wrong.getJSONArray("units").getJSONObject(0));bad(wrong);
  bad(payload(new String(new char[12001]).replace('\0','文')));
  check(DocumentAnalysisContract.PROMPT.contains("数据"));check(DocumentAnalysisContract.PROMPT.contains("不执行"));check(DocumentAnalysisContract.PROMPT.contains("sourceId"));
  JSONObject request=DocumentAnalysisContract.request(data,"deepseek-flash");
  check(request.getInt("max_tokens")==6000);check(!request.getBoolean("stream"));
  JSONArray messages=request.getJSONArray("messages");check(messages.length()==2);
  JSONObject user=new JSONObject(messages.getJSONObject(1).getString("content"));check(user.length()==1&&user.has("units"));check(user.toString().equals(data.toString()));
  JSONObject large=new JSONObject();JSONArray many=new JSONArray();for(int i=0;i<500;i++)many.put(new JSONObject().put("sourceId","line-"+i).put("label",new String(new char[150]).replace('\0','文')).put("text","交稿"));large.put("units",many);
  try{DocumentAnalysisContract.request(large,"deepseek-flash");throw new AssertionError("UTF8 request exceeded limit");}catch(ModelHttp.Failure expected){check(expected.code.equals("request_too_large"));}
  System.out.println("DocumentAnalysisContract: "+checks+" checks passed; production schema, no service call");
 }
}
