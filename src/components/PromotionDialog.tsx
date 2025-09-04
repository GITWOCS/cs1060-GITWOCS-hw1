import React from 'react';

interface PromotionDialogProps {
  isOpen: boolean;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  color: 'white' | 'black';
}

export function PromotionDialog({ isOpen, onSelect, color }: PromotionDialogProps) {
  if (!isOpen) return null;

  const pieces = [
    { type: 'q', name: 'Queen', symbol: color === 'white' ? '♕' : '♛' },
    { type: 'r', name: 'Rook', symbol: color === 'white' ? '♖' : '♜' },
    { type: 'b', name: 'Bishop', symbol: color === 'white' ? '♗' : '♝' },
    { type: 'n', name: 'Knight', symbol: color === 'white' ? '♘' : '♞' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
          Choose Promotion Piece
        </h3>
        <p className="text-gray-600 text-center mb-6">
          Select the piece you want to promote your pawn to:
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          {pieces.map((piece) => (
            <button
              key={piece.type}
              onClick={() => onSelect(piece.type)}
              className="p-6 border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              <div className="text-4xl mb-2 text-center">{piece.symbol}</div>
              <div className="text-sm font-semibold text-gray-800 text-center">
                {piece.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}