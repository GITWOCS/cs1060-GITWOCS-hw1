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
  // Dummy state to force re-render after AI timer update
  const [aiTimerTick, setAiTimerTick] = useState(0);
  const gameStore = useGameStore();
  const [game, setGame] = useState(new Chess());
  const [historySan, setHistorySan] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionData, setPromotionData] = useState<{
    from: Square;
    to: Square;
    color: 'white' | 'black';
  } | null>(null);
  
  const gameRef = useRef(game);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const aiThinkStartTimeRef = useRef<number>(0);

  // Helper: clone current game while preserving full move history
  const cloneWithHistory = useCallback((g: Chess): Chess => {
    const newGame = new Chess();
    const history = g.history({ verbose: true });
    for (const move of history) {
      newGame.move({ from: move.from, to: move.to, promotion: move.promotion });
    }
    return newGame;
  }, []);

  const updateHistory = useCallback((gameInstance: Chess) => {
    setHistorySan(gameInstance.history());
  }, []);

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
      // Update evaluation with less dampening for more responsive feedback
      const currentEval = gameStore.evaluationScore;
      const threshold = 0.05; // Smaller threshold for more frequent updates
      if (Math.abs(score - currentEval) > threshold) {
        gameStore.setEvaluation(score);
      }
    },
    () => {
      console.log('AI is ready');
      if (gameStore.gameStarted && gameStore.mode === 'computer') {
        requestAiMove();
      }
    }
  );

  // Global multiplier to slow down or speed up AI thinking across all levels
  // Make AI much slower at beginner levels to simulate human thinking
  const AI_THINK_MULTIPLIER = gameStore.aiStrength <= 3 ? 15 : gameStore.aiStrength <= 5 ? 8 : 4;

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

    // Record AI thinking start time and set active color
    const aiColor = game.turn() === 'w' ? 'white' : 'black';
    aiThinkStartTimeRef.current = Date.now();
    gameStore.setActiveColor(aiColor);
    gameStore.setThinking(true);
    // Map menu AI level (1..10) to engine skill level (0..20)
    const menuLevel = Math.max(1, Math.min(10, gameStore.aiStrength));
    const engineSkill = Math.round((menuLevel - 1) * (20 / 9));
    
    // Calculate thinking time based on level:
    // - Add more variability based on difficulty level
    // - Lower levels (easier) think longer to simulate human thinking
    // - Exponential scaling to make difference more pronounced
    
    // Base thinking time is higher for lower levels (slower thinking)
    const levelFactor = Math.pow(12 - menuLevel, 1.5);
    
    // Add some randomness to make AI seem more human-like (±20%)
    const randomFactor = 0.8 + (Math.random() * 0.4);
    
    // Base per-move time in ms before scaling
    const baseMs = 3000; // 3 seconds baseline minimum
    const thinkTime = Math.max(3000, baseMs * AI_THINK_MULTIPLIER * levelFactor * randomFactor);

    // Get remaining times in milliseconds
    const wtimeMs = Math.max(0, gameStore.whiteTime * 1000);
    const btimeMs = Math.max(0, gameStore.blackTime * 1000);
    const incMs = Math.max(0, (gameStore.timeControl.increment || 0) * 1000);
    
    // Log time info for debugging
    console.log(`AI thinking time: ${thinkTime}ms, White: ${wtimeMs}ms, Black: ${btimeMs}ms, Inc: ${incMs}ms`);

    setTimeout(() => {
      findBestMove(
        game.fen(),
        engineSkill,
        20, // Increased depth for better analysis
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
        const newGame = cloneWithHistory(game);
        setGame(newGame);
        updateHistory(newGame);

        // Always update AI timer based on actual thinking time
        const aiColor = gameStore.playerSide === 'white' ? 'black' : 'white';
        const currentTime = aiColor === 'white' ? gameStore.whiteTime : gameStore.blackTime;
        const elapsedMs = Date.now() - aiThinkStartTimeRef.current;
        const elapsedSeconds = Math.ceil(elapsedMs / 1000);
        const newTime = Math.max(0, currentTime - elapsedSeconds);

        gameStore.updateTime(aiColor, newTime);
        setAiTimerTick(t => t + 1); // Force re-render so timer display updates

        // Only proceed with the rest if the AI hasn't lost on time
        if (newTime > 0) {
          gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
          // Add increment after a short delay to ensure time update is processed
          setTimeout(() => {
            const increment = gameStore.timeControl.increment || 0;
            if (increment > 0) {
              const currentTimeAfterMove = aiColor === 'white' ? gameStore.whiteTime : gameStore.blackTime;
              gameStore.updateTime(aiColor, currentTimeAfterMove + increment);
            }
          }, 50);
          checkGameEnd(newGame);
          setTimeout(() => analyzePosition(newGame.fen()), 100);
        }
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
  const makeMove = (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
    try {
      const move = game.move({ from, to, promotion });
      if (move) {
        const newGame = cloneWithHistory(game);
        setGame(newGame);
        updateHistory(newGame);
        setSelectedSquare(null);
        setLegalMoves([]);
        gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
        // Add increment to the mover (opposite of side to move now)
        const mover: 'white' | 'black' = newGame.turn() === 'w' ? 'black' : 'white';
        addTimeIncrementFor(mover);
        // Check for game end conditions and always set result
        if (newGame.isGameOver()) {
          let winner: 'white' | 'black' | null = null;
          let reason = '';
          if (newGame.isCheckmate()) {
            winner = newGame.turn() === 'w' ? 'black' : 'white';
            reason = 'checkmate';
          } else if (newGame.isStalemate()) {
            reason = 'stalemate';
          } else if (newGame.isThreefoldRepetition()) {
            reason = 'threefold repetition';
          } else if (newGame.isInsufficientMaterial()) {
            reason = 'insufficient material';
          } else if (newGame.isDraw()) {
            reason = '50-move rule';
          }
          gameStore.endGame({ winner, reason });
        }
        // If against computer and it's now AI's turn, always request AI move
        const aiShouldMove = (
          gameStore.mode === 'computer' &&
          (
            (gameStore.playerSide === 'white' && newGame.turn() === 'b') ||
            (gameStore.playerSide === 'black' && newGame.turn() === 'w')
          ) &&
          !newGame.isGameOver()
        );
        if (aiShouldMove) {
          setTimeout(() => requestAiMove(), 300);
        }
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

  // Save the board area as PNG by serializing the inner SVG to a canvas
  const handleSaveBoardPng = useCallback(async () => {
    try {
      const container = boardContainerRef.current;
      if (!container) return;
      // Try to find an SVG within the chessboard
      const svgEl = container.querySelector('svg');
      if (!svgEl) {
        alert('SVG not found in board; PNG export unavailable');
        return;
      }
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const rect = svgEl.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      // Wait for SVG to be fully loaded before drawing
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          alert('Canvas context not available');
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `chess-board-${new Date().toISOString().split('T')[0]}.png`;
        a.click();
      };
      img.onerror = () => {
        alert('Failed to load SVG image for PNG export.');
      };
      img.src = url;
    } catch (e) {
      alert('PNG export failed: ' + e);
    }
  }, []);

  // Start a fresh game with the same mode/side/time settings
  const startNewGameSameSettings = useCallback(() => {
    const currentMode = gameStore.mode;
    const currentSide = gameStore.playerSide;
    const currentTime = gameStore.timeControl;
    setGame(new Chess());
    setHistorySan([]);
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
      const newGame = cloneWithHistory(game);
      setGame(newGame);
      updateHistory(newGame);
      setSelectedSquare(null);
      setLegalMoves([]);
      gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
      // If the game had ended, clear result to allow continuing after undo
      if (gameStore.gameResult) {
        gameStore.startGame();
      }
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
      // Start with neutral evaluation (50-50)
      gameStore.setEvaluation(0);
      // Use more depth for analysis to get stable evaluations
      setTimeout(() => analyzePosition(game.fen()), 100);
      
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
        <ChessTimer />

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-2xl p-6" ref={boardContainerRef}>
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
              historySan={historySan}
              onCopyPgn={handleCopyPgn}
              onDownloadPgn={handleDownloadPgn}
              onCopyFen={handleCopyFen}
              onSavePng={handleSaveBoardPng}
              onUndo={handleUndo}
              allowUndo={!gameStore.gameResult}
            />
          </div>
        </div>

        {/* Game Controls */}
        <div className="mt-6 flex flex-col gap-3">
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
          {/* Forfeit Button */}
          {gameStore.gameStarted && !gameStore.gameResult && (
            <button
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200"
              onClick={() => {
                // Forfeit: declare opponent as winner
                const winner = isPlayerTurn() ? (gameStore.playerSide === 'white' ? 'black' : 'white') : gameStore.playerSide;
                gameStore.endGame({ winner, reason: 'forfeit' });
              }}
            >
              Forfeit
            </button>
          )}
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