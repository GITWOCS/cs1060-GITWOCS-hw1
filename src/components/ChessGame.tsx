import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../store/gameStore';
import { evaluatePosition } from '../utils/evaluation';
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
  const [isAiThinking, setIsAiThinking] = useState(false);
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

  // Check for game end conditions
  const checkGameEnd = useCallback((currentGame: Chess) => {
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
  }, [gameStore]);


  // Simple AI that picks random legal moves with some basic strategy
  const makeAiMove = useCallback(() => {
    if (!gameStore.gameStarted || gameStore.gameResult || game.isGameOver()) {
      return;
    }

    const isAiTurn = (gameStore.playerSide === 'white' && game.turn() === 'b') ||
                     (gameStore.playerSide === 'black' && game.turn() === 'w');
    
    if (!isAiTurn) return;
    
    // Start AI thinking and set active color to AI's side (so timer runs for AI)
    setIsAiThinking(true);
    gameStore.setThinking(true);
    gameStore.setActiveColor(game.turn() === 'w' ? 'white' : 'black');
    
    // Store current time to calculate elapsed time at the end
    aiThinkStartTimeRef.current = Date.now();
    
    // Calculate AI thinking time based on difficulty
    const baseTime = 1000; // 1 second base
    const levelMultiplier = (11 - gameStore.aiStrength) * 200; // Easier = slower
    const thinkTime = baseTime + levelMultiplier + (Math.random() * 1000);
    
    setTimeout(() => {
      try {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) {
          setIsAiThinking(false);
          gameStore.setThinking(false);
          return;
        }

        let selectedMove;
        
        // AI strategy based on difficulty level
        if (gameStore.aiStrength <= 3) {
          // Easy: Random moves
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        } else if (gameStore.aiStrength <= 6) {
          // Medium: Prefer captures and checks
          const captures = moves.filter(move => move.captured);
          const checks = moves.filter(move => {
            const testGame = new Chess(game.fen());
            testGame.move(move);
            return testGame.inCheck();
          });
          
          if (captures.length > 0 && Math.random() < 0.7) {
            selectedMove = captures[Math.floor(Math.random() * captures.length)];
          } else if (checks.length > 0 && Math.random() < 0.5) {
            selectedMove = checks[Math.floor(Math.random() * checks.length)];
          } else {
            selectedMove = moves[Math.floor(Math.random() * moves.length)];
          }
        } else {
          // Hard: Evaluate moves and pick best ones
          let bestMoves: any[] = [];
          let bestScore = gameStore.playerSide === 'white' ? Infinity : -Infinity;
          
          for (const move of moves) {
            const testGame = new Chess(game.fen());
            testGame.move(move);
            const score = evaluatePosition(testGame);
            
            if (gameStore.playerSide === 'white') {
              // AI is black, wants lower scores
              if (score < bestScore) {
                bestScore = score;
                bestMoves = [move];
              } else if (score === bestScore) {
                bestMoves.push(move);
              }
            } else {
              // AI is white, wants higher scores
              if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
              } else if (score === bestScore) {
                bestMoves.push(move);
              }
            }
          }
          
          selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        // Make the AI move
        const move = game.move(selectedMove);
        if (move) {
          const newGame = cloneWithHistory(game);
          setGame(newGame);
          updateHistory(newGame);
          
          // Update evaluation
          const evaluation = evaluatePosition(newGame);
          gameStore.setEvaluation(evaluation);
          
          // Add time increment after move is completed
          const aiColor = gameStore.playerSide === 'white' ? 'black' : 'white';
          const increment = gameStore.timeControl.increment || 0;
          
          if (increment > 0) {
            const currentTime = aiColor === 'white' ? gameStore.whiteTime : gameStore.blackTime;
            if (currentTime > 0) { // Only add increment if player hasn't lost on time
              gameStore.updateTime(aiColor, currentTime + increment);
            }
          }
          
          gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
          checkGameEnd(newGame);
        }
      } catch (error) {
        console.error('AI move error:', error);
      } finally {
        setIsAiThinking(false);
        gameStore.setThinking(false);
      }
    }, thinkTime);
  }, [game, gameStore, cloneWithHistory, updateHistory, checkGameEnd]);

  // Update game reference when game state changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Add time increment to the player who just moved
  const addTimeIncrementFor = (mover: 'white' | 'black') => {
    const { increment } = gameStore.timeControl;
    if (increment > 0) {
      const currentTime = mover === 'white' ? gameStore.whiteTime : gameStore.blackTime;
      gameStore.updateTime(mover, currentTime + increment);
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
        
        // Update evaluation after move
        const evaluation = evaluatePosition(newGame);
        gameStore.setEvaluation(evaluation);
        
        // Calculate the player who just moved and add increment
        const mover: 'white' | 'black' = newGame.turn() === 'w' ? 'black' : 'white';
        addTimeIncrementFor(mover);
        
        // Set active color for the next player's timer to count down
        gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
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
          setTimeout(() => makeAiMove(), 300);
        }
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
    
    // Set initial evaluation
    const initialEval = evaluatePosition(new Chess());
    gameStore.setEvaluation(initialEval);
    
    gameStore.startGame();
    // If AI should move first
    if (currentMode === 'computer' && currentSide === 'black') {
      setTimeout(() => makeAiMove(), 400);
    }
  }, [gameStore, makeAiMove]);

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
      
      // Update evaluation after undo
      const evaluation = evaluatePosition(newGame);
      gameStore.setEvaluation(evaluation);
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

  // Ref to track if initial evaluation has been done
  const initialEvalDoneRef = useRef(false);
  
  // Initialize AI move on game start
  useEffect(() => {
    if (gameStore.gameStarted) {
      // If AI should move first (player chose black), request AI move
      if (gameStore.mode === 'computer' && gameStore.playerSide === 'black') {
        setTimeout(() => makeAiMove(), 500);
      }
    }
  }, [gameStore.gameStarted, gameStore.mode, gameStore.playerSide, makeAiMove]);
  
  // This separate effect only runs when the game position changes (not on every render)
  const gamePositionRef = useRef(game.fen());
  
  useEffect(() => {
    // Only update evaluation when game position actually changes and game has started
    const currentPosition = game.fen();
    
    if (gameStore.gameStarted && currentPosition !== gamePositionRef.current) {
      // Update our position ref
      gamePositionRef.current = currentPosition;
      
      // Set initial evaluation only once at startup
      if (!initialEvalDoneRef.current) {
        initialEvalDoneRef.current = true;
        const evaluation = evaluatePosition(game);
        gameStore.setEvaluation(evaluation);
      } else if (!isAiThinking) {
        // For subsequent game changes, only update when not thinking
        const evaluation = evaluatePosition(game);
        gameStore.setEvaluation(evaluation);
      }
    }
  }, [game]);

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
          isThinking={isAiThinking}
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