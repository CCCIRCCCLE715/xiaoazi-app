/** User-authorized demo: ratings, distances, coupon values, scopes and dates are fixed presentation data.
 * Merchant identities and four official logo assets retain their recorded sources. No live coupon/location API. */
export const COUPON_DATA_MODE = 'demo' as const
export const COUPON_MERCHANTS = [
 {id:'luckin',brand:'瑞幸咖啡',store:'延安路店',logo:'/coupons/luckin-official.svg',rating:4.8,distanceKm:0.6,address:'杭州市上城区延安路234号',products:'咖啡 · 拿铁 · 美式',
  storeSource:'https://m.map.360.cn/m/search/detail/new=1&src=pc_shenbian&pid=2b6f4c0e0c607d66',brandSource:'https://lkcoffee.com/',
  offers:[
   {id:'luckin-coffee-5',title:'咖啡饮品券',amount:5,minimumSpend:30,scope:'美式、拿铁饮品',validFrom:'2026-10-28',validUntil:'2026-11-30'},
   {id:'luckin-treat-3',title:'午后咖啡券',amount:3,minimumSpend:0,scope:'单杯咖啡饮品',validFrom:'2026-10-28',validUntil:'2026-11-15'},
  ],
  sourceNote:'店名和地址来自360地图公开页，Logo来自品牌官网。评分、距离和全部券信息为固定演示值，未连接定位或领券服务。'},
 {id:'wallace',brand:'华莱士·全鸡汉堡',store:'明珠街店',logo:'/coupons/wallace-official.png',rating:4.6,distanceKm:0.9,address:'杭州市上城区明珠街333号',products:'炸鸡 · 鸡腿汉堡 · 全鸡',
  storeSource:'https://www.baidu.com/s?wd=杭州%20华莱士%20汉堡%20门店%20地址',brandSource:'https://www.cnhls.com/menu',
  offers:[
   {id:'wallace-burger-3',title:'汉堡套餐券',amount:3,minimumSpend:20,scope:'汉堡、炸鸡套餐',validFrom:'2026-10-28',validUntil:'2026-11-20'},
   {id:'wallace-share-8',title:'全鸡分享券',amount:8,minimumSpend:50,scope:'全鸡及多人套餐',validFrom:'2026-10-28',validUntil:'2026-11-30'},
  ],
  sourceNote:'店名和地址沿用百度地图搜索摘要，Logo来自华莱士官网。评分、距离和券信息为固定演示值，与官网历史活动无关。'},
 {id:'pork-rice',brand:'阿祥嫂隆江猪脚饭',store:'绿汀路店',logo:null,rating:4.7,distanceKm:0.8,address:null,products:'隆江猪脚饭',
  storeSource:'https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str=gD8ern5C-jUHjOxPzI9pxgI',brandSource:null,
  offers:[{id:'pork-rice-lunch-4',title:'招牌猪脚饭券',amount:4,minimumSpend:25,scope:'猪脚饭及卤味套餐',validFrom:'2026-10-28',validUntil:'2026-11-30'}],
  sourceNote:'店名沿用御膳房已有商家，左侧使用店名文字标识。评分、距离和券信息为固定演示值，不代表门店实时数据或官方可核销优惠。'},
 {id:'kfc',brand:'肯德基宅急送',store:'余杭塘路二店',logo:'/coupons/kfc-official.png',rating:4.8,distanceKm:1.2,address:null,products:'炸鸡 · 汉堡 · 鸡翅',
  storeSource:'https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str=0mXmohyRUnuWDH7ziG0GcwI',brandSource:'https://www.kfc.com.cn/',
  offers:[
   {id:'kfc-combo-6',title:'人气套餐券',amount:6,minimumSpend:40,scope:'汉堡、炸鸡套餐',validFrom:'2026-10-28',validUntil:'2026-11-20'},
   {id:'kfc-family-10',title:'双人欢聚券',amount:10,minimumSpend:60,scope:'双人餐及全家桶',validFrom:'2026-10-28',validUntil:'2026-11-30'},
  ],
  sourceNote:'店名沿用御膳房已有商家，Logo和品类来自肯德基中国官网。评分、距离和券信息为固定演示值，不代表该店当前菜单或可核销优惠。'},
 {id:'damixiansheng',brand:'大米先生新鲜现炒',store:'浙大校友店',logo:'/coupons/damixiansheng-official.png',rating:4.9,distanceKm:0.5,address:null,products:'辣椒炒肉 · 糖醋排骨 · 爆炒牛肉',
  storeSource:'https://h5.waimai.meituan.com/waimai/mindex/menu?poi_id_str=3NhpXKTH4JPLPTgF2zvg5gI',brandSource:'https://www.csc100.com/index/category/dmxsjdcp.html',
  offers:[
   {id:'damixiansheng-lunch-3',title:'现炒午餐券',amount:3,minimumSpend:20,scope:'单人米饭套餐',validFrom:'2026-10-28',validUntil:'2026-11-15'},
   {id:'damixiansheng-dinner-5',title:'下饭好菜券',amount:5,minimumSpend:30,scope:'现炒菜品及米饭',validFrom:'2026-10-28',validUntil:'2026-11-30'},
  ],
  sourceNote:'店名沿用御膳房已有商家，Logo和招牌菜来自乡村基集团官网。评分、距离和券信息为固定演示值，不代表该店当前菜单或可核销优惠。'},
] as const
