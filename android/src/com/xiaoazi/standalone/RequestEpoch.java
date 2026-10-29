package com.xiaoazi.standalone;
/** Cross-thread invalidation: cancelled/replaced jobs cannot publish a response. */
final class RequestEpoch {
 private long generation;
 synchronized long begin(){return ++generation;}
 synchronized boolean isCurrent(long id){return id==generation;}
 synchronized void cancel(){++generation;}
}
