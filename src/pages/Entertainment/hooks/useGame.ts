import { create } from 'zustand'

export interface GameState {
  currentGame: string | null
  score: number
  level: number
  timeElapsed: number
  isActive: boolean

  // Actions
  setCurrentGame: (game: string | null) => void
  setScore: (score: number) => void
  incrementScore: (points: number) => void
  setLevel: (level: number) => void
  incrementLevel: () => void
  setTimeElapsed: (time: number) => void
  incrementTime: (seconds: number) => void
  setIsActive: (active: boolean) => void
  resetGame: () => void
}

export const useGameStore = create<GameState>((set) => ({
  currentGame: null,
  score: 0,
  level: 1,
  timeElapsed: 0,
  isActive: false,

  setCurrentGame: (game) => set({ currentGame: game }),
  setScore: (score) => set({ score }),
  incrementScore: (points) => set((state) => ({ score: state.score + points })),
  setLevel: (level) => set({ level }),
  incrementLevel: () => set((state) => ({ level: state.level + 1 })),
  setTimeElapsed: (time) => set({ timeElapsed: time }),
  incrementTime: (seconds) => set((state) => ({ timeElapsed: state.timeElapsed + seconds })),
  setIsActive: (active) => set({ isActive: active }),

  resetGame: () => set({
    currentGame: null,
    score: 0,
    level: 1,
    timeElapsed: 0,
    isActive: false,
  }),
}))

export default function useGame() {
  return useGameStore()
}
