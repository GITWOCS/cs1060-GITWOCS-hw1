import { useEffect, useRef, useCallback, useState } from 'react';

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
  const [ready, setReady] = useState(false);
  const bestMoveCbRef = useRef(onBestMove);
  const evalCbRef = useRef(onEvaluation);
  const readyCbRef = useRef(onReady);
  const readyNotifiedRef = useRef(false);

  // Keep refs updated with latest callbacks without changing effect deps
  useEffect(() => { bestMoveCbRef.current = onBestMove; }, [onBestMove]);
  useEffect(() => { evalCbRef.current = onEvaluation; }, [onEvaluation]);
  useEffect(() => { readyCbRef.current = onReady; }, [onReady]);

  useEffect(() => {
    // Create the official Stockfish engine worker directly from node_modules
    const worker = new Worker(new URL('stockfish/src/stockfish.js', import.meta.url), { type: 'classic' });

    // Handle UCI output lines from the engine
    worker.onmessage = (e: MessageEvent<any>) => {
      const line = typeof e.data === 'string' ? e.data : '';
      if (!line) return;

      if (line === 'uciok') {
        worker.postMessage('isready');
        return;
      }
      if (line === 'readyok') {
        setReady(true);
        if (!readyNotifiedRef.current) {
          readyNotifiedRef.current = true;
          try { readyCbRef.current(); } catch {}
        }
        return;
      }
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const mv = parts[1];
        if (mv === '(none)') {
          // Rarely happens; try a fixed depth search fallback
          try {
            const w = workerRef.current;
            if (w) {
              w.postMessage('stop');
              w.postMessage('go depth 12');
            }
          } catch {}
          try { bestMoveCbRef.current(null); } catch {}
        } else {
          try { bestMoveCbRef.current(mv); } catch {}
        }
        return;
      }
      if (line.startsWith('info')) {
        const m = line.match(/score (cp|mate) (-?\d+)/);
        if (m) {
          const kind = m[1];
          const val = parseInt(m[2], 10);
          try {
            if (kind === 'cp') evalCbRef.current(val);
            else if (kind === 'mate') evalCbRef.current(0, val);
          } catch {}
        }
      }
    };

    workerRef.current = worker;
    // Initialize UCI
    worker.postMessage('uci');

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
    };
  }, []);

  const findBestMove = useCallback((fen: string, skillLevel = 10, _depth = 12, timeMs = 800) => {
    if (!workerRef.current || !ready) return;
    const w = workerRef.current;
    // Ensure previous searches are stopped and engine is reset
    w.postMessage('stop');
    w.postMessage('ucinewgame');
    if (fen) w.postMessage(`position fen ${fen}`);
    // Limit strength and set Elo approximation from skillLevel 1..20
    const s = Math.max(1, Math.min(20, Number(skillLevel) || 1));
    const elo = Math.round(800 + ((s - 1) / 19) * 1200);
    w.postMessage('setoption name UCI_LimitStrength value true');
    w.postMessage(`setoption name UCI_Elo value ${elo}`);
    const t = Math.max(100, timeMs);
    w.postMessage(`go movetime ${t}`);
    // Hard stop safety in case the engine ignores movetime
    setTimeout(() => {
      try { w.postMessage('stop'); } catch {}
    }, t + 100);
  }, [ready]);

  const analyzePosition = useCallback((fen: string) => {
    if (!workerRef.current || !ready) return;
    const w = workerRef.current;
    if (fen) w.postMessage(`position fen ${fen}`);
    w.postMessage('go movetime 400');
  }, [ready]);

  const stopThinking = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage('stop');
  }, []);

  return {
    isReady: ready,
    findBestMove,
    analyzePosition,
    stopThinking,
  };
}