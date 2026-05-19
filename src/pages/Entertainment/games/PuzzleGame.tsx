import { useState } from 'react'
import GameLayout from '../components/GameLayout'

interface PuzzleGameProps {
  onBack: () => void
}

const puzzles = [
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Fill the grid with numbers 1-9',
    emoji: '🔢',
  },
  {
    id: 'wordSearch',
    name: 'Word Search',
    description: 'Find hidden words in the grid',
    emoji: '🔍',
  },
  {
    id: 'crossword',
    name: 'Crossword',
    description: 'Solve clues to fill the grid',
    emoji: '✏️',
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'Play the classic strategy game',
    emoji: '♟️',
  },
]

export default function PuzzleGame({ onBack }: PuzzleGameProps) {
  const [selectedPuzzle, setSelectedPuzzle] = useState<string | null>(null)

  if (selectedPuzzle) {
    return (
      <GameLayout title={`Puzzle - ${selectedPuzzle}`} onBack={() => setSelectedPuzzle(null)}>
        <div className="flex items-center justify-center h-96 text-gray-300">
          <div className="text-center">
            <p className="text-2xl mb-4">🎮</p>
            <p className="text-lg font-semibold">{selectedPuzzle} Game</p>
            <p className="text-sm text-gray-400 mt-2">Coming soon - Game logic implementation</p>
            <button
              onClick={() => setSelectedPuzzle(null)}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Puzzles
            </button>
          </div>
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout title="Brain Puzzles" onBack={onBack}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {puzzles.map((puzzle) => (
          <button
            key={puzzle.id}
            onClick={() => setSelectedPuzzle(puzzle.name)}
            className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">{puzzle.emoji}</div>
            <h3 className="text-xl font-bold text-white mb-1">{puzzle.name}</h3>
            <p className="text-blue-100 text-sm">{puzzle.description}</p>
          </button>
        ))}
      </div>
    </GameLayout>
  )
}
