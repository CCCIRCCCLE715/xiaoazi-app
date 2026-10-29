import atlas from '@/assets/ui/palace-v26/menu-icons-atlas.png'
import type {Department} from '../lib/departments'

// The objects cross the nominal grid lines. Each padded window contains one complete motif.
const sourceBounds:Record<Department,string>={
 home:'48 125 410 296',
 kitchen:'508 82 327 353',
 todo:'49 496 388 372',
 march:'479 470 377 402',
 calendar:'58 902 373 385',
 permissions:'471 902 368 367',
 memories:'95 1313 332 364',
 results:'467 1313 381 376',
}
export function DepartmentIcon({department}:{department:Department}){
 return <svg className="department-menu-icon" data-department-icon={department} viewBox={sourceBounds[department]} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><image href={atlas} width="887" height="1774"/></svg>
}
