import { useState } from 'react';
import { Clock, Cpu, Users, Settings } from 'lucide-react';
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
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-6xl border border-amber-500/50">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl text-white">♞</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2 font-serif">Le Chess Master</h1>
          <p className="text-stone-600">Configure your game and start playing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            {/* Game Mode Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-stone-700 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-stone-600" />
                Game Mode
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedMode('computer')}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    selectedMode === 'computer'
                      ? 'border-stone-600 bg-stone-100 shadow-lg scale-105'
                      : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                  }`}
                >
                  <Cpu className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <div className="font-semibold text-stone-800">vs Computer</div>
                  <div className="text-sm text-stone-600">Play against AI</div>
                </button>
                <button
                  onClick={() => setSelectedMode('human')}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    selectedMode === 'human'
                      ? 'border-stone-600 bg-stone-100 shadow-lg scale-105'
                      : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                  }`}
                >
                  <Users className="w-8 h-8 mx-auto mb-3 text-stone-700" />
                  <div className="font-semibold text-stone-800">vs Human</div>
                  <div className="text-sm text-stone-600">Local multiplayer</div>
                </button>
              </div>
            </div>

            {/* Side Selection (Computer mode only) */}
            {selectedMode === 'computer' && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-stone-700 mb-4">Your Side</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedSide('white')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedSide === 'white'
                        ? 'border-stone-600 bg-stone-100 shadow-lg'
                        : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-2 border-2 border-stone-300"></div>
                    <div className="font-semibold text-stone-800">White</div>
                  </button>
                  <button
                    onClick={() => setSelectedSide('black')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedSide === 'black'
                        ? 'border-stone-600 bg-stone-100 shadow-lg'
                        : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-gray-800 rounded-full mx-auto mb-2 border-2 border-gray-800"></div>
                    <div className="font-semibold text-stone-800">Black</div>
                  </button>
                </div>
              </div>
            )}

            {/* AI Strength (Computer mode only) */}
            {selectedMode === 'computer' && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-stone-700 mb-4">AI Strength</h2>
                <div className="grid grid-cols-3 gap-3">
                  {AI_STRENGTHS.map((strength) => (
                    <button
                      key={strength.level}
                      onClick={() => setSelectedAiStrength(strength.level)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                        selectedAiStrength === strength.level
                          ? 'border-stone-600 bg-stone-100'
                          : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="font-semibold text-sm text-stone-800">{strength.name}</div>
                      <div className="text-xs text-stone-600">Level {strength.level}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>

            {/* Time Control */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-stone-700 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-stone-600" />
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
                        ? 'border-stone-600 bg-stone-100'
                        : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="font-semibold text-sm text-stone-800">{tc.name}</div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowCustomTime(!showCustomTime)}
                className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                  showCustomTime
                    ? 'border-stone-600 bg-stone-100'
                    : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2 text-stone-600" />
                <span className="text-stone-700">Custom Time Control</span>
              </button>

              {showCustomTime && (
                <div className="mt-4 p-4 bg-stone-100 rounded-lg border border-stone-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
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
                        className="w-full px-3 py-2 border border-stone-400 bg-white text-stone-900 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
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
                        className="w-full px-3 py-2 border border-stone-400 bg-white text-stone-900 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start Game Button */}
        <div className="max-w-md mx-auto mt-8">
          <button
            onClick={handleStartGame}
            className="w-full bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-700 hover:to-amber-900 text-amber-100 font-bold py-6 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg border border-amber-600/50 text-xl"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}