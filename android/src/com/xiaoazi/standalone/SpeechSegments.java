package com.xiaoazi.standalone;
/** In-memory utterance accumulation. Endpoint commits do not finish a held recording. */
final class SpeechSegments {
 private final StringBuilder committed=new StringBuilder();private int lastSequence;private boolean finished;
 String commit(int sequence,String text){if(finished||sequence<=lastSequence)return committed.toString();append(text);lastSequence=sequence;return committed.toString();}
 String partial(String text){return finished?committed.toString():join(committed.toString(),text);}
 String finish(String tail){if(!finished){append(tail);finished=true;}return committed.toString();}
 private void append(String text){String value=join(committed.toString(),text);committed.setLength(0);committed.append(value);}
 private static String join(String a,String b){b=b==null?"":b.trim();String result=b.isEmpty()?a:a.isEmpty()?b:a+" "+b;if(result.length()>4000)throw new IllegalArgumentException("speech too long");return result;}
}
