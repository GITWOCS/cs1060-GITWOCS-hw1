import { create } from 'zustand';
import { GameState, GameMode, PlayerSide, TimeControl, GameResult } from '../types/chess';

interface GameStore extends GameState {
  setGameMode: (mode: GameMode) => void;
  setPlayerSide: (side: PlayerSide) => void;
  setTimeControl: (timeControl: TimeControl) => void;
  setAiStrength: (strength: number) => void;
  startGame: () => void;
  endGame: (result: GameResult) => void;
  resetGame: () => void;
  updateTime: (color: 'white' | 'black', time: number) => void;
  setActiveColor: (color: 'white' | 'black') => void;
  setThinking: (thinking: boolean) => void;
  setEvaluation: (score: number) => void;
  toggleSound: () => void;
  flipBoard: () => void;
}

const initialState: GameState = {
  mode: 'computer',
  playerSide: 'white',
  timeControl: { minutes: 10, increment: 0, name: 'Rapid 10+0' },
  aiStrength: 5,
  gameStarted: false,
  gameResult: null,
  whiteTime: 600, // 10 minutes in seconds
  blackTime: 600,
  activeColor: 'white',
  isThinking: false,
  evaluationScore: 0,
  soundEnabled: true,
  boardFlipped: false,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  
  setGameMode: (mode) => set({ mode }),
  setPlayerSide: (side) => set({ playerSide: side }),
  setTimeControl: (timeControl) => set({ 
    timeControl,
    whiteTime: timeControl.minutes * 60,
    blackTime: timeControl.minutes * 60
  }),
  setAiStrength: (strength) => set({ aiStrength: strength }),
  
  startGame: () => set({ gameStarted: true, gameResult: null }),
  // Keep gameStarted true on endGame so the UI can show a game-over modal
  endGame: (result) => set({ gameResult: result }),
  resetGame: () => set({
    ...initialState,
  }),
  
  updateTime: (color, time) => set((state) => {
    const timeKey = color === 'white' ? 'whiteTime' : 'blackTime';
    // Store with 1 decimal place precision for proper time tracking
    // but display will be formatted as whole numbers
    const newTime = Math.max(0, Math.round(time * 10) / 10);
    
    // Check for time forfeit
    if (newTime === 0 && state.gameStarted && !state.gameResult) {
      return {
        [timeKey]: 0,
        gameResult: { 
          winner: color === 'white' ? 'black' : 'white',
          reason: 'time forfeit'
        }
      };
    }
    
    return { [timeKey]: newTime };
  }),
  
  setActiveColor: (color) => set({ activeColor: color }),
  setThinking: (thinking) => set({ isThinking: thinking }),
  setEvaluation: (score) => set({ evaluationScore: score }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  flipBoard: () => set((state) => ({ boardFlipped: !state.boardFlipped })),
}));