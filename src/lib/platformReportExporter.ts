import { PRODUCT_FILE_PREFIX } from '@/lib/brand'
import { exportCSV, fileToken } from '@/lib/export'
import type { PlatformReportsSnapshot } from '@/hooks/usePlatformReports'

export function exportPlatformSummaryCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  exportCSV(
    `${PRODUCT_FILE_PREFIX}_PlatformSummary_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    ['Metric', 'Value'],
    [
      ['Total Requests', snapshot.totalRequests],
      ['Urgent Requests', snapshot.urgentRequests],
      ['Resolved Requests', snapshot.resolvedRequests],
      ['Active Organizations', snapshot.activeOrganizations],
      ['Avg Resolution Minutes', snapshot.avgResolutionMinutes ?? ''],
    ],
  )
}

export function exportOrganizationActivityCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  exportCSV(
    `${PRODUCT_FILE_PREFIX}_OrganizationActivity_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    ['Organization', 'Requests', 'Urgent', 'Resolved'],
    snapshot.organizations.map(org => [org.name, org.requests, org.urgent, org.resolved]),
  )
}

export function exportRequestMixCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  exportCSV(
    `${PRODUCT_FILE_PREFIX}_RequestMix_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    ['Request Type', 'Count'],
    snapshot.requestTypes.map(entry => [entry.type, entry.count]),
  )
}

export function exportDailyTrendCSV(
  snapshot: PlatformReportsSnapshot,
  meta: { rangeStart: string; rangeEnd: string; scopeLabel: string },
) {
  exportCSV(
    `${PRODUCT_FILE_PREFIX}_DailyTrend_${fileToken(meta.rangeStart, meta.rangeEnd, meta.scopeLabel)}.csv`,
    ['Date', 'Requests'],
    snapshot.dailyTrend.map(entry => [entry.date, entry.requests]),
  )
}
