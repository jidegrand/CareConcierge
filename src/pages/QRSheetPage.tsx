import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import type { Room, Unit, Site } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface RoomWithQR extends Room {
  qrDataUrl: string
}

interface SheetConfig {
  unitId: string
  appUrl: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 220,
    margin: 2,
    color: { dark: '#1A3A5C', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QRSheetPage() {
  const [units, setUnits] = useState<(Unit & { site: Site })[]>([])
  const [config, setConfig] = useState<SheetConfig>({
    unitId: '',
    appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
  })
  const [rooms, setRooms] = useState<RoomWithQR[]>([])
  const [loading, setLoading] = useState(false)
  const [unitMeta, setUnitMeta] = useState<(Unit & { site: Site & { tenant: { name: string } } }) | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Load units for selector
  useEffect(() => {
    supabase
      .from('units')
      .select('*, site:sites(*, tenant:tenants(name))')
      .then(({ data }) => {
        if (data) setUnits(data as (Unit & { site: Site })[])
      })
  }, [])

  const generate = async () => {
    if (!config.unitId) return
    setLoading(true)
    setRooms([])

    // Fetch rooms + unit metadata
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*, unit:units(*, site:sites(*, tenant:tenants(*)))')
      .eq('unit_id', config.unitId)
      .eq('active', true)
      .order('name', { ascending: true })

    if (!roomData || roomData.length === 0) {
      setLoading(false)
      return
    }

    const firstRoom = roomData[0] as Room & {
      unit: Unit & { site: Site & { tenant: { name: string } } }
    }
    setUnitMeta(firstRoom.unit)

    // Generate QR codes in parallel
    const withQR = await Promise.all(
      roomData.map(async (room) => {
        const url = `${config.appUrl.replace(/\/$/, '')}/r/${room.id}`
        const qrDataUrl = await generateQRDataUrl(url)
        return { ...room, qrDataUrl } as RoomWithQR
      })
    )

    setRooms(withQR)
    setLoading(false)
  }

  const handlePrint = () => window.print()

  return (
    <>
      {/* Print styles injected into head */}
      <style>{`
        @media print {
          body > *:not(#qr-print-root) { display: none !important; }
          #qr-print-root .no-print { display: none !important; }
          #qr-print-root .print-sheet {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 8mm;
            padding: 0;
          }
          .qr-tile {
            border: 1px solid #ccc !important;
            page-break-inside: avoid;
            background: #fff !important;
          }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>

      <div id="qr-print-root" className="min-h-screen bg-[#0f1117]">

        {/* ── Config panel ── */}
        <div className="no-print max-w-2xl mx-auto px-6 pt-8 pb-6">
          <div className="mb-6">
            <p className="font-mono text-xs tracking-widest text-[#0D7377] uppercase mb-1">
              Admin
            </p>
            <h1 className="text-xl font-semibold text-white">QR Sheet Generator</h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate a printable sheet of QR codes — one per bay or room.
            </p>
          </div>

          <div className="bg-[#181b25] border border-[#2a2d3a] rounded-2xl p-5 space-y-4">
            {/* Unit selector */}
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-widest text-gray-600 mb-1.5">
                Unit / Ward
              </label>
              <select
                value={config.unitId}
                onChange={e => setConfig(c => ({ ...c, unitId: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3 py-2.5 text-sm text-white font-sans"
              >
                <option value="">— Select a unit —</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.site?.name}
                  </option>
                ))}
              </select>
            </div>

            {/* App URL */}
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-widest text-gray-600 mb-1.5">
                App base URL
              </label>
              <input
                type="url"
                value={config.appUrl}
                onChange={e => setConfig(c => ({ ...c, appUrl: e.target.value }))}
                placeholder="https://app.bayrequest.ca"
                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-xl px-3 py-2.5 text-sm text-white font-sans placeholder:text-gray-700"
              />
              <p className="text-xs text-gray-700 mt-1">
                QR codes will encode: {config.appUrl.replace(/\/$/, '')}/r/&lt;room-uuid&gt;
              </p>
            </div>

            <button
              onClick={generate}
              disabled={!config.unitId || loading}
              className="w-full py-2.5 rounded-xl bg-[#1A3A5C] text-white text-sm font-medium hover:bg-[#122d4a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating…' : 'Generate QR Sheet'}
            </button>
          </div>
        </div>

        {/* ── Sheet preview ── */}
        {rooms.length > 0 && unitMeta && (
          <div className="max-w-4xl mx-auto px-6 pb-16">
            {/* Toolbar */}
            <div className="no-print flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-gray-600">
                  Preview · {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-white mt-0.5">
                  {unitMeta.name} · {unitMeta.site.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D7377] text-white text-sm font-medium hover:bg-[#0a5f63] transition-colors"
                >
                  🖨 Print / Save PDF
                </button>
              </div>
            </div>

            {/* Print hint */}
            <div className="no-print text-xs text-gray-700 font-mono mb-4 px-1">
              TIP: Use browser Print → "Save as PDF" to export. Set margins to Minimum for best fit.
              Laminate each tile before mounting at bedside.
            </div>

            {/* The sheet — this is what gets printed */}
            <div
              ref={printRef}
              className="print-sheet grid grid-cols-3 gap-3 bg-white rounded-2xl p-6 border border-[#2a2d3a]"
            >
              {rooms.map((room) => (
                <QRTile
                  key={room.id}
                  room={room}
                  unitName={unitMeta.name}
                  siteName={unitMeta.site.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && rooms.length === 0 && (
          <div className="no-print text-center py-12 text-gray-700 text-sm">
            Select a unit and click Generate to preview your QR sheet.
          </div>
        )}
      </div>
    </>
  )
}

// ── QR Tile ───────────────────────────────────────────────────────────────────
function QRTile({
  room,
  unitName,
  siteName,
}: {
  room: RoomWithQR
  unitName: string
  siteName: string
}) {
  return (
    <div
      className="qr-tile flex flex-col items-center justify-between p-4 rounded-xl border border-gray-200 bg-white"
      style={{ minHeight: '220px' }}
    >
      {/* QR Code */}
      <img
        src={room.qrDataUrl}
        alt={`QR code for ${room.name}`}
        className="w-[110px] h-[110px]"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Room name */}
      <div className="text-center mt-2">
        <p className="text-[15px] font-semibold text-[#1A3A5C]">
          {room.label ?? room.name}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {unitName} · {siteName}
        </p>
        <p className="text-[10px] text-[#0D7377] mt-1 font-mono tracking-wide">
          scan to request care
        </p>
      </div>
    </div>
  )
}
