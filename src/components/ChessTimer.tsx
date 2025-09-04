import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ChessTimerProps {
  whiteTime: number;
  blackTime: number;
  activeColor: 'white' | 'black';
  isGameActive: boolean;
  onTimeUp: (color: 'white' | 'black') => void;
  onTimeUpdate: (color: 'white' | 'black', time: number) => void;
  increment: number;
}

export function ChessTimer({
  whiteTime,
  blackTime,
  activeColor,
  isGameActive,
  onTimeUp,
  onTimeUpdate,
  increment
}: ChessTimerProps) {
  
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      if (activeColor === 'white') {
        const newTime = Math.max(0, whiteTime - 1);
        onTimeUpdate('white', newTime);
        if (newTime === 0) onTimeUp('white');
      } else {
        const newTime = Math.max(0, blackTime - 1);
        onTimeUpdate('black', newTime);
        if (newTime === 0) onTimeUp('black');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [whiteTime, blackTime, activeColor, isGameActive, onTimeUp, onTimeUpdate]);

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