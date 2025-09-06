import React from 'react';
import { FileText } from 'lucide-react';

interface MoveListProps {
  historySan?: string[]; // Optional SAN array for deterministic updates
  compactView?: boolean;
}

export function MoveList({ 
  historySan,
  compactView = false
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
    <div className="bg-white rounded-xl p-4 flex flex-col" style={{ maxHeight: compactView ? '250px' : '350px' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`${compactView ? 'text-sm' : 'text-lg'} font-bold text-gray-800 flex items-center`}>
          <FileText className={`${compactView ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
          Move History
        </h3>
        <div className="text-xs text-gray-600">
          {moves.length} moves
        </div>
      </div>

      {/* Move list */}
      <div className="overflow-y-auto mb-2 border rounded-lg bg-gray-50 flex-grow">
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
    </div>
  );
}