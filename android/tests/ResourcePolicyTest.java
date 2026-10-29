import com.xiaoazi.standalone.ResourcePolicy;
public final class ResourcePolicyTest {
  static int count;
  static void check(boolean v) { count++; if(!v) throw new AssertionError("check " + count); }
  public static void main(String[] args) throws Exception {
    check(ResourcePolicy.assetPath("https://appassets.androidplatform.net/").equals("web/index.html"));
    check(ResourcePolicy.assetPath("https://appassets.androidplatform.net/assets/a.webm?x=1").equals("web/assets/a.webm"));
    for(String u:new String[]{"http://appassets.androidplatform.net/", "https://evil.example/a", "https://appassets.androidplatform.net/../secret", "https://appassets.androidplatform.net/%2e%2e/secret", "https://appassets.androidplatform.net/%2f..%2fsecret", "https://appassets.androidplatform.net:123/x", "https://x@appassets.androidplatform.net/a"}) check(ResourcePolicy.assetPath(u)==null);
    long[] r=ResourcePolicy.range("bytes=0-9",100);check(r[0]==0&&r[1]==9);
    r=ResourcePolicy.range("bytes=80-",100);check(r[0]==80&&r[1]==99);
    r=ResourcePolicy.range("bytes=-10",100);check(r[0]==90&&r[1]==99);
    r=ResourcePolicy.range("bytes=0-999",100);check(r[1]==99);
    check(ResourcePolicy.range(null,100)==null);
    for(String bad:new String[]{"bytes=100-", "bytes=9-1", "bytes=0-1,5-6", "bytes=-0", "garbage", "bytes=999999999999999999999-"}) {
      boolean rejected=false;try{ResourcePolicy.range(bad,100);}catch(IllegalArgumentException e){rejected=true;}check(rejected);
    }
    check(ResourcePolicy.mime("a.webm").equals("video/webm"));check(ResourcePolicy.mime("a.js").contains("javascript"));
    check(ResourcePolicy.mime("preview.m4a").equals("audio/mp4"));check(ResourcePolicy.mime("voice.wav").equals("audio/wav"));check(ResourcePolicy.mime("music.mp3").equals("audio/mpeg"));check(ResourcePolicy.mime("todo-present-warm.mp4").equals("video/mp4"));
    System.out.println("ResourcePolicy: "+count+" checks passed");
  }
}
