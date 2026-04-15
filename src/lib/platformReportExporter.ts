import { PRODUCT_FILE_PREFIX } from '@/lib/brand'
import type { PlatformReportsSnapshot } from '@/hooks/usePlatformReports'

function buildCSV(headers: string[], rows: Array<Array<string | number>>) {
  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function safeFilenamePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function fileToken(rangeStart: string, rangeEnd: string, scopeLabel: string) {
  const scope = safeFilenamePart(scopeLabel) || 'platform'
  const range = rangeStart === rangeEnd ? rangeStart : `${rangeStart}_to_${rangeEnd}`
  return `${scope}_${range}`
}

function exportCSV(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = buildCSV(headers, rows)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

export function exportPlatformSummaryCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  const headers = ['Metric', 'Value']
  const rows = [
    ['Total Requests', snapshot.totalRequests],
    ['Urgent Requests', snapshot.urgentRequests],
    ['Resolved Requests', snapshot.resolvedRequests],
    ['Active Organizations', snapshot.activeOrganizations],
    ['Avg Resolution Minutes', snapshot.avgResolutionMinutes ?? ''],
  ]

  exportCSV(
    `${PRODUCT_FILE_PREFIX}_PlatformSummary_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    headers,
    rows,
  )
}

export function exportOrganizationActivityCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  const headers = ['Organization', 'Requests', 'Urgent', 'Resolved']
  const rows = snapshot.organizations.map((organization) => [
    organization.name,
    organization.requests,
    organization.urgent,
    organization.resolved,
  ])

  exportCSV(
    `${PRODUCT_FILE_PREFIX}_OrganizationActivity_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    headers,
    rows,
  )
}

export function exportRequestMixCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  const headers = ['Request Type', 'Count']
  const rows = snapshot.requestTypes.map((entry) => [entry.type, entry.count])

  exportCSV(
    `${PRODUCT_FILE_PREFIX}_RequestMix_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    headers,
    rows,
  )
}

export function exportDailyTrendCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  const headers = ['Date', 'Requests']
  const rows = snapshot.dailyTrend.map((entry) => [entry.date, entry.requests])

  exportCSV(
    `${PRODUCT_FILE_PREFIX}_DailyTrend_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    headers,
    rows,
  )
}
