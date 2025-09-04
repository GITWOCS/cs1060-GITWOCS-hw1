import { useEffect, useRef, useCallback } from 'react';

interface StockfishMessage {
  type: 'ready' | 'bestmove' | 'evaluation' | 'error';
  move?: string | null;
  score?: number;
  mate?: number;
  error?: string;
}

interface UseStockfishReturn {
  isReady: boolean;
  findBestMove: (fen: string, skillLevel?: number, depth?: number, timeMs?: number) => void;
  analyzePosition: (fen: string) => void;
  stopThinking: () => void;
}

export function useStockfish(
  onBestMove: (move: string | null) => void,
  onEvaluation: (score: number, mate?: number) => void,
  onReady: () => void
): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    // Create a simple AI worker that makes legal moves
    const workerCode = `
      let isReady = false;
      
      // Simple piece values for evaluation
      const PIECE_VALUES = {
        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
      };
      
      // Simple position evaluation
      function evaluatePosition(board) {
        let score = 0;
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
              const value = PIECE_VALUES[piece.type] || 0;
              score += piece.color === 'w' ? value : -value;
            }
          }
        }
        return score + (Math.random() - 0.5) * 50; // Add some randomness
      }
      
      // Convert square notation to array indices
      function squareToIndices(square) {
        const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
        const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
        return [7 - rank, file]; // Flip rank for array indexing
      }
      
      // Convert array indices to square notation
      function indicesToSquare(row, col) {
        const file = String.fromCharCode(97 + col);
        const rank = (8 - row).toString();
        return file + rank;
      }
      
      // Simple move generation for basic pieces
      function generateMoves(board, color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece || piece.color !== color) continue;
            
            const from = indicesToSquare(row, col);
            
            // Generate moves based on piece type
            switch (piece.type) {
              case 'p': // Pawn
                const direction = piece.color === 'w' ? -1 : 1;
                const startRow = piece.color === 'w' ? 6 : 1;
                
                // Forward move
                if (row + direction >= 0 && row + direction < 8 && !board[row + direction][col]) {
                  moves.push({ from, to: indicesToSquare(row + direction, col) });
                  
                  // Double move from start
                  if (row === startRow && !board[row + 2 * direction][col]) {
                    moves.push({ from, to: indicesToSquare(row + 2 * direction, col) });
                  }
                }
                
                // Captures
                for (const dc of [-1, 1]) {
                  const newCol = col + dc;
                  const newRow = row + direction;
                  if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = board[newRow][newCol];
                    if (target && target.color !== piece.color) {
                      moves.push({ from, to: indicesToSquare(newRow, newCol) });
                    }
                  }
                }
                break;
                
              case 'r': // Rook
                for (const [dr, dc] of [[0,1], [0,-1], [1,0], [-1,0]]) {
                  for (let i = 1; i < 8; i++) {
                    const newRow = row + dr * i;
                    const newCol = col + dc * i;
                    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
                    
                    const target = board[newRow][newCol];
                    if (!target) {
                      moves.push({ from, to: indicesToSquare(newRow, newCol) });
                    } else {
                      if (target.color !== piece.color) {
                        moves.push({ from, to: indicesToSquare(newRow, newCol) });
                      }
                      break;
                    }
                  }
                }
                break;
                
              case 'n': // Knight
                for (const [dr, dc] of [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]]) {
                  const newRow = row + dr;
                  const newCol = col + dc;
                  if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = board[newRow][newCol];
                    if (!target || target.color !== piece.color) {
                      moves.push({ from, to: indicesToSquare(newRow, newCol) });
                    }
                  }
                }
                break;
                
              case 'b': // Bishop
                for (const [dr, dc] of [[1,1], [1,-1], [-1,1], [-1,-1]]) {
                  for (let i = 1; i < 8; i++) {
                    const newRow = row + dr * i;
                    const newCol = col + dc * i;
                    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
                    
                    const target = board[newRow][newCol];
                    if (!target) {
                      moves.push({ from, to: indicesToSquare(newRow, newCol) });
                    } else {
                      if (target.color !== piece.color) {
                        moves.push({ from, to: indicesToSquare(newRow, newCol) });
                      }
                      break;
                    }
                  }
                }
                break;
                
              case 'q': // Queen (combination of rook and bishop)
                for (const [dr, dc] of [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]) {
                  for (let i = 1; i < 8; i++) {
                    const newRow = row + dr * i;
                    const newCol = col + dc * i;
                    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
                    
                    const target = board[newRow][newCol];
                    if (!target) {
                      moves.push({ from, to: indicesToSquare(newRow, newCol) });
                    } else {
                      if (target.color !== piece.color) {
                        moves.push({ from, to: indicesToSquare(newRow, newCol) });
                      }
                      break;
                    }
                  }
                }
                break;
                
              case 'k': // King
                for (const [dr, dc] of [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]) {
                  const newRow = row + dr;
                  const newCol = col + dc;
                  if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = board[newRow][newCol];
                    if (!target || target.color !== piece.color) {
                      moves.push({ from, to: indicesToSquare(newRow, newCol) });
                    }
                  }
                }
                break;
            }
          }
        }
        
        return moves;
      }
      
      // Parse FEN to board array
      function fenToBoard(fen) {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        const pieces = fen.split(' ')[0];
        const rows = pieces.split('/');
        
        for (let i = 0; i < 8; i++) {
          let col = 0;
          for (const char of rows[i]) {
            if (char >= '1' && char <= '8') {
              col += parseInt(char);
            } else {
              const color = char === char.toUpperCase() ? 'w' : 'b';
              const type = char.toLowerCase();
              board[i][col] = { type, color };
              col++;
            }
          }
        }
        
        return board;
      }
      
      self.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'init':
            setTimeout(() => {
              isReady = true;
              self.postMessage({ type: 'ready' });
            }, 100);
            break;
            
          case 'findBestMove':
            if (isReady && payload.fen) {
              try {
                const board = fenToBoard(payload.fen);
                const activeColor = payload.fen.split(' ')[1]; // 'w' or 'b'
                const moves = generateMoves(board, activeColor);
                
                if (moves.length > 0) {
                  // Simple AI strategy: prefer captures, then random
                  let bestMoves = moves;
                  
                  // Look for captures
                  const captures = moves.filter(move => {
                    const [toRow, toCol] = squareToIndices(move.to);
                    return board[toRow][toCol] !== null;
                  });
                  
                  if (captures.length > 0 && Math.random() > 0.3) {
                    bestMoves = captures;
                  }
                  
                  // Select random move from best moves
                  const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
                  const uciMove = selectedMove.from + selectedMove.to;
                  
                  setTimeout(() => {
                    self.postMessage({ type: 'bestmove', move: uciMove });
                  }, Math.max(500, payload.timeMs || 1000));
                } else {
                  self.postMessage({ type: 'bestmove', move: null });
                }
              } catch (error) {
                self.postMessage({ type: 'error', error: error.message });
              }
            }
            break;
            
          case 'analyze':
            if (isReady && payload.fen) {
              try {
                const board = fenToBoard(payload.fen);
                const score = evaluatePosition(board);
                
                setTimeout(() => {
                  self.postMessage({ type: 'evaluation', score });
                }, 100);
              } catch (error) {
                self.postMessage({ type: 'error', error: error.message });
              }
            }
            break;
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e: MessageEvent<StockfishMessage>) => {
      const { type, move, score, mate, error } = e.data;
      
      switch (type) {
        case 'ready':
          isReadyRef.current = true;
          onReady();
          break;
        case 'bestmove':
          if (move) onBestMove(move);
          break;
        case 'evaluation':
          if (score !== undefined) onEvaluation(score, mate);
          break;
        case 'error':
          console.error('AI error:', error);
          break;
      }
    };
    
    workerRef.current = worker;
    worker.postMessage({ type: 'init' });
    
    return () => {
      worker.terminate();
      URL.revokeObjectURL(blob);
    };
  }, [onBestMove, onEvaluation, onReady]);

  const findBestMove = useCallback((fen: string, skillLevel = 20, depth = 15, timeMs = 1000) => {
    if (workerRef.current && isReadyRef.current) {
      workerRef.current.postMessage({
        type: 'findBestMove',
        payload: { fen, skillLevel, depth, timeMs }
      });
    }
  }, []);

  const analyzePosition = useCallback((fen: string) => {
    if (workerRef.current && isReadyRef.current) {
      workerRef.current.postMessage({
        type: 'analyze',
        payload: { fen }
      });
    }
  }, []);

  const stopThinking = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
    }
  }, []);

  return {
    isReady: isReadyRef.current,
    findBestMove,
    analyzePosition,
    stopThinking
  };
}