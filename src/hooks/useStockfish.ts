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
    // Create a simple AI that makes random legal moves
    const workerCode = `
      let isReady = false;
      let currentGame = null;
      
      // Import chess.js in the worker
      importScripts('https://unpkg.com/chess.js@1.0.0-beta.8/dist/chess.min.js');
      
      self.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'init':
            setTimeout(() => {
              isReady = true;
              self.postMessage({ type: 'ready' });
            }, 500);
            break;
            
          case 'findBestMove':
            if (isReady && payload.fen) {
              try {
                const chess = new Chess(payload.fen);
                const moves = chess.moves();
                
                if (moves.length > 0) {
                  // Simple AI: pick a random move with slight preference for captures
                  const captures = moves.filter(move => move.includes('x'));
                  const selectedMoves = captures.length > 0 && Math.random() > 0.3 ? captures : moves;
                  const randomMove = selectedMoves[Math.floor(Math.random() * selectedMoves.length)];
                  
                  // Convert algebraic notation to UCI format
                  const tempChess = new Chess(payload.fen);
                  const moveObj = tempChess.move(randomMove);
                  const uciMove = moveObj ? moveObj.from + moveObj.to + (moveObj.promotion || '') : null;
                  
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
                const chess = new Chess(payload.fen);
                // Simple evaluation based on material count
                let score = 0;
                const board = chess.board();
                
                for (let row of board) {
                  for (let square of row) {
                    if (square) {
                      const pieceValue = {
                        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 0
                      }[square.type] || 0;
                      
                      score += square.color === 'w' ? pieceValue : -pieceValue;
                    }
                  }
                }
                
                // Add some randomness and positional factors
                score += (Math.random() - 0.5) * 50;
                
                setTimeout(() => {
                  self.postMessage({ type: 'evaluation', score });
                }, 200);
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
          console.error('Stockfish error:', error);
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