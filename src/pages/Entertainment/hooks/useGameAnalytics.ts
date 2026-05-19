import { useCallback } from 'react'

export interface GameAnalytics {
  gameId: string
  gameType: 'puzzle' | 'meditation' | 'coloring' | 'multiplayer'
  startTime: Date
  endTime?: Date
  duration: number // in seconds
  score?: number
  level?: number
  completed: boolean
  playerCount?: number
}

export function useGameAnalytics() {
  // Track game start
  const trackGameStart = useCallback((gameId: string, gameType: GameAnalytics['gameType']) => {
    const startTime = new Date()
    sessionStorage.setItem(`game_${gameId}_start`, startTime.toISOString())
    console.log(`[Analytics] Game started: ${gameId}`)
  }, [])

  // Track game end
  const trackGameEnd = useCallback(
    (gameId: string, analytics: Partial<GameAnalytics>) => {
      const startTimeStr = sessionStorage.getItem(`game_${gameId}_start`)
      const startTime = startTimeStr ? new Date(startTimeStr) : new Date()
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      const data: GameAnalytics = {
        gameId,
        gameType: analytics.gameType || 'puzzle',
        startTime,
        endTime,
        duration,
        score: analytics.score,
        level: analytics.level,
        completed: analytics.completed || false,
        playerCount: analytics.playerCount,
      }

      // Log to console (in production, send to analytics service)
      console.log('[Analytics] Game ended:', data)

      // Store in sessionStorage for potential API submission
      const gamesSessions = JSON.parse(sessionStorage.getItem('game_sessions') || '[]')
      gamesSessions.push(data)
      sessionStorage.setItem('game_sessions', JSON.stringify(gamesSessions))

      sessionStorage.removeItem(`game_${gameId}_start`)
    },
    []
  )

  // Track specific game event
  const trackEvent = useCallback((eventName: string, eventData: Record<string, any>) => {
    console.log(`[Analytics] Event: ${eventName}`, eventData)
  }, [])

  // Get session analytics
  const getSessionAnalytics = useCallback(() => {
    return JSON.parse(sessionStorage.getItem('game_sessions') || '[]')
  }, [])

  // Calculate engagement metrics
  const calculateEngagementMetrics = useCallback(() => {
    const sessions = getSessionAnalytics()

    if (sessions.length === 0) {
      return {
        totalGamesPlayed: 0,
        totalPlayTime: 0,
        averageGameDuration: 0,
        gamesCompleted: 0,
        completionRate: 0,
        favoriteGame: null,
      }
    }

    const totalGamesPlayed = sessions.length
    const totalPlayTime = sessions.reduce((acc: number, s: GameAnalytics) => acc + s.duration, 0)
    const averageGameDuration = Math.floor(totalPlayTime / totalGamesPlayed)
    const gamesCompleted = sessions.filter((s: GameAnalytics) => s.completed).length
    const completionRate = Math.round((gamesCompleted / totalGamesPlayed) * 100)

    // Find favorite game (most played)
    const gameTypeCount = sessions.reduce(
      (acc: Record<string, number>, s: GameAnalytics) => {
        acc[s.gameType] = (acc[s.gameType] || 0) + 1
        return acc
      },
      {}
    )
    const favoriteGame = Object.entries(gameTypeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || null

    return {
      totalGamesPlayed,
      totalPlayTime,
      averageGameDuration,
      gamesCompleted,
      completionRate,
      favoriteGame,
    }
  }, [getSessionAnalytics])

  // Clear analytics data
  const clearAnalytics = useCallback(() => {
    sessionStorage.removeItem('game_sessions')
    console.log('[Analytics] Data cleared')
  }, [])

  return {
    trackGameStart,
    trackGameEnd,
    trackEvent,
    getSessionAnalytics,
    calculateEngagementMetrics,
    clearAnalytics,
  }
}
