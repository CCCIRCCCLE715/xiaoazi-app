package com.xiaoazi.standalone;
final class AsrErrors{
 static String classify(int code){switch(code){case 1:return "timeout";case 2:return "asr-network";case 3:return "asr-audio";case 4:return "asr-server";case 5:return "asr-client";case 6:case 7:return "no-speech";case 8:return "asr-busy";case 9:return "permission";case 10:return "asr-rate-limit";case 11:return "asr-disconnected";case 12:case 13:return "language";default:return "start-failed";}}
 static boolean fallback(int code){return code==1||code==2||code==3||code==4||code==5||code==8||code==10||code==11||code==12||code==13;}
}
