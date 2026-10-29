import { useEffect, useState } from 'react'
import { Check, ChevronDown, Coins, MapPin, Star, X, RotateCcw, Bookmark } from 'lucide-react'
import {ImperialRoof} from './ImperialRoof'
import { Illustration } from './Illustration'
import { FoodIllustration } from './FoodIllustration'
import { KITCHEN_DISHES, type KitchenCard, type MarchCard, type MorningCard, type SceneCard as Card } from '../lib/scenes'
import {validKitchenDelivery} from '../lib/kitchen-delivery'
import { MarchJourney } from './MarchJourney'
import {TravelIcon} from './TravelIcon'
import {TRAVEL_LABEL,type TravelMode} from '../lib/travel'

type KitchenPatch = { selectedDish?: string | null; budget?: number | null; taste?: string | null; address?: string | null; contactName?: string | null; phone?: string | null }
type MarchPatch = { destination?: string; mode?: TravelMode }
type DraftReport = (dirty: boolean, invalid: boolean) => void
const TITLES = { kitchen: '传膳', march: '摆驾', morning: '早朝', memorial: '回复草稿', music: '听曲' }
const ILLUSTRATIONS = { kitchen: 'food', morning: 'scroll', memorial: 'scroll', music: 'scroll' } as const

export function SceneCard({ card, busy, onApprove, onRevise, onHold, onRevoke, onUpdateKitchen, onUpdateMarch, onAddDraft, draftState, onDraftState, presentationToken=0, presentationReady=true,fullpage=false }: {
  card: Card; busy?: boolean; onApprove: () => void; onRevise: () => void; onHold: () => void; onRevoke: () => void
  onUpdateKitchen: (patch: KitchenPatch) => void; onUpdateMarch: (patch: MarchPatch) => void; onAddDraft: (text: string) => void
  draftState: { dirty: boolean; invalid: boolean }; onDraftState: DraftReport
  fullpage?:boolean;presentationToken?:number;presentationReady?:boolean
}) {
  if(card.kind==='coupons'||card.kind==='work'||card.kind==='todo'||card.kind==='music')return null
  const selectedDish = card.kind==='kitchen' ? KITCHEN_DISHES.find(dish=>dish.name===card.selectedDish) : undefined
  const ready = card.kind === 'kitchen' ? Boolean(validKitchenDelivery(card) && card.selectedDish) : card.kind === 'march' ? Boolean(card.destination && card.mode) : true
  return <section data-card={card.kind} data-travel-stage={card.kind==='march'?(card.stage??'route'):undefined} className={`imperial-card${fullpage?' imperial-fullpage':''}`} aria-label={TITLES[card.kind]}>
    {fullpage?<header className="fullpage-header"><div className="fullpage-title"><span aria-hidden="true"/><h2>{card.kind==='kitchen'?'御膳房':card.kind==='march'&&card.mode==='骑行'&&card.stage==='route'?'御驾亲蹬':'摆驾'}</h2><span aria-hidden="true"/></div><ImperialRoof/></header>:<>
    <div className="card-grabber" aria-hidden />
    <header className={`imperial-card-header${card.kind==='march'?' march-header':''}`}>
      {card.kind!=='march'&&<Illustration name={ILLUSTRATIONS[card.kind]} />}
      <h2 className={card.kind==='march'?'sr-only':undefined}>{TITLES[card.kind]}</h2>
      {card.kind!=='march'&&<span className="card-state">{card.kind === 'kitchen' ? '美团外卖' : '本地'}</span>}
      <button className="court-icon-button" type="button" aria-label="收起卡片" onClick={onHold}><X size={19} /></button>
    </header>
    </>}
    <div className="imperial-card-content scroll-y">
      {card.kind === 'kitchen' ? <KitchenBody card={card} onUpdate={onUpdateKitchen} report={onDraftState} />
        : card.kind === 'march' ? <MarchBody card={card} onUpdate={onUpdateMarch} report={onDraftState} token={presentationToken} frameReady={presentationReady} />
        : card.kind === 'morning' ? <MorningBody card={card} onAdd={onAddDraft} />
        : card.kind === 'memorial' ? <><p>{card.draft}</p><details className="card-details"><summary>原文<ChevronDown size={15}/></summary><p>{card.source}</p></details></>
        : <p className="card-small-note">曲目待添加</p>}
    </div>
    {!(card.kind==='march'&&card.stage==='choose')&&<footer className="imperial-card-actions">
      {card.kind==='kitchen'&&<div className="food-current-selection" aria-live="polite" aria-atomic="true">{selectedDish?<><span className="food-selected-name">{selectedDish.name}</span><strong className="food-selected-amount"><small>¥</small>{selectedDish.price}</strong></>:<span className="food-selection-prompt">请选择膳食</span>}</div>}
      <button type="button" className="imperial-primary" onClick={onApprove} disabled={!ready || draftState.dirty || draftState.invalid || busy}>{card.kind==='march'?<MapPin size={18}/>:<Check size={18}/>}<span>{busy ? '稍候' : card.kind==='march'?'打开地图':'准奏'}</span></button>
      {card.kind!=='march'&&card.kind!=='kitchen'&&<><button type="button" aria-label="重拟" onClick={onRevise}><RotateCcw size={18}/></button>
      <button type="button" aria-label="留中" onClick={onHold}><Bookmark size={18}/></button>
      <button type="button" aria-label="撤旨" onClick={onRevoke}><X size={18}/></button></>}
    </footer>}
  </section>
}

