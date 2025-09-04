export type GameMode = 'computer' | 'human';
export type PlayerSide = 'white' | 'black';
export type TimeControl = {
  minutes: number;
  increment: number;
  name: string;
};

export type GameResult = {
  winner: 'white' | 'black' | 'draw' | null;
  reason: string;
};

export type GameState = {
  mode: GameMode;
  playerSide: PlayerSide;
  timeControl: TimeControl;
  aiStrength: number;
  gameStarted: boolean;
  gameResult: GameResult | null;
  whiteTime: number;
  blackTime: number;
  activeColor: 'white' | 'black';
  isThinking: boolean;
  evaluationScore: number;
  soundEnabled: boolean;
  boardFlipped: boolean;
};

export type Move = {
  from: string;
  to: string;
  promotion?: string;
};