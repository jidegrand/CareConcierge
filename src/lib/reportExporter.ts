import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, TabStopType, TabStopPosition, PageNumberElement,
  PageBreak,
} from 'docx'
import { supabase } from '@/lib/supabase'
import { DEFAULT_REQUEST_TYPES, buildRequestTypeMap } from '@/lib/constants'
import { PRODUCT_FILE_PREFIX, PRODUCT_NAME, SYSTEM_LAYER_NAME } from '@/lib/brand'
import { buildCSV, downloadBlob, safeFilenamePart } from '@/lib/export'
import { getSingle, type MaybeArray } from '@/lib/utils'
import type { RequestTypeConfig } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ReportRequest {
  id: string
  type: string
  status: string
  is_urgent: boolean
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  room_name: string
  resolver_name: string | null
}

export interface ReportStaffMember {
  name: string
  role: string
  resolvedCount: number
  avgHandleSec: number | null
}

export interface ReportData {
  unitName:    string
  siteName:    string
  orgName:     string
  date:        string
  rangeStart:  string
  rangeEnd:    string
  generatedAt: string
  requests:    ReportRequest[]
  staff:       ReportStaffMember[]
  requestTypeMap: Record<string, RequestTypeConfig>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function fmtDateRange(startIso: string, endIso: string): string {
  return startIso === endIso
    ? fmtDate(startIso)
    : `${fmtDate(startIso)} - ${fmtDate(endIso)}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtSec(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function responseTime(req: ReportRequest): number | null {
  if (!req.acknowledged_at) return null
  return Math.round(
    (new Date(req.acknowledged_at).getTime() - new Date(req.created_at).getTime()) / 1000
  )
}

function reportRangeToken(data: ReportData) {
  return data.rangeStart === data.rangeEnd
    ? data.rangeStart
    : `${data.rangeStart}_to_${data.rangeEnd}`
}

// ── Data fetcher ──────────────────────────────────────────────────────────────
export async function fetchReportData(
  unitId: string | undefined,
  tenantId: string,
  range?: {
    startDate: string
    endDate: string
  }
): Promise<ReportData> {
  const rangeStart = range?.startDate ?? new Date().toISOString().slice(0, 10)
  const rangeEnd = range?.endDate ?? rangeStart
  const start = new Date(`${rangeStart}T00:00:00`)
  const endExclusive = new Date(`${rangeEnd}T00:00:00`)
  endExclusive.setDate(endExclusive.getDate() + 1)

  const [requestsRes, profilesRes, requestTypesRes, tenantRes] = await Promise.all([
    supabase
      .from('requests')
      .select(`
        id, type, status, is_urgent,
        created_at, acknowledged_at, resolved_at,
        room:rooms (
          name,
          unit:units (
            name,
            site:sites (
              name,
              tenant:tenants (name)
            )
          )
        ),
        resolver:user_profiles!resolved_by (full_name)
      `)
      .gte('created_at', start.toISOString())
      .lt('created_at', endExclusive.toISOString())
      .order('created_at', { ascending: true }),

    supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('tenant_id', tenantId),

    supabase
      .from('request_types')
      .select('id, label, icon, color, urgent')
      .eq('tenant_id', tenantId)
      .eq('active', true),

    supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single(),
  ])

  // Scope to unit
  type RawRequest = {
    id: string; type: string; status: string; is_urgent: boolean
    created_at: string; acknowledged_at: string | null; resolved_at: string | null
    room?: MaybeArray<{
      id?: string
      name?: string
      unit?: MaybeArray<{
        id?: string
        name?: string
        site?: MaybeArray<{
          name?: string
          tenant?: MaybeArray<{ name?: string }>
        }>
      }>
    }>
    resolver?: MaybeArray<{ full_name?: string | null }>
  }

  const rawRequests = ((requestsRes.data ?? []) as RawRequest[])
    .filter(r => {
      const requestUnit = getSingle(getSingle(r.room)?.unit)
      return unitId ? requestUnit?.id === unitId : true
    })

  // Get unit/site/org from first request
  const first   = rawRequests[0]
  const firstRoom = getSingle(first?.room)
  const firstUnit = getSingle(firstRoom?.unit)
  const firstSite = getSingle(firstUnit?.site)
  const firstTenant = getSingle(firstSite?.tenant)
  const unitName = unitId
    ? firstUnit?.name ?? 'Assigned Unit'
    : 'All Units'
  const siteName = firstSite?.name ?? ''
  const orgName  = firstTenant?.name ?? tenantRes.data?.name ?? PRODUCT_NAME
  const customRequestTypes = ((requestTypesRes.data ?? []) as Array<{
    id: string
    label: string
    icon: string
    color: string
    urgent: boolean
  }>).map(item => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    color: item.color,
    urgent: item.urgent,
  }))
  const requestTypeMap = buildRequestTypeMap(
    customRequestTypes.length > 0 ? customRequestTypes : DEFAULT_REQUEST_TYPES
  )

  const requests: ReportRequest[] = rawRequests.map(r => ({
    id:              r.id,
    type:            r.type,
    status:          r.status,
    is_urgent:       r.is_urgent,
    created_at:      r.created_at,
    acknowledged_at: r.acknowledged_at,
    resolved_at:     r.resolved_at,
    room_name:       getSingle(r.room)?.name ?? '—',
    resolver_name:   getSingle(r.resolver)?.full_name ?? null,
  }))

  // Build staff performance from resolved_by
  type Profile = { id: string; full_name: string | null; role: string }
  const profiles = (profilesRes.data ?? []) as Profile[]

  const staffMap: Record<string, { count: number; times: number[] }> = {}
  for (const r of requests) {
    if (!r.resolver_name) continue
    if (!staffMap[r.resolver_name]) staffMap[r.resolver_name] = { count: 0, times: [] }
    staffMap[r.resolver_name].count++
    const t = responseTime(r)
    if (t !== null) staffMap[r.resolver_name].times.push(t)
  }

  const staff: ReportStaffMember[] = profiles.map(p => {
    const name = p.full_name ?? `User ${p.id.slice(0, 6)}`
    const wl   = staffMap[name]
    return {
      name,
      role: p.role.replace('_', ' '),
      resolvedCount:  wl?.count ?? 0,
      avgHandleSec:   wl && wl.times.length > 0
        ? Math.round(wl.times.reduce((a, b) => a + b, 0) / wl.times.length)
        : null,
    }
  }).sort((a, b) => b.resolvedCount - a.resolvedCount)

  return {
    unitName, siteName, orgName,
    date:        fmtDateRange(rangeStart, rangeEnd),
    rangeStart,
    rangeEnd,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    requests,
    staff,
    requestTypeMap,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1: Request Log CSV
// ─────────────────────────────────────────────────────────────────────────────
export function exportRequestLogCSV(data: ReportData) {
  const headers = [
    'Bay', 'Request Type', 'Status', 'Urgent',
    'Submitted', 'Acknowledged', 'Resolved',
    'Response Time (s)', 'Resolved By',
  ]

  const rows = data.requests.map(r => {
    const cfg = data.requestTypeMap[r.type]
    return [
      r.room_name,
      cfg?.label ?? r.type,
      r.status,
      r.is_urgent ? 'Yes' : 'No',
      fmtTime(r.created_at),
      r.acknowledged_at ? fmtTime(r.acknowledged_at) : '',
      r.resolved_at ? fmtTime(r.resolved_at) : '',
      String(responseTime(r) ?? ''),
      r.resolver_name ?? '',
    ]
  })

  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${PRODUCT_FILE_PREFIX}_RequestLog_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.csv`)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2: Staff Performance CSV
// ─────────────────────────────────────────────────────────────────────────────
export function exportStaffPerformanceCSV(data: ReportData) {
  const headers = ['Name', 'Role', 'Requests Resolved', 'Avg Handle Time (s)', 'Avg Handle Time']

  const rows = data.staff.map(s => [
    s.name,
    s.role,
    String(s.resolvedCount),
    String(s.avgHandleSec ?? ''),
    fmtSec(s.avgHandleSec),
  ])

  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${PRODUCT_FILE_PREFIX}_StaffPerformance_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.csv`)
}

export function exportUrgentRequestsCSV(data: ReportData) {
  const urgent = data.requests.filter(r => r.is_urgent)
  const headers = [
    'Bay', 'Request Type', 'Status', 'Submitted', 'Acknowledged',
    'Resolved', 'Response Time (s)', 'Resolved By',
  ]

  const rows = urgent.map(r => {
    const cfg = data.requestTypeMap[r.type]
    return [
      r.room_name,
      cfg?.label ?? r.type,
      r.status,
      fmtTime(r.created_at),
      r.acknowledged_at ? fmtTime(r.acknowledged_at) : '',
      r.resolved_at ? fmtTime(r.resolved_at) : '',
      responseTime(r) ?? '',
      r.resolver_name ?? '',
    ]
  })

  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${PRODUCT_FILE_PREFIX}_UrgentRequests_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.csv`)
}

