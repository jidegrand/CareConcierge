import { PRODUCT_NAME } from '@/lib/brand'

export default function PatientGuidePage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1D6FA8] mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">How to Use Care Concierge</h1>
          <p className="text-gray-500 mt-2 text-sm">A quick guide for patients and residents</p>
        </div>

        {/* Step 1 — Scan */}
        <Card step={1} color="blue" title="Scan the QR code at your bedside">
          <p className="text-gray-600 text-sm leading-relaxed">
            Each room has a unique QR code posted nearby. Open your phone camera and point it at the code — no app download required. Tap the link that appears to open the request page.
          </p>
          <Tip>
            If the link doesn't open automatically, tap the notification that appears after scanning.
          </Tip>
        </Card>

        {/* Step 2 — Request */}
        <Card step={2} color="blue" title="Tap what you need">
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            You'll see a list of common requests. Tap the one that matches what you need and it is sent instantly — no waiting on hold, no call button.
          </p>
          <img
            src="/screenshot/PatientHome screen.jpeg"
            alt="Patient request screen showing Water, Blanket, Pain, Medication, Bathroom, and Temperature buttons"
            className="w-full max-w-xs mx-auto rounded-2xl shadow-md border border-gray-200 block"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { icon: '💧', label: 'Water',            desc: 'Need a drink of water' },
              { icon: '🛏️', label: 'Blanket',          desc: 'Need an extra blanket' },
              { icon: '⚠️', label: 'Pain / Discomfort', desc: 'Feeling pain or discomfort' },
              { icon: '💊', label: 'Medication',        desc: 'Need medication assistance' },
              { icon: '🚶', label: 'Bathroom Help',     desc: 'Need help getting to bathroom' },
              { icon: '🌡️', label: 'Too Hot / Cold',   desc: 'Room temperature issue' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2.5">
                <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Step 3 — Urgent */}
        <Card step={3} color="red" title="For urgent help — press Call Nurse">
          <p className="text-gray-600 text-sm leading-relaxed">
            At the top of the page there is a large red <strong>Call Nurse</strong> button. Use this for urgent assistance, pain relief, or any situation that needs immediate attention. It alerts staff right away.
          </p>
          <div className="mt-3 rounded-2xl bg-red-600 p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <p className="text-white font-bold text-base">Call Nurse</p>
            <p className="text-white/80 text-xs mt-0.5">For urgent assistance or pain relief</p>
            <div className="mt-3 bg-white rounded-full py-2 px-6 inline-block">
              <span className="text-red-600 font-semibold text-sm">Press Now</span>
            </div>
          </div>
        </Card>

        {/* Step 4 — Track */}
        <Card step={4} color="blue" title="Track your request in real time">
          <p className="text-gray-600 text-sm leading-relaxed">
            After tapping a request, you'll see a live status screen. It automatically updates as staff respond — no need to refresh.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center">
              <img
                src="/screenshot/Patientrequestreceived.jpeg"
                alt="Request received status screen"
                className="w-full rounded-2xl shadow-md border border-gray-200"
              />
              <p className="text-[11px] font-semibold text-amber-600 mt-2">① Request sent</p>
              <p className="text-[10px] text-gray-400 leading-tight">Staff have been notified</p>
            </div>
            <div className="text-center">
              <img
                src="/screenshot/Patientacknowledgment.jpeg"
                alt="Request acknowledged — staff on the way"
                className="w-full rounded-2xl shadow-md border border-gray-200"
              />
              <p className="text-[11px] font-semibold text-blue-600 mt-2">② Staff on the way</p>
              <p className="text-[10px] text-gray-400 leading-tight">Someone has acknowledged your request</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { status: 'Request sent',       color: 'bg-amber-500',  desc: 'Your request has been received by staff.' },
              { status: 'Staff on the way',   color: 'bg-blue-500',   desc: 'A team member has acknowledged your request.' },
              { status: 'Request resolved',   color: 'bg-green-500',  desc: 'Your request has been completed.' },
            ].map(item => (
              <div key={item.status} className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 px-3 py-2.5">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${item.color}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{item.status}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Step 5 — Cancel */}
        <Card step={5} color="gray" title="Changed your mind? Cancel the request">
          <p className="text-gray-600 text-sm leading-relaxed">
            If you no longer need assistance, tap <strong>Cancel request</strong> on the status screen. This removes the request so staff can focus on others who need help.
          </p>
          <Tip>
            You can only cancel a request before a staff member has resolved it.
          </Tip>
        </Card>

        {/* Language note */}
        <Card step={6} color="gray" title="Change the language">
          <p className="text-gray-600 text-sm leading-relaxed">
            Tap the <strong>Language</strong> selector at the top right of the page to switch the request labels to your preferred language. Your choice is remembered for next time.
          </p>
        </Card>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">
            {PRODUCT_NAME} · Powered by Care Concierge
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Need help? Ask a staff member at the nurse station.
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue: { badge: 'bg-[#1D6FA8] text-white', border: 'border-[#DBEAFE]' },
  red:  { badge: 'bg-red-600 text-white',   border: 'border-red-100' },
  gray: { badge: 'bg-gray-700 text-white',  border: 'border-gray-200' },
}

function Card({
  step,
  color,
  title,
  children,
}: {
  step: number
  color: keyof typeof COLOR_MAP
  title: string
  children: React.ReactNode
}) {
  const c = COLOR_MAP[color]
  return (
    <div className={`bg-white rounded-2xl border ${c.border} shadow-sm overflow-hidden`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.badge}`}>
          {step}
        </span>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
      <span className="text-blue-500 text-sm flex-shrink-0 mt-0.5">💡</span>
      <p className="text-xs text-blue-700 leading-relaxed">{children}</p>
    </div>
  )
}
