import { Home } from 'lucide-react';

interface GameControlsProps {
  onNewGame: () => void;
}

export function GameControls({
  onNewGame
}: GameControlsProps) {
  return (
    <div className="w-full mb-4">
      <button
        onClick={onNewGame}
        className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
      >
        <Home className="w-4 h-4 mr-2" />
        New Game
      </button>
    </div>
  );
}