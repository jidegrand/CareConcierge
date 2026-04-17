import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useSites } from '@/hooks/useAdminData'
import type { Room } from '@/types'

interface RoomWithQR extends Room { qrDataUrl: string }

interface Props { tenantId: string }

export default function QRPanel({ tenantId }: Props) {
  const { sites, loading } = useSites(tenantId)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [appUrl,       setAppUrl]       = useState(import.meta.env.VITE_APP_URL ?? window.location.origin)
  const [generating,   setGenerating]   = useState(false)
  const [rooms,        setRooms]        = useState<RoomWithQR[]>([])
  const [unitMeta,     setUnitMeta]     = useState<{ unitName: string; siteName: string } | null>(null)

  // Flat unit options
  const unitOptions = sites.flatMap(s =>
    (s.units ?? []).map(u => ({ id: u.id, label: `${s.name} — ${u.name}`, siteName: s.name, unitName: u.name, rooms: u.rooms ?? [] }))
  )

  // Auto-select first unit
  useEffect(() => {
    if (unitOptions.length > 0 && !selectedUnit) {
      setSelectedUnit(unitOptions[0].id)
    }
  }, [unitOptions.length])

  const generate = async () => {
    const opt = unitOptions.find(u => u.id === selectedUnit)
    if (!opt) return
    setGenerating(true)

    const base = appUrl.replace(/\/$/, '')
    const withQR = await Promise.all(
      opt.rooms.filter(r => r.active).map(async r => {
        const url = `${base}/r/${r.id}`
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 220, margin: 2,
          color: { dark: '#1A3A5C', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
        return { ...r, qrDataUrl }
      })
    )

    setRooms(withQR)
    setUnitMeta({ unitName: opt.unitName, siteName: opt.siteName })
    setGenerating(false)
  }

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-sheet {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8mm;
            background: white;
            padding: 0;
          }
          .qr-tile { page-break-inside: avoid; border: 1px solid #ccc !important; }
          @page { margin: 12mm; size: A4; }
          body > *:not(#qr-print-root) { display: none !important; }
        }
      `}</style>

      {/* Config */}
      <div className="no-print mb-5">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">QR Code Generator</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Generate printable QR sheets — one code per bay
          </p>
        </div>

        <div className="mt-4 bg-white rounded-2xl border border-[var(--border)] p-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Unit</label>
              {loading ? (
                <div className="border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-muted)]">Loading…</div>
              ) : (
                <select value={selectedUnit} onChange={e => { setSelectedUnit(e.target.value); setRooms([]) }}
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
                  {unitOptions.length === 0
                    ? <option>No units — add rooms first</option>
                    : unitOptions.map(u => <option key={u.id} value={u.id}>{u.label}</option>)
                  }
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">App URL</label>
              <input value={appUrl} onChange={e => { setAppUrl(e.target.value); setRooms([]) }}
                placeholder="https://bayrequest.vercel.app"
                className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] transition-all" />
            </div>
          </div>

          {/* Room count preview */}
          {selectedUnit && (
            <div className="mb-4 px-3 py-2.5 bg-[var(--clinical-blue-lt)] rounded-xl flex items-center justify-between">
              <p className="text-xs text-[var(--clinical-blue)]">
                {(unitOptions.find(u => u.id === selectedUnit)?.rooms ?? []).filter(r => r.active).length} active room{
                  (unitOptions.find(u => u.id === selectedUnit)?.rooms ?? []).filter(r => r.active).length !== 1 ? 's' : ''
                } will be generated
              </p>
              <p className="text-[10px] text-[var(--clinical-blue)]/70 font-mono">
                URL: {appUrl.replace(/\/$/, '')}/r/&lt;room-uuid&gt;
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={generate} disabled={!selectedUnit || generating || unitOptions.length === 0}
              className="px-4 py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] disabled:opacity-40 transition-colors">
              {generating ? 'Generating…' : 'Generate Sheet'}
            </button>
            {rooms.length > 0 && (
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
                <PrintIcon /> Print / Save PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sheet preview */}
      {rooms.length > 0 && unitMeta && (
        <div id="qr-print-root">
          {/* Preview label */}
          <div className="no-print flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Preview · {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {unitMeta.unitName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Print → Save as PDF → Laminate → Mount at bedside
            </p>
          </div>

          {/* The printable grid */}
          <div className="print-sheet grid grid-cols-3 gap-3 bg-white rounded-2xl border border-[var(--border)] p-5">
            {rooms.map(r => (
              <QRTile key={r.id} room={r} unitName={unitMeta.unitName} siteName={unitMeta.siteName} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && unitOptions.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium text-[var(--text-secondary)]">No rooms configured</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Add sites, units, and rooms in the Sites tab first
          </p>
        </div>
      )}
    </div>
  )
}

// ── QR tile (print target) ────────────────────────────────────────────────────
function QRTile({ room, unitName, siteName }: { room: RoomWithQR; unitName: string; siteName: string }) {
  return (
    <div className="qr-tile flex flex-col items-center justify-between p-4 rounded-xl border border-gray-200 bg-white"
      style={{ minHeight: '210px' }}>
      <img src={room.qrDataUrl} alt={`QR for ${room.name}`}
        className="w-[110px] h-[110px]" style={{ imageRendering: 'pixelated' }} />
      <div className="text-center mt-2">
        <p className="text-[15px] font-bold" style={{ color: '#1A3A5C' }}>{room.label ?? room.name}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{unitName} · {siteName}</p>
        <p className="text-[10px] text-[#0D7377] mt-1 font-mono tracking-wide">scan to request care</p>
      </div>
    </div>
  )
}

const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
)