export function exportOpenRequestsCSV(data: ReportData) {
  const open = data.requests.filter(r => r.status !== 'resolved')
  const headers = [
    'Bay', 'Request Type', 'Status', 'Urgent', 'Submitted',
    'Minutes Open', 'Acknowledged', 'Resolved By',
  ]

  const rows = open.map(r => {
    const cfg = data.requestTypeMap[r.type]
    const minutesOpen = Math.max(
      0,
      Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000)
    )

    return [
      r.room_name,
      cfg?.label ?? r.type,
      r.status,
      r.is_urgent ? 'Yes' : 'No',
      fmtTime(r.created_at),
      minutesOpen,
      r.acknowledged_at ? fmtTime(r.acknowledged_at) : '',
      r.resolver_name ?? '',
    ]
  })

  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${PRODUCT_FILE_PREFIX}_OpenRequests_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.csv`)
}

export function exportBaySummaryCSV(data: ReportData) {
  const byBay = new Map<string, {
    total: number
    urgent: number
    pending: number
    inProgress: number
    resolved: number
    responseTimes: number[]
  }>()

  data.requests.forEach(r => {
    const bucket = byBay.get(r.room_name) ?? {
      total: 0,
      urgent: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      responseTimes: [],
    }

    bucket.total++
    if (r.is_urgent) bucket.urgent++
    if (r.status === 'pending') bucket.pending++
    if (r.status === 'acknowledged') bucket.inProgress++
    if (r.status === 'resolved') bucket.resolved++

    const t = responseTime(r)
    if (t !== null) bucket.responseTimes.push(t)

    byBay.set(r.room_name, bucket)
  })

  const headers = [
    'Bay', 'Total Requests', 'Urgent Requests', 'Pending',
    'In Progress', 'Resolved', 'Avg Response Time (s)',
  ]

  const rows = Array.from(byBay.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([bay, stats]) => [
      bay,
      stats.total,
      stats.urgent,
      stats.pending,
      stats.inProgress,
      stats.resolved,
      stats.responseTimes.length
        ? Math.round(stats.responseTimes.reduce((sum, value) => sum + value, 0) / stats.responseTimes.length)
        : '',
    ])

  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${PRODUCT_FILE_PREFIX}_BaySummary_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.csv`)
}

