interface Props {
  title: string
  description: string
  // Standalone full-screen pages (e.g. QRSheetPage) use a dark theme outside NurseShell
  dark?: boolean
}

// "Upgrade to unlock" placeholder for routes gated behind a license entitlement
// (LICENSING_ACTION_PLAN #6).
export default function FeatureLocked({ title, description, dark = false }: Props) {
  return (
    <div className={dark
      ? 'min-h-screen bg-[#0f1117] flex items-center justify-center px-6'
      : 'flex items-center justify-center h-full px-6'
    }>
      <div className="text-center max-w-sm">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
          dark ? 'bg-blue-900/40' : 'bg-[var(--clinical-blue-lt)]'
        }`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p className={`font-semibold mb-1 ${dark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{title}</p>
        <p className={`text-sm mb-4 ${dark ? 'text-gray-500' : 'text-[var(--text-muted)]'}`}>{description}</p>
        <span className="inline-block px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium">
          Upgrade to unlock
        </span>
      </div>
    </div>
  )
}
