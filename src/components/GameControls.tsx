import { RotateCcw, RotateCw as RotateClockwise, Home } from 'lucide-react';

interface GameControlsProps {
  onNewGame: () => void;
  onFlipBoard: () => void;
  onUndo?: () => void;
  allowUndo?: boolean;
}

export function GameControls({
  onNewGame,
  onFlipBoard,
  onUndo,
  allowUndo = false
}: GameControlsProps) {
  return (
    <div className="flex items-center justify-center space-x-3 mb-4">
      <button
        onClick={onNewGame}
        className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
      >
        <Home className="w-4 h-4 mr-2" />
        New Game
      </button>
      
      <button
        onClick={onFlipBoard}
        className="flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
      >
        <RotateClockwise className="w-4 h-4 mr-2" />
        Flip
      </button>
      
      {allowUndo && onUndo && (
        <button
          onClick={onUndo}
          className="flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Undo
        </button>
      )}
      
    </div>
  );
}