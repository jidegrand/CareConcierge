import { useNavigate } from 'react-router-dom'

interface GameLauncherProps {
  onSelectGame: (game: 'puzzle' | 'meditation' | 'coloring' | 'multiplayer') => void
}

const games = [
  {
    id: 'puzzle',
    title: 'Puzzles',
    description: 'Sudoku, crosswords, and brain teasers',
    icon: '🧩',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'meditation',
    title: 'Meditation',
    description: 'Breathing exercises and relaxation',
    icon: '🧘',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'coloring',
    title: 'Creative Art',
    description: 'Digital coloring and drawing',
    icon: '🎨',
    color: 'from-pink-500 to-pink-600',
  },
  {
    id: 'multiplayer',
    title: 'Family Games',
    description: 'Play with visitors and loved ones',
    icon: '👥',
    color: 'from-green-500 to-green-600',
  },
]

export default function GameLauncher({ onSelectGame }: GameLauncherProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Entertainment & Relaxation</h1>
        <p className="text-gray-300">Games, puzzles, and activities to help you relax and stay engaged</p>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full mb-12">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id as any)}
            className={`p-6 rounded-2xl bg-gradient-to-br ${game.color} hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-left group`}
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {game.icon}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{game.title}</h2>
            <p className="text-white text-opacity-90">{game.description}</p>
            <div className="mt-4 text-white text-opacity-75 text-sm">
              Tap to play →
            </div>
          </button>
        ))}
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
      >
        ← Back
      </button>

      {/* Tips */}
      <div className="mt-12 max-w-2xl text-center text-gray-400 text-sm">
        <p>💡 Tip: Take breaks every 15 minutes. Games are designed for relaxation and engagement.</p>
      </div>
    </div>
  )
}
