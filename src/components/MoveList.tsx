import React from 'react';
import { Download, Copy, FileText, RotateCcw, Camera } from 'lucide-react';

interface MoveListProps {
  historySan?: string[]; // Optional SAN array for deterministic updates
  onCopyPgn: () => void;
  onDownloadPgn: () => void;
  onCopyFen: () => void;
  onSavePng?: () => void;
  onUndo?: () => void;
  allowUndo?: boolean;
}

export function MoveList({ 
  historySan,
  onCopyPgn, 
  onDownloadPgn, 
  onCopyFen, 
  onSavePng,
  onUndo,
  allowUndo = false 
}: MoveListProps) {
  const moves = React.useMemo(() => {
    const pairedMoves: Array<{ white?: string; black?: string; number: number }> = [];
    const sanHistory = historySan || [];

    for (let i = 0; i < sanHistory.length; i += 2) {
      pairedMoves.push({
        number: Math.floor(i / 2) + 1,
        white: sanHistory[i],
        black: sanHistory[i + 1],
      });
    }
    return pairedMoves;
  }, [historySan]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Move History
        </h3>
        <div className="text-sm text-gray-600">
          {moves.length} moves
        </div>
      </div>

      {/* Move list */}
      <div className="max-h-96 overflow-y-auto mb-6 border rounded-lg bg-gray-50">
        {moves.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No moves yet</p>
            <p className="text-xs">Moves will appear here as you play</p>
          </div>
        ) : (
          <div className="space-y-1 p-3">
            {moves.map((move) => (
              <div key={move.number} className="flex items-center text-sm hover:bg-white hover:shadow-sm rounded px-2 py-1 transition-colors">
                <span className="w-8 text-gray-600 font-medium">{move.number}.</span>
                <span className="w-16 font-mono">{move.white || ''}</span>
                <span className="w-16 font-mono text-gray-700">{move.black || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCopyPgn}
            className="flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy PGN
          </button>
          <button
            onClick={onDownloadPgn}
            className="flex items-center justify-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
        
        <button
          onClick={onCopyFen}
          className="w-full flex items-center justify-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 text-sm"
        >
          <FileText className="w-4 h-4 mr-2" />
          Copy FEN
        </button>

        {onSavePng && (
          <button
            onClick={onSavePng}
            className="w-full flex items-center justify-center px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <Camera className="w-4 h-4 mr-2" />
            Save Board as PNG
          </button>
        )}

        {allowUndo && onUndo && (
          <button
            onClick={onUndo}
            className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Undo Move
          </button>
        )}
      </div>
    </div>
  );
}