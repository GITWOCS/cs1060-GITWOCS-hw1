import React from 'react';
import { Crown, AlertTriangle, Clock, Brain } from 'lucide-react';
import { GameResult } from '../types/chess';

interface GameStatusProps {
  isGameActive: boolean;
  activeColor: 'white' | 'black';
  isInCheck: boolean;
  gameResult: GameResult | null;
  isThinking: boolean;
}

export function GameStatus({ 
  isGameActive, 
  activeColor, 
  isInCheck, 
  gameResult, 
  isThinking 
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-center">
          <Crown className="w-6 h-6 mr-3 text-amber-600" />
          <div className="text-center">
            <div className={`text-2xl font-bold ${result.color}`}>{result.text}</div>
            <div className="text-gray-700 font-medium">{result.description}</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isGameActive) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-center space-x-4">
        {isThinking && (
          <div className="flex items-center text-amber-600">
            <Brain className="w-5 h-5 mr-2 animate-pulse" />
            <span className="text-sm font-medium">AI thinking...</span>
          </div>
        )}
        
        <div className="flex items-center">
          <div className={`w-4 h-4 rounded-full mr-2 ${activeColor === 'white' ? 'bg-gray-100 border-2 border-gray-400' : 'bg-gray-800'}`} />
          <span className="font-semibold text-gray-800 capitalize">{activeColor} to move</span>
        </div>
        
        {isInCheck && (
          <div className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-1" />
            <span className="font-bold">Check!</span>
          </div>
        )}
      </div>
    </div>
  );
}