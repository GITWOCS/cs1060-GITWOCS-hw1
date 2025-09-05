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

  // Run timer for both human and AI, as long as game is active
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
    if (!isGameActive || !activeColor) return;
    
    // Use exactly 1 second intervals for consistent countdown
    const interval = setInterval(() => {
      const currentTime = activeColor === 'white' ? whiteRef.current : blackRef.current;
      // Subtract exactly 1 second to make timer count correctly
      const newTime = Math.max(0, currentTime - 1);
      
      onTimeUpdateRef.current(activeColor, newTime);
      if (newTime === 0) {
        onTimeUpRef.current(activeColor);
      }
    }, 1000); // Update exactly once per second

    return () => clearInterval(interval);
  }, [activeColor, isGameActive]);

  const formatTime = (seconds: number): string => {
    // Always show time as whole numbers, no decimals
    if (seconds < 60) {
      // Just show seconds for times under a minute
      const secs = Math.floor(seconds);
      return `${secs}`;
    } else {
      // Show as minutes:seconds
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
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