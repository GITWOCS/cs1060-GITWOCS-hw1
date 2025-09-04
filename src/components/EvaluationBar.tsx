import React from 'react';
import { centipawnsToWinProbability, formatEvaluation } from '../utils/evaluation';

interface EvaluationBarProps {
  score: number;
  mate?: number;
}

export function EvaluationBar({ score, mate }: EvaluationBarProps) {
  const winProbability = centipawnsToWinProbability(score);
  const whiteAdvantage = winProbability * 100;
  const blackAdvantage = 100 - whiteAdvantage;
  
  const evaluationText = formatEvaluation(score, mate);
  const isWhiteWinning = score > 0;

  return (
    <div className="w-full mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Position Evaluation</span>
        <span className={`text-sm font-bold ${isWhiteWinning ? 'text-blue-600' : 'text-red-600'}`}>
          {evaluationText}
        </span>
      </div>
      
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        {/* White advantage bar */}
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700 ease-out"
          style={{ width: `${whiteAdvantage}%` }}
        />
        
        {/* Black advantage bar */}
        <div 
          className="absolute top-0 right-0 h-full bg-gradient-to-l from-red-400 to-red-600 transition-all duration-700 ease-out"
          style={{ width: `${blackAdvantage}%` }}
        />
        
        {/* Center line */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-400 transform -translate-x-px" />
        
        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <span className="text-xs font-bold text-white drop-shadow">W</span>
          <span className="text-xs font-bold text-white drop-shadow">B</span>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>White {whiteAdvantage.toFixed(0)}%</span>
        <span>Black {blackAdvantage.toFixed(0)}%</span>
      </div>
    </div>
  );
}