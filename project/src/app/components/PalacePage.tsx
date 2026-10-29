import type {ReactNode} from 'react'
import {ChevronLeft} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import {DepartmentMenu} from './DepartmentMenu'
import {departmentPath,type Department} from '../lib/departments'
export function PalacePage({active,title,children}:{active:Department;title:string;children:ReactNode}){const nav=useNavigate();return <div className="palace-data-page"><DepartmentMenu active={active} onOpening={()=>{}} onSelect={id=>{if(id!==active)nav(departmentPath(id))}}/><header className="palace-page-heading"><button type="button" aria-label="返回对话" onClick={()=>nav('/court')}><ChevronLeft size={24}/></button><h1>{title}</h1></header><div className="palace-page-content">{children}</div></div>}
