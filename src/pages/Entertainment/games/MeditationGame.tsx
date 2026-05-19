import { useState, useEffect } from 'react'
import GameLayout from '../components/GameLayout'

interface MeditationGameProps {
  onBack: () => void
}

const meditations = [
  {
    id: 'breathing',
    name: 'Breathing Exercise',
    duration: 5,
    description: '4-7-8 breathing technique for relaxation',
    emoji: '🌬️',
  },
  {
    id: 'bodyScan',
    name: 'Body Scan',
    duration: 10,
    description: 'Progressive relaxation from head to toe',
    emoji: '✨',
  },
  {
    id: 'visualization',
    name: 'Visualization',
    duration: 8,
    description: 'Guided imagery for calm and peace',
    emoji: '🏞️',
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    duration: 7,
    description: 'Present moment awareness meditation',
    emoji: '🧠',
  },
]

export default function MeditationGame({ onBack }: MeditationGameProps) {
  const [selected, setSelected] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let interval: any = null
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false)
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft])

  const startMeditation = (meditation: any) => {
    setSelected(meditation)
    setTimeLeft(meditation.duration * 60)
    setIsActive(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (selected && timeLeft > 0) {
    return (
      <GameLayout title={selected.name} onBack={() => setSelected(null)}>
        <div className="flex flex-col items-center justify-center h-96">
          {/* Breathing Circle Animation */}
          <div className="mb-12">
            <div
              className="w-40 h-40 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse"
              style={{
                animation: 'breathe 8s infinite',
              }}
            >
              <div className="text-6xl">{selected.emoji}</div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center mb-8">
            <div className="text-5xl font-bold text-white mb-4">{formatTime(timeLeft)}</div>
            <p className="text-purple-200">Breathe naturally... take your time</p>
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsActive(!isActive)}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {isActive ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              Exit
            </button>
          </div>

          <style>{`
            @keyframes breathe {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.2); }
            }
          `}</style>
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout title="Meditation & Relaxation" onBack={onBack}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meditations.map((meditation) => (
          <button
            key={meditation.id}
            onClick={() => startMeditation(meditation)}
            className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">{meditation.emoji}</div>
            <h3 className="text-xl font-bold text-white mb-1">{meditation.name}</h3>
            <p className="text-purple-100 text-sm mb-2">{meditation.description}</p>
            <p className="text-purple-200 text-xs font-semibold">{meditation.duration} minutes</p>
          </button>
        ))}
      </div>
    </GameLayout>
  )
}
