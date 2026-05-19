
interface PauseMenuProps {
  isOpen: boolean
  onResume: () => void
  onRestart: () => void
  onExit: () => void
  gameTitle?: string
}

export default function PauseMenu({
  isOpen,
  onResume,
  onRestart,
  onExit,
  gameTitle = 'Game',
}: PauseMenuProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 max-w-sm w-full mx-4">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Game Paused</h2>

        <p className="text-gray-300 text-center mb-8">{gameTitle}</p>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Resume Game
          </button>

          <button
            onClick={onRestart}
            className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
          >
            Restart Game
          </button>

          <button
            onClick={onExit}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Exit to Menu
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Press ESC to resume or click Resume button above
        </p>
      </div>
    </div>
  )
}
