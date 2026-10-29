import {useNavigate} from 'react-router-dom'
import {CharacterStage} from '../components/CharacterStage'
import {CharacterShadow} from '../components/CharacterShadow'
import {DepartmentMenu} from '../components/DepartmentMenu'
import {departmentPath} from '../lib/departments'
export function EntryPage(){const nav=useNavigate();return <section className="palace-entry"><DepartmentMenu active="home" onOpening={()=>{}} onSelect={id=>{if(id!=='home')nav(departmentPath(id))}}/><h1>皇上模拟器</h1><div className="palace-entry-character character-shell"><CharacterShadow/><CharacterStage action="idle" hideVoiceRetry/></div><button className="palace-enthrone" type="button" onClick={()=>nav('/court')}>登基</button></section>}
