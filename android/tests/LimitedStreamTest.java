import java.io.ByteArrayInputStream;
import com.xiaoazi.standalone.LimitedStream;
public class LimitedStreamTest {
  public static void main(String[] args)throws Exception {
    byte[] source=new byte[100];for(int i=0;i<source.length;i++)source[i]=(byte)i;
    LimitedStream s=new LimitedStream(new ByteArrayInputStream(source),10);
    byte[] buf=new byte[100];if(s.read(buf,0,100)!=10||s.read()!=-1||buf[9]!=9)throw new AssertionError("range overread");
    s=new LimitedStream(new ByteArrayInputStream(source),3);
    if(s.read(buf,0,0)!=0||s.skip(100)!=3||s.read(buf)!=-1)throw new AssertionError("skip bounds");
    System.out.println("LimitedStream: bounds passed");
  }
}
