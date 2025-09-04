import React, { useState } from 'react';
import { Clock, Cpu, Users, Settings, Zap } from 'lucide-react';
import { GameMode, PlayerSide, TimeControl } from '../types/chess';
import { TIME_CONTROLS, AI_STRENGTHS } from '../utils/timeControls';
import { useGameStore } from '../store/gameStore';

export function GameSetup() {
  const [selectedMode, setSelectedMode] = useState<GameMode>('computer');
  const [selectedSide, setSelectedSide] = useState<PlayerSide>('white');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[2]); // Blitz 3+0
  const [selectedAiStrength, setSelectedAiStrength] = useState(5);
  const [customTime, setCustomTime] = useState({ minutes: 10, increment: 0 });
  const [showCustomTime, setShowCustomTime] = useState(false);
  
  const { setGameMode, setPlayerSide, setTimeControl, setAiStrength, startGame } = useGameStore();

  const handleStartGame = () => {
    setGameMode(selectedMode);
    setPlayerSide(selectedSide);
    
    const timeControl = showCustomTime 
      ? { ...customTime, name: `Custom ${customTime.minutes}+${customTime.increment}` }
      : selectedTimeControl;
    
    setTimeControl(timeControl);
    setAiStrength(selectedAiStrength);
    startGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chess Master</h1>
          <p className="text-gray-600">Configure your game and start playing</p>
        </div>

        {/* Game Mode Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Game Mode
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedMode('computer')}
              className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                selectedMode === 'computer'
                  ? 'border-amber-500 bg-amber-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
              }`}
            >
              <Cpu className="w-8 h-8 mx-auto mb-3 text-amber-600" />
              <div className="font-semibold text-gray-800">vs Computer</div>
              <div className="text-sm text-gray-600">Play against AI</div>
            </button>
            <button
              onClick={() => setSelectedMode('human')}
              className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                selectedMode === 'human'
                  ? 'border-amber-500 bg-amber-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
              }`}
            >
              <Users className="w-8 h-8 mx-auto mb-3 text-amber-600" />
              <div className="font-semibold text-gray-800">vs Human</div>
              <div className="text-sm text-gray-600">Local multiplayer</div>
            </button>
          </div>
        </div>

        {/* Side Selection (Computer mode only) */}
        {selectedMode === 'computer' && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Side</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedSide('white')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedSide === 'white'
                    ? 'border-amber-500 bg-amber-50 shadow-lg'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full mx-auto mb-2 border-2 border-gray-300"></div>
                <div className="font-semibold">White</div>
              </button>
              <button
                onClick={() => setSelectedSide('black')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedSide === 'black'
                    ? 'border-amber-500 bg-amber-50 shadow-lg'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="w-8 h-8 bg-gray-800 rounded-full mx-auto mb-2"></div>
                <div className="font-semibold">Black</div>
              </button>
            </div>
          </div>
        )}

        {/* AI Strength (Computer mode only) */}
        {selectedMode === 'computer' && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Strength</h2>
            <div className="grid grid-cols-3 gap-3">
              {AI_STRENGTHS.map((strength) => (
                <button
                  key={strength.level}
                  onClick={() => setSelectedAiStrength(strength.level)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                    selectedAiStrength === strength.level
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{strength.name}</div>
                  <div className="text-xs text-gray-600">Level {strength.level}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time Control */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Time Control
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.name}
                onClick={() => {
                  setSelectedTimeControl(tc);
                  setShowCustomTime(false);
                }}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  !showCustomTime && selectedTimeControl.name === tc.name
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="font-semibold text-sm">{tc.name}</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowCustomTime(!showCustomTime)}
            className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
              showCustomTime
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-amber-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Custom Time Control
          </button>

          {showCustomTime && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customTime.minutes}
                    onChange={(e) => setCustomTime(prev => ({ 
                      ...prev, 
                      minutes: parseInt(e.target.value) || 1 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Increment (sec)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={customTime.increment}
                    onChange={(e) => setCustomTime(prev => ({ 
                      ...prev, 
                      increment: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}