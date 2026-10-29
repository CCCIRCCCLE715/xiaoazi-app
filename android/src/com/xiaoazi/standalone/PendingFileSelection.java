package com.xiaoazi.standalone;
public final class PendingFileSelection<T> {
  public interface Completion<T>{void deliver(T value);}
  private Completion<T> pending;
  private int active=-1,next=0x4100;
  public int begin(Completion<T> callback){
    cancel();active=next;next=next==0xfffe?0x4100:next+1;pending=callback;return active;
  }
  public boolean complete(int request,T value){
    if(request!=active||pending==null)return false;
    Completion<T> callback=pending;pending=null;active=-1;callback.deliver(value);return true;
  }
  public boolean matches(int request){return request==active&&pending!=null;}
  public void cancel(){if(pending!=null)complete(active,null);}
}
