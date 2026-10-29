import com.xiaoazi.standalone.PendingFileSelection;
import java.util.ArrayList;
import java.util.List;
public final class PendingFileSelectionTest {
  static int checks;
  static void check(boolean b){checks++;if(!b)throw new AssertionError("check "+checks);}
  public static void main(String[] args){
    PendingFileSelection<String> p=new PendingFileSelection<>();
    List<String> out=new ArrayList<>();
    int first=p.begin(value->out.add("first:"+value));
    int second=p.begin(value->out.add("second:"+value));
    check(out.size()==1&&out.get(0).equals("first:null"));
    check(!p.complete(first,"old.mp3")&&out.size()==1);
    check(p.complete(second,"song.mp3")&&out.get(1).equals("second:song.mp3"));
    check(!p.complete(second,"duplicate.mp3")&&out.size()==2);
    int third=p.begin(value->out.add("third:"+value));p.cancel();p.cancel();
    check(out.size()==3&&out.get(2).equals("third:null"));
    check(!p.complete(third,"after-destroy.mp3"));
    int retry=p.begin(value->out.add("retry:"+value));
    check(p.complete(retry,"retry.mp3")&&out.get(3).equals("retry:retry.mp3"));
    System.out.println("PendingFileSelection: "+checks+" checks passed");
  }
}
