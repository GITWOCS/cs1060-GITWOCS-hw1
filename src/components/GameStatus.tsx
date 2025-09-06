import { Crown, AlertTriangle, Brain } from 'lucide-react';
import { GameResult } from '../types/chess';

export interface GameStatusProps {
  isGameActive: boolean;
  activeColor: 'white' | 'black';
  isInCheck: boolean;
  gameResult: GameResult | null;
  isThinking: boolean;
  compactView?: boolean;
  lightTheme?: boolean;
}

export function GameStatus({ 
  isGameActive, 
  activeColor, 
  isInCheck, 
  gameResult, 
  isThinking,
  compactView = false,
  lightTheme = false
}: GameStatusProps) {
  
  if (gameResult) {
    const getResultDisplay = () => {
      if (gameResult.winner === 'white') {
        return { text: '1-0', description: `White wins by ${gameResult.reason}`, color: 'text-blue-600' };
      } else if (gameResult.winner === 'black') {
        return { text: '0-1', description: `Black wins by ${gameResult.reason}`, color: 'text-red-600' };
      } else {
        return { text: '½-½', description: `Draw by ${gameResult.reason}`, color: 'text-gray-600' };
      }
    };

    const result = getResultDisplay();
    
    return (
      <div className={`${lightTheme ? 'bg-white' : 'bg-gradient-to-r from-amber-50 to-orange-50'} border-2 ${lightTheme ? 'border-amber-500/50' : 'border-amber-200'} rounded-xl ${compactView ? 'p-2' : 'p-4'} ${compactView ? 'mb-1' : 'mb-4'}`}>
        <div className="flex items-center justify-center">
          <Crown className={`${compactView ? 'w-4 h-4' : 'w-6 h-6'} mr-2 text-amber-600`} />
          <div className="text-center">
            <div className={`${compactView ? 'text-lg' : 'text-2xl'} font-bold ${result.color}`}>{result.text}</div>
            <div className={`${compactView ? 'text-xs' : 'text-sm'} text-gray-700 font-medium`}>{result.description}</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isGameActive) {
    return null;
  }

  return (
    <div className={`${lightTheme ? 'bg-white' : 'bg-stone-800'} border-2 ${lightTheme ? 'border-amber-500/50' : 'border-amber-900/50'} rounded-xl ${compactView ? 'p-2' : 'p-4'} ${compactView ? 'mb-1' : 'mb-4'}`}>
      <div className={`flex items-center ${compactView ? 'justify-between' : 'justify-center'} ${compactView ? 'space-x-2' : 'space-x-4'}`}>
        {isThinking && (
          <div className="flex items-center text-amber-600">
            <Brain className={`${compactView ? 'w-4 h-4' : 'w-5 h-5'} mr-1 animate-pulse`} />
            <span className={`${compactView ? 'text-xs' : 'text-sm'} font-medium`}>AI thinking...</span>
          </div>
        )}
        
        <div className="flex items-center">
          <div className={`${compactView ? 'w-3 h-3' : 'w-4 h-4'} rounded-full mr-1 ${activeColor === 'white' ? 'bg-gray-100 border-2 border-gray-400' : 'bg-gray-800'}`} />
          <span className={`${compactView ? 'text-xs' : 'text-sm'} font-semibold ${lightTheme ? 'text-amber-800' : 'text-amber-200'} capitalize`}>{activeColor} to move</span>
        </div>
        
        {isInCheck && (
          <div className="flex items-center text-red-600">
            <AlertTriangle className={`${compactView ? 'w-4 h-4' : 'w-5 h-5'} mr-1`} />
            <span className={`${compactView ? 'text-xs' : 'text-sm'} font-bold`}>Check!</span>
          </div>
        )}
      </div>
    </div>
  );
}