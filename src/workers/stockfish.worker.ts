// Stockfish Web Worker for chess engine calculations
let engine: any = null;
let isReady = false;

function attachListener(e: any) {
  // Support both addMessageListener and onmessage depending on build
  const handler = (msg: any) => {
    const line = typeof msg === 'string' ? msg : msg?.data;
    if (typeof line !== 'string') return;

    if (line === 'uciok') {
      e.postMessage('isready');
      return;
    }

    if (line === 'readyok') {
      isReady = true;
      (self as any).postMessage({ type: 'ready' });
      return;
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      (self as any).postMessage({
        type: 'bestmove',
        move: bestMove === '(none)' ? null : bestMove,
      });
      return;
    }

    if (line.startsWith('info')) {
      const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
      if (scoreMatch) {
        const [, t, v] = scoreMatch;
        (self as any).postMessage({
          type: 'evaluation',
          score: t === 'cp' ? parseInt(v) : undefined,
          mate: t === 'mate' ? parseInt(v) : undefined,
        });
      }
    }
  };

  if (typeof e.addMessageListener === 'function') {
    e.addMessageListener(handler);
  } else {
    e.onmessage = handler;
  }
}

const initEngine = async () => {
  if (engine) return;
  // Load STOCKFISH global via CDN into this worker context
  // Try primary CDN, then fallback
  const urls = [
    'https://cdn.jsdelivr.net/npm/stockfish@10.0.2/src/stockfish.js',
    'https://unpkg.com/stockfish@10.0.2/src/stockfish.js'
  ];
  let loaded = false;
  for (const url of urls) {
    try {
      (self as any).importScripts(url);
      loaded = true;
      break;
    } catch (_err) {
      // try next
    }
  }
  if (!loaded) {
    (self as any).postMessage({ type: 'error', error: 'Failed to load Stockfish from CDNs' });
    return;
  }
  const STOCKFISH = (self as any).STOCKFISH;
  if (typeof STOCKFISH !== 'function') {
    (self as any).postMessage({ type: 'error', error: 'STOCKFISH global not found after importScripts' });
    return;
  }
  engine = STOCKFISH();
  attachListener(engine);
  engine.postMessage('uci');
};

(self as any).onmessage = async (e: MessageEvent) => {
  const { type, payload } = (e.data || {}) as { type: string; payload?: any };

  try {
    if (!engine && type !== 'init') {
      await initEngine();
    }

    switch (type) {
      case 'init':
        await initEngine();
        break;
      case 'setPosition':
        if (isReady && payload?.fen) {
          engine.postMessage(`position fen ${payload.fen}`);
        }
        break;

      case 'findBestMove': {
        if (!isReady) break;
        const { fen, skillLevel = 10, timeMs = 800 } = payload || {};
        if (fen) engine.postMessage(`position fen ${fen}`);
        // Limit strength if supported; ignore errors silently
        engine.postMessage('setoption name UCI_LimitStrength value true');
        // Map skill 1-20 to a plausible Elo 800-2000
        const s = Number(skillLevel) || 1;
        const clamped = Math.max(1, Math.min(20, s));
        const norm = (clamped - 1) / 19; // 0..1
        const elo = Math.round(800 + norm * 1200);
        engine.postMessage(`setoption name UCI_Elo value ${elo}`);
        engine.postMessage(`go movetime ${Math.max(100, timeMs)}`);
        break;
      }

      case 'analyze':
        if (isReady && payload?.fen) {
          engine.postMessage(`position fen ${payload.fen}`);
          engine.postMessage('go movetime 400');
        }
        break;

      case 'stop':
        if (isReady) {
          engine.postMessage('stop');
        }
        break;
    }
  } catch (error: any) {
    (self as any).postMessage({ type: 'error', error: error?.message || String(error) });
  }
};