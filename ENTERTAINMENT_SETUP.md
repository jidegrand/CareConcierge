# Entertainment Module Setup

## Overview

The Entertainment module provides patient engagement through games, puzzles, meditation, and family activities. The module is designed for hospital-at-home settings to help patients relax and stay engaged during recovery.

## Installation

### 1. Install Required Libraries

```bash
npm install --save \
  puzzle.js \
  chess.js \
  tone.js \
  three.js \
  fabric.js \
  react-use-gesture \
  zustand

npm install --save-dev @types/three
```

### 2. Library Purposes

- **puzzle.js** - Sudoku & puzzle generation
- **chess.js** - Chess game logic
- **tone.js** - Audio for breathing exercises
- **three.js** - 3D ambient visualizations
- **fabric.js** - Canvas drawing/coloring
- **react-use-gesture** - Touch/mouse controls
- **zustand** - Game state management with Zustand store

## Project Structure

```
src/pages/Entertainment/
├── Entertainment.tsx                    # Main entry component
├── GameLauncher.tsx                     # Game menu/selector
├── components/
│   ├── GameLayout.tsx                   # Shared layout wrapper
│   ├── PauseMenu.tsx                    # Pause menu modal
│   └── GameStats.tsx                    # Engagement statistics
├── games/
│   ├── PuzzleGame.tsx                   # Sudoku, crosswords, chess
│   ├── MeditationGame.tsx               # Breathing, body scan, visualization
│   ├── ColoringGame.tsx                 # Digital drawing/coloring
│   └── MultiplayerGame.tsx              # Family games (trivia, charades, etc)
└── hooks/
    ├── useGame.ts                       # Game state management with Zustand
    └── useGameAnalytics.ts              # Engagement tracking & metrics
```

## Features Implemented

### Game Types

1. **Brain Puzzles**
   - Sudoku
   - Word Search
   - Crossword
   - Chess

2. **Meditation & Relaxation**
   - Breathing Exercise (5 min) - 4-7-8 technique
   - Body Scan (10 min) - Progressive relaxation
   - Visualization (8 min) - Guided imagery
   - Mindfulness (7 min) - Present moment awareness
   - Animated breathing circle with timer

3. **Creative Art**
   - Digital drawing canvas
   - 10-color palette
   - 4 brush sizes (5px, 10px, 15px, 20px)
   - Clear canvas and download as PNG

4. **Family Games**
   - Trivia Quiz (2-8 players)
   - Scavenger Hunt (2-10 players)
   - Story Building (2-6 players)
   - Charades (3-8 players)
   - Rhyme Time (2-6 players)
   - Memory Match (1-4 players)

### Components

- **GameLayout**: Reusable wrapper for all games with consistent UI
- **PauseMenu**: Modal for pausing games with Resume/Restart/Exit options
- **GameStats**: Displays engagement metrics (games played, completion rate, etc)
- **useGame Hook**: Zustand store for game state management
- **useGameAnalytics Hook**: Track engagement metrics and session data

## Routing

The Entertainment module is available at `/entertainment` route:

```typescript
<Route path="/entertainment" element={<ProtectedRoute><Entertainment /></ProtectedRoute>} />
```

## Usage

### Starting a Game

1. Navigate to `/entertainment`
2. Click on desired game category
3. Select specific game
4. Play with pause/resume/exit controls

### Accessing Analytics

Use the `useGameAnalytics` hook to track engagement:

```typescript
const { trackGameStart, trackGameEnd, calculateEngagementMetrics } = useGameAnalytics()

// Track game start
trackGameStart('meditation-1', 'meditation')

// Track game end
trackGameEnd('meditation-1', { completed: true, duration: 300 })

// Get metrics
const metrics = calculateEngagementMetrics()
```

### Game State Management

Use the `useGame` hook for game state:

```typescript
const { score, level, incrementScore, incrementLevel } = useGame()
```

## Future Enhancements

1. Implement actual game logic for puzzles (puzzle.js integration)
2. Add chess engine (chess.js integration)
3. Add audio feedback (tone.js integration)
4. Add 3D ambient scenes (three.js integration)
5. Advanced drawing tools (fabric.js integration)
6. Touch gesture support (react-use-gesture integration)
7. Cloud save for game progress
8. Multiplayer real-time support
9. Achievement/badge system
10. Leaderboards (for family games)

## Testing

Test each game component:

```bash
# Navigate to entertainment
http://localhost:5173/entertainment

# Test each game category
- Click "Puzzles" → Select puzzle type
- Click "Meditation" → Start meditation
- Click "Creative Art" → Draw on canvas
- Click "Family Games" → Select game and set player count
```

## Performance Considerations

- Games use lazy loading where appropriate
- Canvas drawing is optimized for smooth performance
- State management with Zustand keeps bundles small
- Analytics data stored in sessionStorage (can be moved to backend)

## Security Notes

- All routes are protected with ProtectedRoute
- Patient data is isolated per tenant via RLS
- Game progress can be stored per tenant in database
- Analytics should be encrypted before transmission
