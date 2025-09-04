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
    // Create worker from inline code since we can't load external worker files
    const workerCode = `
      // Simple inline Stockfish worker implementation
      let isReady = false;
      
      // Mock Stockfish responses for demonstration
      // In a real implementation, you'd use the actual Stockfish WASM
      
      self.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'init':
            setTimeout(() => {
              isReady = true;
              self.postMessage({ type: 'ready' });
            }, 1000);
            break;
            
          case 'findBestMove':
            if (isReady) {
              // Simulate thinking time
              setTimeout(() => {
                // Generate a random legal move (simplified for demo)
                const moves = ['e2e4', 'g1f3', 'd2d4', 'b1c3', 'f1c4'];
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                self.postMessage({ type: 'bestmove', move: randomMove });
              }, payload.timeMs || 1000);
            }
            break;
            
          case 'analyze':
            if (isReady) {
              setTimeout(() => {
                // Generate random evaluation for demo
                const score = Math.floor(Math.random() * 400) - 200;
                self.postMessage({ type: 'evaluation', score });
              }, 300);
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