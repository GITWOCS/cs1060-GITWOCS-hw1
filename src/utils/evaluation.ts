// Piece values in centipawns
const PIECE_VALUES = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20000  // king
};

// Position bonus tables for pieces (simplified)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_GAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

function getPositionBonus(piece: string, square: number, isWhite: boolean): number {
  // Flip square for black pieces
  const sq = isWhite ? square : 63 - square;
  
  switch (piece.toLowerCase()) {
    case 'p': return PAWN_TABLE[sq];
    case 'n': return KNIGHT_TABLE[sq];
    case 'b': return BISHOP_TABLE[sq];
    case 'r': return ROOK_TABLE[sq];
    case 'q': return QUEEN_TABLE[sq];
    case 'k': return KING_MIDDLE_GAME_TABLE[sq];
    default: return 0;
  }
}

function squareToIndex(square: string): number {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
  return rank * 8 + file;
}

export function evaluatePosition(game: any): number {
  let score = 0;
  
  // Get the board representation
  const board = game.board();
  
  // Evaluate material and position
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const isWhite = piece.color === 'w';
        const pieceValue = PIECE_VALUES[piece.type as keyof typeof PIECE_VALUES] || 0;
        const positionBonus = getPositionBonus(piece.type, rank * 8 + file, isWhite);
        
        const totalValue = pieceValue + positionBonus;
        score += isWhite ? totalValue : -totalValue;
      }
    }
  }
  
  // Add mobility bonus (number of legal moves)
  const moves = game.moves();
  const mobilityBonus = moves.length * 10;
  score += game.turn() === 'w' ? mobilityBonus : -mobilityBonus;
  
  // Add checkmate/check bonuses
  if (game.isCheckmate()) {
    score += game.turn() === 'w' ? -50000 : 50000;
  } else if (game.inCheck()) {
    score += game.turn() === 'w' ? -50 : 50;
  }
  
  // Add endgame considerations
  const totalMaterial = Object.values(PIECE_VALUES).reduce((sum, val) => sum + val, 0);
  let currentMaterial = 0;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type !== 'k') {
        currentMaterial += PIECE_VALUES[piece.type as keyof typeof PIECE_VALUES] || 0;
      }
    }
  }
  
  // In endgame, centralize king
  if (currentMaterial < totalMaterial * 0.3) {
    // Find kings and add centralization bonus
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k') {
          const centerDistance = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
          const centralizationBonus = (7 - centerDistance) * 10;
          score += piece.color === 'w' ? centralizationBonus : -centralizationBonus;
        }
      }
    }
  }
  
  return Math.round(score);
}

export function centipawnsToWinProbability(centipawns: number): number {
  // Convert centipawns to win probability using a sigmoid function
  // This formula is based on chess engine analysis
  const k = 0.0043; // Scaling factor
  return 1 / (1 + Math.exp(-k * centipawns));
}

export function formatEvaluation(score: number, mate?: number): string {
  if (mate !== undefined) {
    return mate > 0 ? `M${mate}` : `M${Math.abs(mate)}`;
  }
  
  const centipawns = Math.round(score);
  if (centipawns === 0) return '0.00';
  
  const pawns = Math.abs(centipawns / 100);
  const sign = centipawns > 0 ? '+' : '-';
  
  return `${sign}${pawns.toFixed(2)}`;
}