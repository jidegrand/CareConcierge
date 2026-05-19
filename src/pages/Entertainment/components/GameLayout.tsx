import React from 'react'

interface GameLayoutProps {
  title: string
  onBack: () => void
  children: React.ReactNode
  showStats?: boolean
}

export default function GameLayout({ title, onBack, children, showStats = false }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </div>

      {/* Footer with Tips */}
      {showStats && (
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800 bg-opacity-50">
          <p className="text-sm text-gray-400 text-center">
            💡 Tip: Games are designed for relaxation and engagement. Take breaks as needed.
          </p>
        </div>
      )}
    </div>
  )
}
