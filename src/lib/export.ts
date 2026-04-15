// ── Shared CSV / file-export utilities ────────────────────────────────────────
// Single source of truth used by reportExporter.ts and platformReportExporter.ts

export function buildCSV(headers: string[], rows: Array<Array<string | number>>): string {
  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFilenamePart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function fileToken(rangeStart: string, rangeEnd: string, scopeLabel: string): string {
  const scope = safeFilenamePart(scopeLabel) || 'report'
  const range = rangeStart === rangeEnd ? rangeStart : `${rangeStart}_to_${rangeEnd}`
  return `${scope}_${range}`
}

export function exportCSV(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const csv = buildCSV(headers, rows)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}
