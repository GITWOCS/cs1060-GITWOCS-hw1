import { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function ChessTimer() {
  const {
    whiteTime,
    blackTime,
    activeColor,
    gameStarted,
    gameResult,
    updateTime,
    endGame,
  } = useGameStore();

  // Keep running the timer even when AI is thinking
  const isGameActive = gameStarted && !gameResult;

  const onTimeUp = (color: 'white' | 'black') => {
    const winner = color === 'white' ? 'black' : 'white';
    endGame({ winner, reason: 'time forfeit' });
  };

  // Keep latest values in refs to avoid stale closures and unnecessary interval resets
  const whiteRef = useRef(whiteTime);
  const blackRef = useRef(blackTime);
  const onTimeUpRef = useRef(onTimeUp);
  const onTimeUpdateRef = useRef(updateTime);

  useEffect(() => { whiteRef.current = whiteTime; }, [whiteTime]);
  useEffect(() => { blackRef.current = blackTime; }, [blackTime]);
  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useEffect(() => { onTimeUpdateRef.current = updateTime; }, [updateTime]);

  useEffect(() => {
    if (!isGameActive) return;

    let last = Date.now();
    let acc = 0;
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      acc += delta;

      while (acc >= 1) {
        acc -= 1;
        if (activeColor === 'white') {
          const newTime = Math.max(0, whiteRef.current - 1);
          onTimeUpdateRef.current('white', newTime);
          if (newTime === 0) onTimeUpRef.current('white');
        } else {
          const newTime = Math.max(0, blackRef.current - 1);
          onTimeUpdateRef.current('black', newTime);
          if (newTime === 0) onTimeUpRef.current('black');
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [activeColor, isGameActive]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (color: 'white' | 'black', time: number) => {
    const isActive = activeColor === color;
    const isLow = time < 60;
    
    let baseClass = "flex items-center justify-between p-4 rounded-xl transition-all duration-300 ";
    
    if (isActive) {
      baseClass += isLow 
        ? "bg-red-100 border-2 border-red-500 shadow-lg scale-105 " 
        : "bg-amber-100 border-2 border-amber-500 shadow-lg scale-105 ";
    } else {
      baseClass += "bg-gray-100 border-2 border-gray-300 ";
    }
    
    return baseClass;
  };

  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      {/* Black Timer (top) */}
      <div className={getTimerClass('black', blackTime)}>
        <div>
          <div className="text-lg font-bold text-gray-800">Black</div>
          <div className="text-xs text-gray-600">Player 2</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${blackTime < 60 ? 'text-red-600' : 'text-gray-800'}`}>
            {formatTime(blackTime)}
          </div>
          {activeColor === 'black' && isGameActive && (
            <div className="flex items-center justify-end mt-1">
              <Clock className="w-3 h-3 mr-1 text-amber-600" />
              <span className="text-xs text-amber-600">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* White Timer (bottom) */}
      <div className={getTimerClass('white', whiteTime)}>
        <div>
          <div className="text-lg font-bold text-gray-800">White</div>
          <div className="text-xs text-gray-600">Player 1</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${whiteTime < 60 ? 'text-red-600' : 'text-gray-800'}`}>
            {formatTime(whiteTime)}
          </div>
          {activeColor === 'white' && isGameActive && (
            <div className="flex items-center justify-end mt-1">
              <Clock className="w-3 h-3 mr-1 text-amber-600" />
              <span className="text-xs text-amber-600">Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}