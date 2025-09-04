// Stockfish Web Worker for chess engine calculations
import Stockfish from 'stockfish';

let engine: any = null;
let isReady = false;

const initEngine = async () => {
  if (!engine) {
    engine = await Stockfish();
    
    engine.addMessageListener((line: string) => {
      console.log('Stockfish:', line);
      
      if (line === 'uciok') {
        engine.postMessage('isready');
      }
      
      if (line === 'readyok') {
        isReady = true;
        self.postMessage({ type: 'ready' });
      }
      
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        self.postMessage({ 
          type: 'bestmove', 
          move: bestMove === '(none)' ? null : bestMove 
        });
      }
      
      if (line.startsWith('info depth')) {
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        if (scoreMatch) {
          const [, type, value] = scoreMatch;
          self.postMessage({
            type: 'evaluation',
            score: type === 'cp' ? parseInt(value) : undefined,
            mate: type === 'mate' ? parseInt(value) : undefined
          });
        }
      }
    });
    
    engine.postMessage('uci');
  }
};

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  try {
    if (!engine) {
      await initEngine();
    }
    
    switch (type) {
      case 'setPosition':
        if (isReady) {
          engine.postMessage(`position fen ${payload.fen}`);
        }
        break;
        
      case 'findBestMove':
        if (isReady) {
          const { skillLevel = 20, depth = 15, timeMs = 1000 } = payload;
          engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
          engine.postMessage(`go depth ${depth} movetime ${timeMs}`);
        }
        break;
        
      case 'analyze':
        if (isReady) {
          engine.postMessage(`position fen ${payload.fen}`);
          engine.postMessage('go depth 12 movetime 500');
        }
        break;
        
      case 'stop':
        if (isReady) {
          engine.postMessage('stop');
        }
        break;
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};