package com.xiaoazi.standalone;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
public final class LimitedStream extends FilterInputStream {
  private long remaining;
  public LimitedStream(InputStream in,long limit){super(in);if(limit<0)throw new IllegalArgumentException();remaining=limit;}
  @Override public int read()throws IOException{if(remaining==0)return -1;int b=in.read();if(b>=0)remaining--;return b;}
  @Override public int read(byte[] b,int off,int len)throws IOException{if(len==0)return 0;if(remaining==0)return -1;int n=in.read(b,off,(int)Math.min(len,remaining));if(n>0)remaining-=n;return n;}
  @Override public long skip(long n)throws IOException{long k=in.skip(Math.min(Math.max(0,n),remaining));remaining-=k;return k;}
  @Override public int available()throws IOException{return (int)Math.min(in.available(),remaining);}
}
