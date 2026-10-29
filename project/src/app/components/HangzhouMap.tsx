import {useEffect,useRef,useState} from 'react'
import {Minus,Plus,LocateFixed} from 'lucide-react'
import example from '@/assets/map/example-route.json'
import type {MarchPhase} from '../lib/march-presentation'
// Leaflet 1.9.4 is vendored, with its BSD license and upstream hash recorded.
type LocalMap={invalidateSize(options?:unknown):void;remove():void;zoomIn():void;zoomOut():void;fitBounds(bounds:unknown,options?:unknown):void}
const overview:[[number,number],[number,number]]=[[30.248,120.146],[30.280,120.178]]
export function HangzhouMap({phase,token}:{phase:MarchPhase;token:number}){
 const ref=useRef<HTMLDivElement>(null),map=useRef<LocalMap|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let disposed=false;let observer:ResizeObserver|undefined
  void (async()=>{try{
   const [L,data]=await Promise.all([
    // @ts-expect-error Local upstream JavaScript; no network import.
    import('../../vendor/leaflet/leaflet.esm.js'),
    import('@/assets/map/hangzhou.json').then(module=>module.default)])
   if(disposed)return
   const node=ref.current!,tokens=getComputedStyle(node),color=(name:string)=>`rgb(${tokens.getPropertyValue(name).trim()})`
   const m=L.map(node,{zoomControl:false,attributionControl:false,preferCanvas:true,minZoom:13,maxZoom:17,maxBounds:[[30.23,120.12],[30.30,120.21]],maxBoundsViscosity:1,zoomAnimation:!matchMedia('(prefers-reduced-motion: reduce)').matches,fadeAnimation:false,inertia:false})
   map.current=m;m.fitBounds(overview,{padding:[12,12],animate:false})
   L.geoJSON(data,{style:(f:{properties:{layer:string;class?:string}})=>{const p=f.properties;return p.layer==='water'?{color:color('--map-water-line'),weight:1,fillColor:color('--map-water'),fillOpacity:1}:p.layer==='park'?{stroke:false,fillColor:color('--map-park'),fillOpacity:1}:{color:color('--map-road'),weight:['primary','secondary'].includes(p.class??'')?4:p.class==='tertiary'?3:1.5,opacity:1}},filter:(f:{properties:{layer:string}})=>f.properties.layer!=='label',interactive:false,renderer:L.canvas({padding:.5})}).addTo(m)
   // A few verified OSM labels; no invented blocks, positions, or user-company location.
   for(const f of data.features){const p=f.properties;if((p.layer==='label'&&['武林街道','湖滨街道','天水街道','北山街道'].includes(p.name))||(p.layer==='water'&&p.name==='西湖')){
    const point=p.layer==='label'?[f.geometry.coordinates[1],f.geometry.coordinates[0]]:[30.249,120.147]
    L.marker(point,{interactive:false,icon:L.divIcon({className:'hangzhou-map-label',html:p.name.replace('街道',''),iconSize:[72,20],iconAnchor:[36,10]})}).addTo(m)
   }}
   const points=example.geometry.coordinates.map(([lng,lat])=>[lat,lng])
   L.polyline(points,{color:color('--surface'),weight:8,interactive:false,noClip:true,renderer:L.svg(),className:'hangzhou-route-halo'}).addTo(m)
   const line=L.polyline(points,{color:color('--primary'),weight:4,interactive:false,noClip:true,renderer:L.svg(),className:'hangzhou-route'}).addTo(m);line.getElement()?.setAttribute('pathLength','1')
   for(const [index,point] of [points[0],points[points.length-1]].entries())L.circleMarker(point,{radius:6,weight:3,color:color('--surface'),fillColor:color(index?'--primary':'--success'),fillOpacity:1,interactive:false,renderer:L.svg(),className:'hangzhou-route-end'}).addTo(m)
   observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(node);setError('')
  }catch(e){if(!disposed)setError('地图未载入')}})()
  return()=>{disposed=true;observer?.disconnect();map.current?.remove();map.current=null}
 },[attempt])
 return <section className="hangzhou-map-frame" aria-label="杭州离线地图，可拖动和双指缩放" data-route-phase={phase} data-route-token={token}>
  <div ref={ref} className="hangzhou-map-surface"/>
  <div className="hangzhou-map-controls"><button type="button" aria-label="放大地图" onClick={()=>map.current?.zoomIn()}><Plus size={18}/></button><button type="button" aria-label="缩小地图" onClick={()=>map.current?.zoomOut()}><Minus size={18}/></button><button type="button" aria-label="复位杭州地图" onClick={()=>map.current?.fitBounds(overview,{animate:false,padding:[12,12]})}><LocateFixed size={18}/></button></div>
  <details className="hangzhou-attribution"><summary>© OpenStreetMap</summary><div>杭州离线矢量 · ODbL<br/><a href="/maps/credits.html#osm">数据许可与来源</a><br/><a href="/maps/credits.html#leaflet">Leaflet 1.9.4 · BSD</a></div></details>
  {error&&<div className="hangzhou-map-error" role="status">{error}<button type="button" onClick={()=>setAttempt(n=>n+1)}>重试</button></div>}
 </section>
}