export function exportRequestTypeSummaryCSV(data: ReportData) {
  const byType = new Map<string, {
    label: string
    urgent: number
    total: number
    resolved: number
    responseTimes: number[]
  }>()

  data.requests.forEach(r => {
    const cfg = data.requestTypeMap[r.type]
    const bucket = byType.get(r.type) ?? {
      label: cfg?.label ?? r.type,
      urgent: 0,
      total: 0,
      resolved: 0,
      responseTimes: [],
    }

    bucket.total++
    if (r.is_urgent) bucket.urgent++
    if (r.status === 'resolved') bucket.resolved++

    const t = responseTime(r)
    if (t !== null) bucket.responseTimes.push(t)

    byType.set(r.type, bucket)
  })

  const headers = [
    'Request Type', 'Total Requests', 'Urgent Requests',
    'Resolved', 'Resolution Rate (%)', 'Avg Response Time (s)',
  ]

  const rows = Array.from(byType.values())
    .sort((a, b) => b.total - a.total)
    .map(stats => [
      stats.label,
      stats.total,
      stats.urgent,
      stats.resolved,
      stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0,
      stats.responseTimes.length
        ? Math.round(stats.responseTimes.reduce((sum, value) => sum + value, 0) / stats.responseTimes.length)
        : '',
    ])

  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${PRODUCT_FILE_PREFIX}_RequestTypeSummary_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.csv`)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 3: Daily Shift Report DOCX
// ─────────────────────────────────────────────────────────────────────────────

// ── DOCX helpers ──────────────────────────────────────────────────────────────
const NAVY  = '1A3A5C'
const BLUE  = '1D6FA8'
const TEAL  = '0D7377'
const LGRAY = 'F0F4F8'
const MGRAY = 'D1D9E0'
const DGRAY = '4B5563'
const WHITE = 'FFFFFF'

const cellBorder = (color = MGRAY) => ({
  top:    { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left:   { style: BorderStyle.SINGLE, size: 1, color },
  right:  { style: BorderStyle.SINGLE, size: 1, color },
})

const sp = (before = 0, after = 0) => ({ spacing: { before, after } })

const h1 = (text: string) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, bold: true, font: 'Arial', size: 28, color: NAVY })],
  ...sp(280, 100),
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
})

const body = (text: string, opts: Record<string, unknown> = {}) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: 20, color: '111827', ...opts })],
  ...sp(40, 40),
})

const gap = (size = 120) => new Paragraph({ children: [], spacing: { before: size, after: 0 } })

const bullet = (text: string) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  children: [new TextRun({ text, font: 'Arial', size: 20, color: '111827' })],
  ...sp(30, 30),
})

// ── KV table ──────────────────────────────────────────────────────────────────
const kvTable = (rows: [string, string][], colWidths: [number, number] = [3000, 6360]) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map(([k, v], i) => new TableRow({
      children: [
        new TableCell({
          borders: cellBorder(),
          width: { size: colWidths[0], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: k, font: 'Arial', size: 19, bold: true, color: NAVY })] })],
        }),
        new TableCell({
          borders: cellBorder(),
          width: { size: colWidths[1], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: v, font: 'Arial', size: 19, color: '111827' })] })],
        }),
      ],
    })),
  })

// ── Data table ────────────────────────────────────────────────────────────────
const dataTable = (headers: string[], rows: string[][], colWidths: number[]) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: cellBorder(NAVY),
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: h, font: 'Arial', size: 18, bold: true, color: WHITE })] })],
        })),
      }),
      // Data rows
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => new TableCell({
          borders: cellBorder(),
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR },
          margins: { top: 70, bottom: 70, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Arial', size: 18, color: '111827' })] })],
        })),
      })),
    ],
  })

// ── Main DOCX generator ───────────────────────────────────────────────────────
export async function exportShiftReportDOCX(data: ReportData) {
  const resolved  = data.requests.filter(r => r.status === 'resolved')
  const pending   = data.requests.filter(r => r.status === 'pending')
  const inProg    = data.requests.filter(r => r.status === 'acknowledged')
  const urgent    = data.requests.filter(r => r.is_urgent)
  const total     = data.requests.length

  const ackTimes  = data.requests
    .filter(r => r.acknowledged_at)
    .map(r => responseTime(r)!)
    .filter(t => t !== null)

  const avgAck    = ackTimes.length
    ? Math.round(ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length)
    : null

  const resolvePct = total > 0 ? Math.round((resolved.length / total) * 100) : 0

  // Type breakdown
  const typeMap: Record<string, number> = {}
  data.requests.forEach(r => { typeMap[r.type] = (typeMap[r.type] ?? 0) + 1 })
  const typeBreakdown = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      const cfg = data.requestTypeMap[type]
      return `${cfg?.label ?? type}: ${count} (${Math.round(count / total * 100)}%)`
    })

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: NAVY },
          paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial', color: NAVY },
          paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${data.orgName}  —  Daily Shift Report`, font: 'Arial', size: 18, color: DGRAY }),
                new TextRun({ text: '\t', font: 'Arial', size: 18 }),
                new TextRun({ text: 'CONFIDENTIAL', font: 'Arial', size: 18, bold: true, color: TEAL }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 4 } },
              spacing: { before: 0, after: 120 },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `Generated by ${SYSTEM_LAYER_NAME}  ·  ${data.date}  ·  ${data.generatedAt}`, font: 'Arial', size: 17, color: DGRAY }),
                new TextRun({ text: '\tPage ', font: 'Arial', size: 17, color: DGRAY }),
                new PageNumberElement(),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 4 } },
              spacing: { before: 120, after: 0 },
            }),
          ],
        }),
      },

      children: [

        // ── Cover ────────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'Daily Shift Report', font: 'Arial', size: 56, bold: true, color: NAVY })],
          spacing: { before: 600, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `${data.unitName}  ·  ${data.siteName}`, font: 'Arial', size: 26, color: BLUE })],
          spacing: { before: 0, after: 300 },
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 } },
          children: [],
          spacing: { before: 0, after: 280 },
        }),
        kvTable([
          ['Organisation', data.orgName],
          ['Unit',         data.unitName],
          ['Site',         data.siteName],
          ['Report Date',  data.date],
          ['Generated At', data.generatedAt],
          ['Prepared by',  `${SYSTEM_LAYER_NAME} Platform`],
        ]),
        gap(600),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 1. Executive Summary ─────────────────────────────────────────────
        h1('1. Executive Summary'),
        kvTable([
          ['Total Requests',      String(total)],
          ['Resolved',            `${resolved.length} (${resolvePct}%)`],
          ['Pending',             String(pending.length)],
          ['In Progress',         String(inProg.length)],
          ['Urgent Requests',     String(urgent.length)],
          ['Avg Response Time',   fmtSec(avgAck)],
          ['Staff on Record',     String(data.staff.filter(s => s.resolvedCount > 0).length)],
        ]),
        gap(120),

        // ── 2. Request Type Breakdown ─────────────────────────────────────────
        h1('2. Request Type Breakdown'),
        body('The following request categories were recorded during this shift:'),
        gap(60),
        ...typeBreakdown.map(t => bullet(t)),
        gap(200),

        // ── 3. Full Request Log ───────────────────────────────────────────────
        h1('3. Full Request Log'),
        body(`All ${total} requests submitted during this shift. Sorted by submission time.`),
        gap(80),
        dataTable(
          ['Bay', 'Type', 'Status', 'Submitted', 'Response Time', 'Resolved By'],
          data.requests.map(r => {
            const cfg = data.requestTypeMap[r.type]
            return [
              r.room_name,
              cfg?.label ?? r.type,
              r.status.charAt(0).toUpperCase() + r.status.slice(1),
              fmtTime(r.created_at),
              fmtSec(responseTime(r)),
              r.resolver_name ?? '—',
            ]
          }),
          [1200, 1600, 1100, 1200, 1500, 2760]
        ),
        gap(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 4. Staff Performance ──────────────────────────────────────────────
        h1('4. Staff Performance'),
        body('Individual performance metrics for all staff members recorded during this shift.'),
        gap(80),
        dataTable(
          ['Name', 'Role', 'Requests Resolved', 'Avg Handle Time'],
          data.staff.map(s => [
            s.name,
            s.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
            String(s.resolvedCount),
            fmtSec(s.avgHandleSec),
          ]),
          [2800, 2200, 1980, 2380]
        ),
        gap(200),

        // ── 5. Summary Notes ─────────────────────────────────────────────────
        h1('5. Summary Notes'),
        body(`This report was automatically generated by ${PRODUCT_NAME}, powered by ${SYSTEM_LAYER_NAME}.`),
        body('Data covers requests submitted and actioned from 00:00 to the time of report generation.'),
        gap(80),
        body('Definitions:', { bold: true }),
        bullet('Response Time: time from patient submission to first acknowledgement by a nurse.'),
        bullet('Handle Time: time from patient submission to full resolution.'),
        bullet('Urgent: requests flagged as urgent by the system (clinical categories or overdue > 5 minutes).'),
        gap(160),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: MGRAY, space: 4 } },
          children: [new TextRun({ text: `${data.orgName}  ·  ${data.unitName}  ·  ${SYSTEM_LAYER_NAME} Platform`, font: 'Arial', size: 17, color: DGRAY, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 280, after: 0 },
        }),
      ],
    }],
  })

  const buffer = await Packer.toBlob(doc)
  downloadBlob(buffer, `${PRODUCT_FILE_PREFIX}_ShiftReport_${safeFilenamePart(data.unitName)}_${reportRangeToken(data)}.docx`)
}
