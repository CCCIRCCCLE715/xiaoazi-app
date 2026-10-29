package com.xiaoazi.standalone;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
/** The API key never crosses the WebView bridge. No plaintext fallback. */
final class KeyVault {
 private final SharedPreferences prefs; private static final String ALIAS="xiaoazi.api.key.v1";
 KeyVault(Context context){prefs=context.getSharedPreferences("model-private",Context.MODE_PRIVATE);}
 private SecretKey secret()throws Exception{
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(!ks.containsAlias(ALIAS)){
   KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
   gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());gen.generateKey();
  }
  return (SecretKey)ks.getKey(ALIAS,null);
 }
 boolean saved(){return prefs.contains("ciphertext");}
 void save(String key)throws Exception{
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,secret());
  byte[] encrypted=cipher.doFinal(key.getBytes("UTF-8"));
  if(!prefs.edit().putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).putString("ciphertext",Base64.encodeToString(encrypted,Base64.NO_WRAP)).commit())throw new Exception("storage");
 }
 String read()throws Exception{
  if(!saved())return "";
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,secret(),new GCMParameterSpec(128,Base64.decode(prefs.getString("iv",""),Base64.NO_WRAP)));
  return new String(cipher.doFinal(Base64.decode(prefs.getString("ciphertext",""),Base64.NO_WRAP)),"UTF-8");
 }
 boolean clear(){return prefs.edit().remove("iv").remove("ciphertext").putBoolean("enabled",false).commit();}
 SharedPreferences settings(){return prefs;}
}
