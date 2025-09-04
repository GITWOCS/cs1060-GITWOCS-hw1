import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../store/gameStore';
import { useStockfish } from '../hooks/useStockfish';
import { ChessTimer } from './ChessTimer';
import { EvaluationBar } from './EvaluationBar';
import { MoveList } from './MoveList';
import { GameStatus } from './GameStatus';
import { GameControls } from './GameControls';
import { PromotionDialog } from './PromotionDialog';

export function ChessGame() {
  const gameStore = useGameStore();
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionData, setPromotionData] = useState<{
    from: Square;
    to: Square;
    color: 'white' | 'black';
  } | null>(null);
  
  const gameRef = useRef(game);
  const lastMoveTime = useRef<number>(Date.now());

  // Stockfish integration
  const { findBestMove, analyzePosition, isReady } = useStockfish(
    (move) => {
      if (move && gameStore.mode === 'computer' && gameStore.gameStarted) {
        handleAiMove(move);
      }
      gameStore.setThinking(false);
    },
    (score, mate) => {
      gameStore.setEvaluation(score);
    },
    () => {
      console.log('Stockfish is ready');
    }
  );

  // Update game reference when game state changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Handle AI moves
  const handleAiMove = (moveString: string) => {
    try {
      const move = game.move(moveString);
      if (move) {
        setGame(new Chess(game.fen()));
        gameStore.setActiveColor(game.turn() === 'w' ? 'white' : 'black');
        addTimeIncrement();
        checkGameEnd();
        
        // Analyze new position
        setTimeout(() => analyzePosition(game.fen()), 100);
      }
    } catch (error) {
      console.error('Invalid AI move:', error);
    }
  };

  // Add time increment after move
  const addTimeIncrement = () => {
    const { increment } = gameStore.timeControl;
    if (increment > 0) {
      const currentTime = gameStore.activeColor === 'white' ? gameStore.whiteTime : gameStore.blackTime;
      gameStore.updateTime(gameStore.activeColor, currentTime + increment);
    }
  };

  // Check for game end conditions
  const checkGameEnd = () => {
    if (game.isGameOver()) {
      let winner: 'white' | 'black' | 'draw' = 'draw';
      let reason = '';

      if (game.isCheckmate()) {
        winner = game.turn() === 'w' ? 'black' : 'white';
        reason = 'checkmate';
      } else if (game.isStalemate()) {
        reason = 'stalemate';
      } else if (game.isThreefoldRepetition()) {
        reason = 'threefold repetition';
      } else if (game.isInsufficientMaterial()) {
        reason = 'insufficient material';
      } else if (game.isDraw()) {
        reason = '50-move rule';
      }

      gameStore.endGame({ winner: winner === 'draw' ? null : winner, reason });
    }
  };

  // Handle square click
  const handleSquareClick = (square: Square) => {
    if (!gameStore.gameStarted || gameStore.gameResult) return;

    // If it's computer mode and not player's turn, ignore clicks
    if (gameStore.mode === 'computer') {
      const isPlayerTurn = (gameStore.playerSide === 'white' && game.turn() === 'w') ||
                          (gameStore.playerSide === 'black' && game.turn() === 'b');
      if (!isPlayerTurn) return;
    }

    if (selectedSquare === square) {
      // Deselect if clicking the same square
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare && legalMoves.includes(square)) {
      // Attempt to make the move
      attemptMove(selectedSquare, square);
    } else {
      // Select new piece
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map(move => move.to));
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  // Attempt to make a move
  const attemptMove = (from: Square, to: Square) => {
    // Check if this is a promotion move
    const piece = game.get(from);
    const isPromotion = piece?.type === 'p' && 
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      setPromotionData({ from, to, color: piece.color === 'w' ? 'white' : 'black' });
      return;
    }

    makeMove(from, to);
  };

  // Make the actual move
  const makeMove = (from: Square, to: Square, promotion?: string) => {
    try {
      const move = game.move({ from, to, promotion });
      if (move) {
        setGame(new Chess(game.fen()));
        setSelectedSquare(null);
        setLegalMoves([]);
        
        const newActiveColor = game.turn() === 'w' ? 'white' : 'black';
        gameStore.setActiveColor(newActiveColor);
        
        addTimeIncrement();
        checkGameEnd();
        
        // If computer mode and it's AI's turn, request AI move
        if (gameStore.mode === 'computer' && !game.isGameOver()) {
          const isAiTurn = (gameStore.playerSide === 'white' && game.turn() === 'b') ||
                           (gameStore.playerSide === 'black' && game.turn() === 'w');
          
          if (isAiTurn) {
            gameStore.setThinking(true);
            const aiStrengthConfig = gameStore.aiStrength;
            const skillLevel = Math.min(20, aiStrengthConfig * 3);
            const thinkTime = 1000 + (aiStrengthConfig * 200);
            
            setTimeout(() => {
              findBestMove(game.fen(), skillLevel, 15, thinkTime);
            }, 300);
          }
        }
        
        // Analyze position for evaluation
        setTimeout(() => analyzePosition(game.fen()), 200);
      }
    } catch (error) {
      console.error('Invalid move:', error);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Handle promotion selection
  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionData) {
      makeMove(promotionData.from, promotionData.to, piece);
      setPromotionData(null);
    }
  };

  // Handle time up
  const handleTimeUp = (color: 'white' | 'black') => {
    const winner = color === 'white' ? 'black' : 'white';
    gameStore.endGame({ winner, reason: 'time forfeit' });
  };

  // Export functions
  const handleCopyPgn = () => {
    navigator.clipboard.writeText(game.pgn());
  };

  const handleDownloadPgn = () => {
    const pgn = game.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${new Date().toISOString().split('T')[0]}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(game.fen());
  };

  const handleUndo = () => {
    if (game.history().length > 0) {
      game.undo();
      setGame(new Chess(game.fen()));
      setSelectedSquare(null);
      setLegalMoves([]);
      gameStore.setActiveColor(game.turn() === 'w' ? 'white' : 'black');
    }
  };

  // Custom square styles for highlighting
  const getSquareStyles = () => {
    const styles: { [square: string]: React.CSSProperties } = {};
    
    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      };
    }
    
    // Highlight legal moves
    legalMoves.forEach(square => {
      styles[square] = {
        backgroundColor: 'rgba(0, 255, 0, 0.3)',
        borderRadius: '50%',
      };
    });
    
    // Highlight king in check
    if (game.inCheck()) {
      const kingSquare = game.board().flat().find(
        piece => piece && piece.type === 'k' && piece.color === game.turn()
      )?.square;
      
      if (kingSquare) {
        styles[kingSquare] = {
          backgroundColor: 'rgba(255, 0, 0, 0.5)',
        };
      }
    }
    
    return styles;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Evaluation Bar */}
        <EvaluationBar score={gameStore.evaluationScore} />
        
        {/* Game Status */}
        <GameStatus
          isGameActive={gameStore.gameStarted}
          activeColor={gameStore.activeColor}
          isInCheck={game.inCheck()}
          gameResult={gameStore.gameResult}
          isThinking={gameStore.isThinking}
        />
        
        {/* Timers */}
        <ChessTimer
          whiteTime={gameStore.whiteTime}
          blackTime={gameStore.blackTime}
          activeColor={gameStore.activeColor}
          isGameActive={gameStore.gameStarted && !gameStore.gameResult}
          onTimeUp={handleTimeUp}
          onTimeUpdate={(color, time) => gameStore.updateTime(color, time)}
          increment={gameStore.timeControl.increment}
        />

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <Chessboard
                position={game.fen()}
                onSquareClick={handleSquareClick}
                arePiecesDraggable={true}
                boardOrientation={gameStore.boardFlipped ? 'black' : 'white'}
                customSquareStyles={getSquareStyles()}
                customBoardStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
                customDarkSquareStyle={{
                  backgroundColor: '#D2691E',
                }}
                customLightSquareStyle={{
                  backgroundColor: '#F5DEB3',
                }}
              />
            </div>
          </div>

          {/* Move List and Controls */}
          <div className="space-y-4">
            <MoveList
              game={game}
              onCopyPgn={handleCopyPgn}
              onDownloadPgn={handleDownloadPgn}
              onCopyFen={handleCopyFen}
              onUndo={handleUndo}
              allowUndo={gameStore.mode === 'human' && !gameStore.gameResult}
            />
          </div>
        </div>

        {/* Game Controls */}
        <div className="mt-6">
          <GameControls
            onNewGame={() => {
              setGame(new Chess());
              gameStore.resetGame();
              setSelectedSquare(null);
              setLegalMoves([]);
            }}
            onFlipBoard={gameStore.flipBoard}
            onToggleSound={gameStore.toggleSound}
            soundEnabled={gameStore.soundEnabled}
            onUndo={handleUndo}
            allowUndo={gameStore.mode === 'human' && !gameStore.gameResult}
          />
        </div>

        {/* Promotion Dialog */}
        <PromotionDialog
          isOpen={!!promotionData}
          onSelect={handlePromotion}
          color={promotionData?.color || 'white'}
        />
      </div>
    </div>
  );
}