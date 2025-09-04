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

  // Stockfish integration
  const { findBestMove, analyzePosition, isReady } = useStockfish(
    (move) => {
      if (move && gameStore.mode === 'computer' && gameStore.gameStarted && !gameStore.gameResult) {
        const isAiTurn = (gameStore.playerSide === 'white' && game.turn() === 'b') ||
                         (gameStore.playerSide === 'black' && game.turn() === 'w');
        if (isAiTurn) {
          handleAiMove(move);
        }
      }
      gameStore.setThinking(false);
    },
    (score) => {
      gameStore.setEvaluation(score);
    },
    () => {
      console.log('AI is ready');
      if (gameStore.gameStarted && gameStore.mode === 'computer') {
        requestAiMove();
      }
    }
  );

  // Global multiplier to slow down or speed up AI thinking across all levels
  // Increase to make AI think longer overall (e.g., 10 makes it ~10x slower)
  const AI_THINK_MULTIPLIER = 10;

  // Update game reference when game state changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Request AI move
  const requestAiMove = useCallback(() => {
    if (!isReady || gameStore.isThinking || gameStore.gameResult) return;
    if (gameStore.mode !== 'computer') return;
    const isAiTurn = (gameStore.playerSide === 'white' && game.turn() === 'b') ||
                     (gameStore.playerSide === 'black' && game.turn() === 'w');
    if (!isAiTurn) return;

    // Ensure the timer runs for the side to move (AI) during thinking
    gameStore.setActiveColor(game.turn() === 'w' ? 'white' : 'black');
    gameStore.setThinking(true);
    // Map menu AI level (1..10) to engine skill level (0..20)
    const menuLevel = Math.max(1, Math.min(10, gameStore.aiStrength));
    const engineSkill = Math.round((menuLevel - 1) * (20 / 9));
    // Easier levels (lower) think slower intentionally:
    // factor = (11 - menuLevel): level 1 => 10x, level 10 => 1x
    const levelFactor = 11 - menuLevel;
    // Base per-move time in ms before scaling
    const baseMs = 1000; // 1 second baseline
    const thinkTime = baseMs * AI_THINK_MULTIPLIER * levelFactor;

    // Provide engine with the real remaining time and increments (ms)
    const wtimeMs = Math.max(0, gameStore.whiteTime * 1000);
    const btimeMs = Math.max(0, gameStore.blackTime * 1000);
    const incMs = Math.max(0, (gameStore.timeControl.increment || 0) * 1000);

    setTimeout(() => {
      findBestMove(
        game.fen(),
        engineSkill,
        10,
        thinkTime,
        wtimeMs,
        btimeMs,
        incMs,
        incMs
      );
    }, 200);
  }, [isReady, gameStore.isThinking, gameStore.gameResult, gameStore.aiStrength, game, findBestMove, gameStore.mode, gameStore.playerSide]);

  // Handle AI moves
  const handleAiMove = (moveString: string) => {
    try {
      // Convert UCI format (e2e4) to move object
      const from = moveString.slice(0, 2) as Square;
      const to = moveString.slice(2, 4) as Square;
      const promotion = moveString.slice(4) || undefined;
      
      const move = game.move({ from, to, promotion });
      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
        // The mover is the opposite of the new active color
        const mover: 'white' | 'black' = newGame.turn() === 'w' ? 'black' : 'white';
        addTimeIncrementFor(mover);
        checkGameEnd(newGame);
        
        // Analyze new position
        setTimeout(() => analyzePosition(newGame.fen()), 100);
      }
    } catch (error) {
      console.error('Invalid AI move:', error);
      gameStore.setThinking(false);
    }
  };

  // Add time increment to the player who just moved
  const addTimeIncrementFor = (mover: 'white' | 'black') => {
    const { increment } = gameStore.timeControl;
    if (increment > 0) {
      const currentTime = mover === 'white' ? gameStore.whiteTime : gameStore.blackTime;
      gameStore.updateTime(mover, currentTime + increment);
    }
  };

  // Check for game end conditions
  const checkGameEnd = (currentGame: Chess) => {
    if (currentGame.isGameOver()) {
      let winner: 'white' | 'black' | null = null;
      let reason = '';

      if (currentGame.isCheckmate()) {
        winner = currentGame.turn() === 'w' ? 'black' : 'white';
        reason = 'checkmate';
      } else if (currentGame.isStalemate()) {
        reason = 'stalemate';
      } else if (currentGame.isThreefoldRepetition()) {
        reason = 'threefold repetition';
      } else if (currentGame.isInsufficientMaterial()) {
        reason = 'insufficient material';
      } else if (currentGame.isDraw()) {
        reason = '50-move rule';
      }

      gameStore.endGame({ winner, reason });
    }
  };

  // Handle piece drop (drag and drop) - STRICT VALIDATION
  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    // Prevent any moves if game is not active
    if (!gameStore.gameStarted || gameStore.gameResult) {
      return false;
    }
    
    // In computer mode, strictly enforce turn order
    if (gameStore.mode === 'computer') {
      const isPlayerTurn = (gameStore.playerSide === 'white' && game.turn() === 'w') ||
                          (gameStore.playerSide === 'black' && game.turn() === 'b');
      if (!isPlayerTurn || gameStore.isThinking) {
        return false;
      }
    }

    // Validate the move using chess.js
    try {
      const testGame = new Chess(game.fen());
      const piece = testGame.get(sourceSquare);
      
      // Check if piece belongs to current player
      if (!piece || piece.color !== testGame.turn()) {
        return false;
      }
      
      // Check if this is a promotion move
      const isPromotion = piece.type === 'p' && 
        ((piece.color === 'w' && targetSquare[1] === '8') || (piece.color === 'b' && targetSquare[1] === '1'));

      if (isPromotion) {
        // Test if the promotion move is legal
        const testMove = testGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (testMove) {
          setPromotionData({ from: sourceSquare, to: targetSquare, color: piece.color === 'w' ? 'white' : 'black' });
        }
        return false; // Don't make the move yet, wait for promotion choice
      }

      // Test if the move is legal
      const testMove = testGame.move({ from: sourceSquare, to: targetSquare });
      if (testMove) {
        return makeMove(sourceSquare, targetSquare);
      }
    } catch (error) {
      console.error('Move validation error:', error);
    }
    
    return false; // Move is illegal
  };

  // Handle square click - STRICT VALIDATION
  const handleSquareClick = (square: Square) => {
    if (!gameStore.gameStarted || gameStore.gameResult) return;

    // In computer mode, strictly enforce turn order
    if (gameStore.mode === 'computer') {
      const isPlayerTurn = (gameStore.playerSide === 'white' && game.turn() === 'w') ||
                          (gameStore.playerSide === 'black' && game.turn() === 'b');
      if (!isPlayerTurn || gameStore.isThinking) return;
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
      // Select new piece - only allow selecting current player's pieces
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
    // Validate move using chess.js
    try {
      const testGame = new Chess(game.fen());
      const piece = testGame.get(from);
      
      if (!piece || piece.color !== testGame.turn()) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      
      // Check if this is a promotion move
      const isPromotion = piece.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPromotion) {
        // Test if the promotion move is legal
        const testMove = testGame.move({ from, to, promotion: 'q' });
        if (testMove) {
          setPromotionData({ from, to, color: piece.color === 'w' ? 'white' : 'black' });
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
        return;
      }

      makeMove(from, to);
    } catch (error) {
      console.error('Move attempt error:', error);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Make the actual move - ONLY if legal
  const makeMove = (from: Square, to: Square, promotion?: string): boolean => {
    try {
      const move = game.move({ from, to, promotion });
      if (move) {
        const newGame = new Chess(game.fen());
        // Update local game state
        setGame(newGame);
        setSelectedSquare(null);
        setLegalMoves([]);
        // Update active color in store
        gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
        // Award increment to the player who just moved
        const mover: 'white' | 'black' = newGame.turn() === 'w' ? 'black' : 'white';
        addTimeIncrementFor(mover);
        // Check for game end conditions
        checkGameEnd(newGame);
        // If against computer and it's now AI's turn, request AI move
        const aiShouldMove = (
          gameStore.mode === 'computer' &&
          (
            (gameStore.playerSide === 'white' && newGame.turn() === 'b') ||
            (gameStore.playerSide === 'black' && newGame.turn() === 'w')
          ) &&
          !gameStore.gameResult
        );
        if (aiShouldMove) {
          setTimeout(() => requestAiMove(), 300);
        }
        // Analyze position for evaluation
        setTimeout(() => analyzePosition(newGame.fen()), 200);
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
    return false;
  };

  // Handle promotion selection
  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionData) {
      makeMove(promotionData.from, promotionData.to, piece);
      setPromotionData(null);
    }
  };

  // Handle time up (memoized to avoid timer interval resets)
  const handleTimeUp = useCallback((color: 'white' | 'black') => {
    const winner = color === 'white' ? 'black' : 'white';
    gameStore.endGame({ winner, reason: 'time forfeit' });
  }, [gameStore]);

  // Stable onTimeUpdate to prevent resetting interval every render
  const handleTimeUpdate = useCallback((color: 'white' | 'black', time: number) => {
    gameStore.updateTime(color, time);
  }, [gameStore]);

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

  // Start a fresh game with the same mode/side/time settings
  const startNewGameSameSettings = useCallback(() => {
    const currentMode = gameStore.mode;
    const currentSide = gameStore.playerSide;
    const currentTime = gameStore.timeControl;
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalMoves([]);
    gameStore.setGameMode(currentMode);
    gameStore.setPlayerSide(currentSide);
    gameStore.setTimeControl(currentTime);
    gameStore.setActiveColor('white');
    gameStore.setEvaluation(0);
    gameStore.startGame();
    // If AI should move first
    if (currentMode === 'computer' && currentSide === 'black') {
      setTimeout(() => requestAiMove(), 400);
    }
    setTimeout(() => analyzePosition(new Chess().fen()), 100);
  }, [gameStore, analyzePosition, requestAiMove]);

  const handleUndo = () => {
    if (game.history().length > 0) {
      game.undo();
      const newGame = new Chess(game.fen());
      setGame(newGame);
      setSelectedSquare(null);
      setLegalMoves([]);
      gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
      analyzePosition(newGame.fen());
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

  // Initialize evaluation and AI on game start
  useEffect(() => {
    if (gameStore.gameStarted && isReady) {
      analyzePosition(game.fen());
      
      // If AI should move first (player chose black), request AI move
      if (gameStore.mode === 'computer' && gameStore.playerSide === 'black') {
        setTimeout(() => requestAiMove(), 500);
      }
    }
  }, [gameStore.gameStarted, isReady]);

  // Check if it's player's turn (for computer mode)
  const isPlayerTurn = () => {
    if (gameStore.mode === 'human') return true;
    return (gameStore.playerSide === 'white' && game.turn() === 'w') ||
           (gameStore.playerSide === 'black' && game.turn() === 'b');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Evaluation Bar */}
        <EvaluationBar score={gameStore.evaluationScore} />
        
        {/* Game Status */}
        <GameStatus
          isGameActive={gameStore.gameStarted && !gameStore.gameResult}
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
          onTimeUpdate={handleTimeUpdate}
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
                onPieceDrop={onDrop}
                arePiecesDraggable={gameStore.gameStarted && !gameStore.gameResult && isPlayerTurn()}
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

        {/* Game Result Modal */}
        {gameStore.gameResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center transform animate-slideUp">
              <div className="mb-6">
                {gameStore.gameResult.winner === 'white' && (
                  <div className="text-6xl mb-4 animate-bounce">👑</div>
                )}
                {gameStore.gameResult.winner === 'black' && (
                  <div className="text-6xl mb-4 animate-bounce">♛</div>
                )}
                {gameStore.gameResult.winner === null && (
                  <div className="text-6xl mb-4 animate-pulse">🤝</div>
                )}
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {gameStore.gameResult.winner === 'white' && 'White Wins!'}
                  {gameStore.gameResult.winner === 'black' && 'Black Wins!'}
                  {gameStore.gameResult.winner === null && 'Draw!'}
                </h2>
                
                <p className="text-gray-600 capitalize">
                  {gameStore.gameResult.reason}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={startNewGameSameSettings}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Play Again
                </button>
                <button
                  onClick={() => {
                    setGame(new Chess());
                    gameStore.resetGame();
                    setSelectedSquare(null);
                    setLegalMoves([]);
                  }}
                  className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}