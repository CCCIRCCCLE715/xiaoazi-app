import {useEffect,useRef,useState} from 'react'
import {MapPin,Star,ChevronDown,ArrowLeft} from 'lucide-react'
import {ImperialRoof} from './ImperialRoof'
import {COUPON_DATA_MODE,COUPON_MERCHANTS} from '../lib/coupon-merchants'
import {openAlipay,alipayFailure} from '../lib/native-assistant'

export function CouponsCard({onClose}:{onClose:()=>void}) {
 const [opening,setOpening]=useState(false),[requested,setRequested]=useState(false),[notice,setNotice]=useState('')
 const launch=useRef(false),mounted=useRef(true)
 useEffect(()=>{
  mounted.current=true
  const resume=()=>{if(!document.hidden){launch.current=false;setOpening(false);setRequested(false)}}
  document.addEventListener('visibilitychange',resume)
  window.addEventListener('focus',resume)
  return()=>{mounted.current=false;document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume)}
 },[])
 async function useOffer(){
  if(launch.current)return
  launch.current=true;setOpening(true);setNotice('')
  try{await openAlipay();if(mounted.current){setOpening(false);setRequested(true);setNotice('已请求打开支付宝。请在支付宝里搜索商家，核对门店和优惠。')}}
  catch(error){launch.current=false;if(mounted.current){setOpening(false);setNotice(alipayFailure(error))}}
 }
 return <section className="imperial-card imperial-fullpage coupons-page" data-card="coupons" data-mode={COUPON_DATA_MODE} aria-label="省钱锦囊">
  <header className="fullpage-header"><div className="fullpage-title"><button type="button" aria-label="返回小A子" onClick={onClose}><ArrowLeft size={22}/></button><h2>省钱锦囊</h2><span aria-hidden="true"/></div><ImperialRoof/></header>
  <div className="imperial-card-content scroll-y">
   <div className="coupons-intro"><span className="coupons-city"><MapPin size={14}/>杭州门店</span><strong>银子省着花，好饭照样吃。</strong><p>具体优惠以平台实际展示为准。评分与距离仅作展示。</p></div>
   <div className="coupon-merchants" aria-label="商家与优惠">
    {COUPON_MERCHANTS.map(merchant=><article className="coupon-merchant" key={merchant.id} aria-label={`${merchant.brand}（${merchant.store}）`}>
     <div className="coupon-shop-header"><div className={`coupon-logo coupon-logo-${merchant.id}`}>{merchant.logo?<img src={merchant.logo} alt={`${merchant.brand}官方Logo`}/>:<span className="coupon-store-mark">阿祥嫂<small>隆江猪脚饭</small></span>}</div><div><h3>{merchant.brand}</h3><p>{merchant.store}</p></div></div>
     <div className="coupon-shop-meta"><span><Star size={13}/>{merchant.rating.toFixed(1)} 分</span><span><MapPin size={13}/>展示距离 {merchant.distanceKm.toFixed(1)} 公里</span></div>
     <p className="coupon-products">主营 <strong>{merchant.products}</strong></p>
     {merchant.address&&<p className="coupon-address">{merchant.address}</p>}
     <div className="coupon-offers">{merchant.offers.map(offer=><div className="coupon-offer" key={offer.id}>
      <div className="coupon-ticket"><div className="coupon-amount"><span>¥</span><strong>{offer.amount}</strong></div><span>{offer.minimumSpend?`满${offer.minimumSpend}可用`:'无门槛'}</span></div><div className="coupon-offer-info"><h4>{offer.title}</h4><p>{offer.minimumSpend?`满${offer.minimumSpend}减${offer.amount}`:`${offer.amount}元无门槛`} · {offer.scope}</p><small>有效期至 {offer.validUntil.replace(/-/g,'.')}</small></div>
      <button type="button" className="coupon-use" disabled={opening||requested} aria-label={`${merchant.brand}${offer.title}去使用，打开支付宝`} onClick={()=>void useOffer()}>{opening?'打开中':requested?'已请求':'去使用'}</button>
     </div>)}</div>
     <details className="coupon-source"><summary>商家资料与展示说明<ChevronDown size={14}/></summary><p>{merchant.sourceNote}</p><div><a href={merchant.storeSource} target="_blank" rel="noreferrer">门店资料</a>{merchant.brandSource&&<a href={merchant.brandSource} target="_blank" rel="noreferrer">品牌官网</a>}</div></details>
    </article>)}
   </div>
   <p className="coupon-boundary">“去使用”仅打开支付宝，需自行查找商家与优惠；不会自动领券、抵扣或下单。</p>
  </div>
  <div className="coupon-notice" role="status" aria-live="polite">{notice}</div>
 </section>
}
