package com.xiaoazi.standalone;
import java.io.*;import java.nio.file.*;import java.security.*;import java.util.*;
public final class BundledModelStoreTest {
 static void yes(boolean b){if(!b)throw new AssertionError();}
 static String sha(byte[] b)throws Exception{StringBuilder s=new StringBuilder();for(byte v:MessageDigest.getInstance("SHA-256").digest(b))s.append(String.format("%02x",v&255));return s.toString();}
 public static void main(String[] args)throws Exception{
  Path dir=Files.createTempDirectory("bundled-asr-test-");byte[] model={1,2,3,4},tokens={5,6};
  Map<String,byte[]> data=new HashMap<>();data.put("model.int8.onnx",model);data.put("tokens.txt",tokens);int[] opened={0};
  BundledModelStore.Entry[] entries={new BundledModelStore.Entry("model.int8.onnx",4,sha(model)),new BundledModelStore.Entry("tokens.txt",2,sha(tokens))};
  BundledModelStore store=new BundledModelStore(dir.toFile(),entries);
  BundledModelStore.Source source=name->{opened[0]++;return new ByteArrayInputStream(data.get(name));};
  store.prepare(source);yes(store.installed());yes(opened[0]==2);
  new BundledModelStore(dir.toFile(),entries).prepare(name->{throw new IOException("assets unnecessary on valid copy");});
  Files.write(dir.resolve("model.int8.onnx"),new byte[]{9,9,9,9});new BundledModelStore(dir.toFile(),entries).prepare(source);yes(Arrays.equals(Files.readAllBytes(dir.resolve("model.int8.onnx")),model));
  Path broken=Files.createTempDirectory("bundled-asr-bad-");try{new BundledModelStore(broken.toFile(),entries).prepare(name->new ByteArrayInputStream(new byte[]{1}));throw new AssertionError("wrong model accepted");}catch(IOException expected){}yes(!broken.resolve("model.int8.onnx").toFile().exists());
  try{new BundledModelStore.Entry("../bad",1,sha(model));throw new AssertionError("path accepted");}catch(IllegalArgumentException expected){}
  for(Path root:new Path[]{dir,broken})try(java.util.stream.Stream<Path> paths=Files.walk(root)){paths.sorted(Comparator.reverseOrder()).forEach(p->{try{Files.delete(p);}catch(IOException e){throw new RuntimeException(e);}});}
  System.out.println("BundledModelStore: checksum, cached/offline reuse, corruption repair, invalid source rejection and path boundary passed");
 }
}
