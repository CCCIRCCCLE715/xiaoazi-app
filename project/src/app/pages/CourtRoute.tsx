import {useNavigate,useSearchParams} from 'react-router-dom'
import {CourtPage} from './CourtPage'
export function CourtRoute(){const navigate=useNavigate(),[params]=useSearchParams();return <CourtPage onNavigate={navigate} department={params.get('department')??''}/>}
