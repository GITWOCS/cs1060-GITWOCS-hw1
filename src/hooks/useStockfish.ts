import { useEffect, useRef, useCallback, useState } from 'react';

interface UseStockfishReturn {
  isReady: boolean;
  findBestMove: (
    fen: string,
    skillLevel?: number,
    depth?: number,
    timeMs?: number,
    wtimeMs?: number,
    btimeMs?: number,
    wincMs?: number,
    bincMs?: number
  ) => void;
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
  const analyzingRef = useRef(false);

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
        // If this bestmove is from an analysis request, ignore it for move making
        if (analyzingRef.current) {
          // end analysis window
          analyzingRef.current = false;
          return;
        }
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

  const findBestMove = useCallback((
    fen: string,
    skillLevel = 10,
    _depth = 12,
    timeMs = 800,
    wtimeMs?: number,
    btimeMs?: number,
    wincMs?: number,
    bincMs?: number,
  ) => {
    if (!workerRef.current || !ready) return;
    const w = workerRef.current;
    // Ensure previous searches are stopped and engine is reset
    w.postMessage('stop');
    w.postMessage('ucinewgame');
    if (fen) w.postMessage(`position fen ${fen}`);
    // Limit strength and set a MUCH lower Elo for low levels to make level 1 easy
    // Skill level constrained to 1..20
    const s = Math.max(1, Math.min(20, Number(skillLevel) || 1));
    // Map s=1..20 to a softer Elo range ~300..1200 instead of ~800..2000
    const elo = Math.round(300 + ((s - 1) / 19) * 900);
    w.postMessage('setoption name UCI_LimitStrength value true');
    w.postMessage(`setoption name UCI_Elo value ${elo}`);
    // Also set the built-in Skill Level (0..20). Use s-1 within 0..20
    const sfSkill = Math.max(0, Math.min(20, s - 1));
    w.postMessage(`setoption name Skill Level value ${sfSkill}`);
    const t = Math.max(100, timeMs);
    // If clock times provided, use clock-aware search; else fallback to movetime
    if (typeof wtimeMs === 'number' && typeof btimeMs === 'number') {
      const winc = Math.max(0, wincMs ?? 0);
      const binc = Math.max(0, bincMs ?? 0);
      w.postMessage(`go wtime ${Math.max(0, Math.floor(wtimeMs))} btime ${Math.max(0, Math.floor(btimeMs))} winc ${Math.floor(winc)} binc ${Math.floor(binc)}`);
      // Safety stop after a bit beyond the smaller of remaining/target think time
      const safety = Math.min(t, Math.max(1000, Math.floor(Math.min(wtimeMs, btimeMs) * 0.5)));
      setTimeout(() => {
        try { w.postMessage('stop'); } catch {}
      }, safety + 200);
    } else {
      w.postMessage(`go movetime ${t}`);
      // Hard stop safety in case the engine ignores movetime
      setTimeout(() => {
        try { w.postMessage('stop'); } catch {}
      }, t + 100);
    }
  }, [ready]);

  const analyzePosition = useCallback((fen: string) => {
    if (!workerRef.current || !ready) return;
    const w = workerRef.current;
    analyzingRef.current = true;
    if (fen) w.postMessage(`position fen ${fen}`);
    const t = 400;
    w.postMessage(`go movetime ${t}`);
    setTimeout(() => {
      // Ensure analysis ends and flag resets
      try { w.postMessage('stop'); } catch {}
      analyzingRef.current = false;
    }, t + 100);
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