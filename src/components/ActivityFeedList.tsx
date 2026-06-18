import { useEffect, useRef, useState } from 'react'
import { type ActivityFeedItem, formatActivityClock, groupActivityByDate } from '@/lib/activityFeed'

export interface ActivityFeedTheme {
  surface: string
  border: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
}

// Defaults to the "clinical" theme tokens used by the staff dashboard and
// family portal. The patient bedside page opts out of that theme entirely
// (see index.css — .patient-shell ignores html.dark) and passes its own
// --patient-* tokens instead, so this can't hardcode one token set.
const DEFAULT_THEME: ActivityFeedTheme = {
  surface: 'var(--surface)',
  border: 'var(--border)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  accent: 'var(--clinical-blue)',
}

interface ActivityFeedListProps {
  items: ActivityFeedItem[]
  emptyMessage?: string
  theme?: ActivityFeedTheme
}

export default function ActivityFeedList({ items, emptyMessage = 'No activity yet.', theme = DEFAULT_THEME }: ActivityFeedListProps) {
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())
  const collapseInitializedRef = useRef(false)

  // Collapse everything except "Today" by default, once the feed first loads.
  useEffect(() => {
    if (collapseInitializedRef.current || items.length === 0) return
    collapseInitializedRef.current = true
    const groups = groupActivityByDate(items)
    setCollapsedDates(new Set(groups.filter(g => g.label !== 'Today').map(g => g.label)))
  }, [items])

  const toggleDateGroup = (label: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border" style={{ background: theme.surface, borderColor: theme.border }}>
        <p className="px-4 py-6 text-center text-sm" style={{ color: theme.textMuted }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {groupActivityByDate(items).map(group => {
        const collapsed = collapsedDates.has(group.label)
        return (
          <div key={group.label} className="rounded-2xl border overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
            <button
              type="button"
              onClick={() => toggleDateGroup(group.label)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.textSecondary }}>
                {group.label}
                <span className="ml-1.5 font-normal" style={{ color: theme.textMuted }}>({group.items.length})</span>
              </span>
              <ChevronIcon collapsed={collapsed} color={theme.textMuted} />
            </button>
            {!collapsed && (
              <div className="border-t" style={{ borderColor: theme.border }}>
                {group.items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-t first:border-t-0" style={{ borderColor: theme.border }}>
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        item.statusColor === 'green' ? 'bg-emerald-500'
                          : item.statusColor === 'amber' ? 'bg-amber-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug" style={{ color: theme.textPrimary }}>
                        {item.text}
                        {item.detail && <span style={{ color: theme.textMuted }}> — {item.detail}</span>}
                      </p>
                      {item.attachmentUrl && (
                        item.attachmentType?.startsWith('image/') ? (
                          <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
                            <img src={item.attachmentUrl} alt={item.attachmentName ?? 'Attachment'}
                              className="max-h-40 rounded-lg border object-cover" style={{ borderColor: theme.border }} />
                          </a>
                        ) : (
                          <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold hover:underline" style={{ color: theme.accent }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                            {item.attachmentName ?? 'Attachment'}
                          </a>
                        )
                      )}
                      <p className="text-[11px] mt-0.5" style={{ color: theme.textMuted }}>
                        {item.staffAttribution && `— ${item.staffAttribution}, `}
                        {formatActivityClock(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChevronIcon({ collapsed, color }: { collapsed: boolean; color: string }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`flex-shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
