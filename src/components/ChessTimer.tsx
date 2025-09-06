import { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export interface ChessTimerProps {
  compactView?: boolean;
  lightTheme?: boolean;
}

export function ChessTimer({ compactView = false, lightTheme = false }: ChessTimerProps) {
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
    
    let baseClass = `flex items-center justify-between ${compactView ? 'p-2' : 'p-4'} rounded-xl transition-all duration-300 `;
    
    if (isActive) {
      if (isLow) {
        baseClass += lightTheme
          ? "bg-red-50 border-2 border-red-400 shadow-md scale-105 "
          : "bg-red-900/30 border-2 border-red-500 shadow-lg scale-105 ";
      } else {
        baseClass += lightTheme
          ? "bg-amber-50 border-2 border-amber-400 shadow-md scale-105 "
          : "bg-amber-900/30 border-2 border-amber-500 shadow-lg scale-105 ";
      }
    } else {
      baseClass += lightTheme
        ? "bg-gray-50 border-2 border-gray-200 "
        : "bg-gray-900/20 border-2 border-gray-700/50 ";
    }
    
    return baseClass;
  };

  return (
    <div className={`grid grid-cols-2 gap-${compactView ? '3' : '6'} ${compactView ? 'mb-2' : 'mb-6'}`}>
      {/* Black Timer (top) */}
      <div className={getTimerClass('black', blackTime)}>
        <div>
          <div className={`${compactView ? 'text-sm' : 'text-lg'} font-bold ${lightTheme ? 'text-gray-800' : 'text-gray-100'}`}>Black</div>
          {!compactView && <div className={`text-xs ${lightTheme ? 'text-gray-600' : 'text-gray-400'}`}>Player 2</div>}
        </div>
        <div className="text-right">
          <div className={`${compactView ? 'text-lg' : 'text-2xl'} font-mono font-bold ${blackTime < 60 ? (lightTheme ? 'text-red-600' : 'text-red-400') : (lightTheme ? 'text-gray-800' : 'text-gray-100')}`}>
            {formatTime(blackTime)}
          </div>
          {activeColor === 'black' && isGameActive && (
            <div className="flex items-center justify-end mt-1">
              <Clock className="w-3 h-3 mr-1 text-amber-500" />
              <span className="text-xs text-amber-500">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* White Timer (bottom) */}
      <div className={getTimerClass('white', whiteTime)}>
        <div>
          <div className={`${compactView ? 'text-sm' : 'text-lg'} font-bold ${lightTheme ? 'text-gray-800' : 'text-gray-100'}`}>White</div>
          {!compactView && <div className={`text-xs ${lightTheme ? 'text-gray-600' : 'text-gray-400'}`}>Player 1</div>}
        </div>
        <div className="text-right">
          <div className={`${compactView ? 'text-lg' : 'text-2xl'} font-mono font-bold ${whiteTime < 60 ? (lightTheme ? 'text-red-600' : 'text-red-400') : (lightTheme ? 'text-gray-800' : 'text-gray-100')}`}>
            {formatTime(whiteTime)}
          </div>
          {activeColor === 'white' && isGameActive && (
            <div className="flex items-center justify-end mt-1">
              <Clock className="w-3 h-3 mr-1 text-amber-500" />
              <span className="text-xs text-amber-500">Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}