import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'

import { usePageTitle } from '@/app/layout/PageTitle'
import { Badge } from '@/shared/ui/Badge'
import { EmptyState } from '@/shared/ui/Feedback'
import { useCourt } from '../lib/useCourt'
import type { EdictStatus } from '../lib/imperial'
const STATUS: Record<EdictStatus, { text: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }> = {
  proposed: { text: '待批', tone: 'warning' },
  approved: { text: '已准奏', tone: 'primary' },
  held: { text: '留中', tone: 'neutral' },
  revoked: { text: '已撤旨', tone: 'neutral' },
  done: { text: '已照办', tone: 'success' },
  failed: { text: '未办成', tone: 'danger' },
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EdictsPage() {
  usePageTitle('圣旨簿')
  const { edicts } = useCourt()

  if (edicts.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="圣旨簿还是空的"
        description="回金銮殿下第一道旨，小A子会替陛下记在这里。"
        action={
          <Link
            to="/"
            className="inline-flex min-h-tap items-center rounded-md bg-primary px-4 text-body font-medium text-primary-foreground"
          >
            回金銮殿
          </Link>
        }
      />
    )
  }

  return (
    <div className="page space-y-2">
      {edicts.map((edict) => {
        const status = STATUS[edict.status]
        return (
          <article key={edict.id} className="rounded-md border border-border bg-surface px-4 py-3">
            <header className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-body font-medium">{edict.title}</h2>
              <Badge tone={status.tone}>{status.text}</Badge>
            </header>
            <p className="mt-1 text-caption text-muted-foreground">{formatTime(edict.createdAt)}</p>
            <p className="mt-2 text-body">{edict.userText}</p>
            {edict.result && (
              <p className="mt-2 border-t border-hairline pt-2 text-caption text-muted-foreground">
                {edict.result}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
