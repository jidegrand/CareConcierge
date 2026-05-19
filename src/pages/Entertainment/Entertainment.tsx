import { useState } from 'react'
import GameLauncher from './GameLauncher'
import PuzzleGame from './games/PuzzleGame'
import MeditationGame from './games/MeditationGame'
import ColoringGame from './games/ColoringGame'
import MultiplayerGame from './games/MultiplayerGame'

type GameType = 'menu' | 'puzzle' | 'meditation' | 'coloring' | 'multiplayer'

export default function Entertainment() {
  const [activeGame, setActiveGame] = useState<GameType>('menu')

  const renderGame = () => {
    switch (activeGame) {
      case 'puzzle':
        return <PuzzleGame onBack={() => setActiveGame('menu')} />
      case 'meditation':
        return <MeditationGame onBack={() => setActiveGame('menu')} />
      case 'coloring':
        return <ColoringGame onBack={() => setActiveGame('menu')} />
      case 'multiplayer':
        return <MultiplayerGame onBack={() => setActiveGame('menu')} />
      default:
        return <GameLauncher onSelectGame={setActiveGame} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {renderGame()}
    </div>
  )
}
