import {ResultsPage} from './pages/ResultsPage'
import {PermissionsPage} from './pages/PermissionsPage'
import {MemoriesPage} from './pages/MemoriesPage'
import {CalendarPage} from './pages/CalendarPage'
import {EntryPage} from './pages/EntryPage'
import '@/shared/styles/palace-menu.css'
import '@/shared/styles/ui-system.css'
import { Navigate, Route, Routes } from 'react-router-dom'

import { GlobalAudio } from './components/GlobalAudio'
import { AppShell } from './layout/AppShell'
import { CourtRoute } from './pages/CourtRoute'
import { EdictsPage } from './pages/EdictsPage'
import { MorningPage } from './pages/MorningPage'

/**
 * App UI 路由表：
 *  /         金銮殿（对话、下旨、呈奏）
 *  /morning  早朝（日程与闹钟）
 *  /edicts   圣旨簿（历史旨意）
 */
export function App() {
  return (
    <GlobalAudio><Routes>
      <Route element={<AppShell />}>
        <Route index element={<EntryPage />} />
        <Route path="court" element={<CourtRoute />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="memories" element={<MemoriesPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="morning" element={<MorningPage />} />
        <Route path="edicts" element={<EdictsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes></GlobalAudio>
  )
}