function KitchenBody({ card, onUpdate, report }: { card: KitchenCard; onUpdate: (patch: KitchenPatch) => void; report: DraftReport }) {
  useEffect(() => report(false, !validKitchenDelivery(card)), [card.address, card.contactName, card.phone, report])
  return <>
    <p className="food-reference-note">菜品与价格仅供参考，以美团店铺页面为准。</p>
    <div className="food-grid" role="group" aria-label="选择美食">
      {KITCHEN_DISHES.map((dish) => {
        const over = card.budget != null && dish.price > card.budget
        return <button type="button" key={dish.id} aria-label={`选择${dish.name}`} aria-pressed={card.selectedDish === dish.name}
          disabled={over} className="food-choice" onClick={() => onUpdate({ selectedDish: dish.name })}>
          <FoodIllustration id={dish.id} /><span className="food-name">{dish.name}</span>
          <span className="food-description"><strong>{dish.merchantName}</strong>{dish.note}</span>
          <span className="food-meta"><span className="food-rating"><Star size={12} fill="currentColor"/>{`${dish.rating.toFixed(1)} 分`}</span><span className="food-distance"><MapPin size={12}/>{`距你 ${dish.distanceKm.toFixed(1)} 公里`}</span></span>
          <span className="food-price"><Coins size={12}/>{dish.price}<span>{over ? '超预算' : '元 · 参考价'}</span></span>
          {card.selectedDish === dish.name && <span className="food-check"><Check size={13}/></span>}
        </button>
      })}
    </div>
    <details className="card-details kitchen-delivery">
      <summary><MapPin size={17}/><span><strong>{card.address || '填写地址'}</strong><small>{card.contactName} {card.phone}</small></span><ChevronDown size={15}/></summary>
      <div className="court-card-form">
        <label>地址<textarea id="kitchen-address" aria-label="地址" rows={2} value={card.address ?? ''} onChange={e=>onUpdate({address:e.target.value})} /></label>
        <div className="form-two"><label>联系人<input aria-label="联系人" value={card.contactName ?? ''} onChange={e=>onUpdate({contactName:e.target.value})} /></label>
          <label>手机号<input aria-label="手机号" type="tel" inputMode="tel" maxLength={11} value={card.phone ?? ''} onChange={e=>onUpdate({phone:e.target.value})} /></label></div>
      </div>
    </details>
  </>
}

function MarchBody({ card, onUpdate, report, token, frameReady }: { card: MarchCard; onUpdate: (patch: MarchPatch) => void; report: DraftReport;token:number;frameReady:boolean }) {
  const [destination, setDestination] = useState(card.destination ?? '')
  const dirty = destination !== (card.destination ?? '')
  useEffect(() => setDestination(card.destination ?? ''), [card.destination])
  useEffect(() => report(dirty, false), [dirty, report])
  const choosing=card.stage==='choose'
  return <div className="march-content" data-travel-stage={choosing?'choose':'route'}>
    {choosing?<div className="travel-chooser" aria-label="选择出行方式">
      <div className="travel-heading"><strong>今日如何出行？</strong><span>{card.destination?`去${card.destination}`:'目的地待定'}</span></div>
      <TravelChoices card={card} onUpdate={onUpdate}/>
      
    </div>:null}
    {!choosing&&<MarchJourney frameReady={frameReady} token={token} mode={card.mode} destination={card.destination}/>}
    {<form className="route-form" onSubmit={e=>{e.preventDefault();onUpdate({destination: destination.trim()})}}>
      <span className="route-location" aria-hidden="true"><MapPin size={22}/></span><input id="march-destination" aria-label="目的地" value={destination} onChange={e=>setDestination(e.target.value)} placeholder="想去哪里？" enterKeyHint="done" autoComplete="off"/><button type="submit" aria-label="保存目的地"><Check size={22}/></button>
    </form>}
    {!choosing&&<details className="march-transport card-details"><summary>更换出行方式<ChevronDown size={15}/></summary><TravelChoices card={card} onUpdate={onUpdate}/></details>}
  </div>
}
function TravelChoices({card,onUpdate}:{card:MarchCard;onUpdate:(patch:MarchPatch)=>void}) {
 return <div className="travel-choices" role="group" aria-label="出行方式">{card.options.map(option=><button type="button" key={option.label} aria-label={TRAVEL_LABEL[option.label]} aria-pressed={card.mode===option.label} onClick={()=>onUpdate({mode:option.label})}>
   <TravelIcon mode={option.label}/><span>{TRAVEL_LABEL[option.label]}</span><span className="travel-selected">{card.mode===option.label?'已选':'选择'}</span>
 </button>)}</div>

}
function MorningBody({card, onAdd}: {card:MorningCard;onAdd:(text:string)=>void}) {
 const [draft,setDraft]=useState('')

 return <><ul className="morning-list">{card.items.map((item,i)=><li key={`${item.title}-${i}`}><span className="schedule-dot"/><span>{item.title}</span><small>{item.time}</small></li>)}</ul>
   <form className="route-form" onSubmit={e=>{e.preventDefault();if(draft.trim()){onAdd(draft.trim());setDraft('')}}}><input value={draft} onChange={e=>setDraft(e.target.value)} aria-label="新增本地草稿" placeholder="记一件事"/><button type="submit" aria-label="保存草稿" disabled={!draft.trim()}><Check size={18}/></button></form>
 </>
}
