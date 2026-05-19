
export interface GameStatsData {
  totalGamesPlayed: number
  totalPlayTime: number
  averageGameDuration: number
  gamesCompleted: number
  completionRate: number
  favoriteGame: string | null
  currentScore?: number
  currentLevel?: number
}

interface GameStatsProps {
  stats: GameStatsData
  showDetailed?: boolean
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export default function GameStats({ stats, showDetailed = false }: GameStatsProps) {
  return (
    <div className="bg-slate-700 rounded-lg p-6">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center">
        <span className="text-2xl mr-2">📊</span>
        Game Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-600 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Games Played</p>
          <p className="text-2xl font-bold text-white">{stats.totalGamesPlayed}</p>
        </div>

        <div className="bg-slate-600 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total Play Time</p>
          <p className="text-2xl font-bold text-white">{formatTime(stats.totalPlayTime)}</p>
        </div>

        <div className="bg-slate-600 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Games Completed</p>
          <p className="text-2xl font-bold text-white">{stats.gamesCompleted}</p>
        </div>

        <div className="bg-slate-600 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-white">{stats.completionRate}%</p>
        </div>
      </div>

      {showDetailed && (
        <>
          <div className="border-t border-slate-600 pt-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              {stats.currentScore !== undefined && (
                <div className="bg-slate-600 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Current Score</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.currentScore}</p>
                </div>
              )}

              {stats.currentLevel !== undefined && (
                <div className="bg-slate-600 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Current Level</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.currentLevel}</p>
                </div>
              )}

              {stats.averageGameDuration > 0 && (
                <div className="bg-slate-600 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Avg Game Duration</p>
                  <p className="text-2xl font-bold text-green-400">{formatTime(stats.averageGameDuration)}</p>
                </div>
              )}

              {stats.favoriteGame && (
                <div className="bg-slate-600 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Favorite Game</p>
                  <p className="text-lg font-bold text-pink-400 capitalize">{stats.favoriteGame}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="bg-slate-600 rounded-lg p-3 mt-4">
        <p className="text-xs text-gray-400">
          💡 Keep playing to improve your engagement and unlock achievements!
        </p>
      </div>
    </div>
  )
}
