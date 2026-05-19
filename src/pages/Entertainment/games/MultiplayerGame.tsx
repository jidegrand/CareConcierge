import { useState } from 'react'
import GameLayout from '../components/GameLayout'

interface MultiplayerGameProps {
  onBack: () => void
}

const familyGames = [
  {
    id: 'trivia',
    name: 'Trivia Quiz',
    description: 'Fun question rounds for the whole family',
    emoji: '🧠',
    minPlayers: 2,
    maxPlayers: 8,
  },
  {
    id: 'scavenger',
    name: 'Scavenger Hunt',
    description: 'Find items around your space',
    emoji: '🔍',
    minPlayers: 2,
    maxPlayers: 10,
  },
  {
    id: 'storytelling',
    name: 'Story Building',
    description: 'Collaborative storytelling game',
    emoji: '📖',
    minPlayers: 2,
    maxPlayers: 6,
  },
  {
    id: 'charades',
    name: 'Charades',
    description: 'Act out words without speaking',
    emoji: '🎭',
    minPlayers: 3,
    maxPlayers: 8,
  },
  {
    id: 'rhyme',
    name: 'Rhyme Time',
    description: 'Match words that rhyme',
    emoji: '🎵',
    minPlayers: 2,
    maxPlayers: 6,
  },
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Test your memory with card matching',
    emoji: '🎴',
    minPlayers: 1,
    maxPlayers: 4,
  },
]

export default function MultiplayerGame({ onBack }: MultiplayerGameProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [gameSession, setGameSession] = useState<{
    gameId: string
    players: number
  } | null>(null)

  const handleStartGame = (gameId: string) => {
    setSelectedGame(gameId)
  }

  const handleCreateSession = (players: number) => {
    if (selectedGame) {
      setGameSession({ gameId: selectedGame, players })
    }
  }

  const handleEndSession = () => {
    setGameSession(null)
    setSelectedGame(null)
  }

  if (gameSession) {
    const game = familyGames.find((g) => g.id === gameSession.gameId)
    return (
      <GameLayout title={`Playing: ${game?.name}`} onBack={handleEndSession}>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">{game?.emoji}</div>
            <h2 className="text-3xl font-bold text-white mb-4">{game?.name}</h2>
            <p className="text-gray-300 mb-6">Players: {gameSession.players}</p>

            <div className="bg-slate-700 rounded-lg p-8 max-w-md mx-auto mb-6">
              <p className="text-gray-300 text-lg mb-4">Game in progress...</p>
              <p className="text-gray-400 text-sm">
                This game is ready to play! Have fun with your family and friends.
              </p>
            </div>

            <button
              onClick={handleEndSession}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              End Game Session
            </button>
          </div>
        </div>
      </GameLayout>
    )
  }

  if (selectedGame) {
    const game = familyGames.find((g) => g.id === selectedGame)
    return (
      <GameLayout title={`Setup: ${game?.name}`} onBack={() => setSelectedGame(null)}>
        <div className="max-w-md mx-auto">
          <div className="bg-slate-700 rounded-lg p-8 text-center mb-6">
            <div className="text-5xl mb-4">{game?.emoji}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{game?.name}</h2>
            <p className="text-gray-300 mb-4">{game?.description}</p>
            <p className="text-sm text-gray-400">
              Players: {game?.minPlayers} - {game?.maxPlayers}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-white font-semibold text-center">How many players?</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from(
                { length: (game?.maxPlayers ?? 4) - (game?.minPlayers ?? 2) + 1 },
                (_, i) => (game?.minPlayers ?? 2) + i
              ).map((players) => (
                <button
                  key={players}
                  onClick={() => handleCreateSession(players)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  {players}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSelectedGame(null)}
            className="w-full px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Back to Games
          </button>
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout title="Family Games & Activities" onBack={onBack}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familyGames.map((game) => (
          <button
            key={game.id}
            onClick={() => handleStartGame(game.id)}
            className="p-6 bg-gradient-to-br from-green-600 to-green-700 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">{game.emoji}</div>
            <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
            <p className="text-green-100 text-sm mb-3">{game.description}</p>
            <p className="text-green-200 text-xs font-semibold">
              👥 {game.minPlayers}-{game.maxPlayers} players
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 bg-slate-700 rounded-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-white font-semibold mb-3">💡 Tips for Family Games</h3>
        <ul className="text-gray-300 text-sm space-y-2">
          <li>• Take turns and encourage participation from everyone</li>
          <li>• Keep games fun and pressure-free</li>
          <li>• Adjust rules if needed to suit your group</li>
          <li>• These games are great for bonding and laughter</li>
        </ul>
      </div>
    </GameLayout>
  )
}
