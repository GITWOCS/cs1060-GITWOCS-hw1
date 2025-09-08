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
  // Flag to track if AI is making a move to prevent recursive AI moves
  const [isAiMakingMove, setIsAiMakingMove] = useState(false);
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

  // Simple AI that picks moves with some basic strategy
  const makeAiMove = useCallback(() => {
    const currentGame = gameRef.current;
    
    if (!gameStore.gameStarted || gameStore.gameResult || game.isGameOver()) {
      return;
    }

    // Only proceed if we're in computer mode
    if (gameStore.mode !== 'computer') return;
    
    // Determine AI's color: opposite of player's color
    const aiColor = gameStore.playerSide === 'white' ? 'b' : 'w';
    const currentTurn = currentGame.turn();
    
    // Only make AI move if it's actually the AI's turn
    const isAiTurn = currentTurn === aiColor;
    
    // If it's not AI's turn, exit immediately
    if (!isAiTurn) return;
    
    // Set flag that AI is making a move
    setIsAiMakingMove(true);
    
    // Start AI thinking and set active color to AI's side (so timer runs for AI)
    setIsAiThinking(true);
    gameStore.setThinking(true);
    gameStore.setActiveColor(currentGame.turn() === 'w' ? 'white' : 'black');
    
    // Store current time to calculate elapsed time at the end
    aiThinkStartTimeRef.current = Date.now();
    
    // Calculate AI thinking time based on difficulty
    const baseTime = 1000; // 1 second base
    const levelMultiplier = (11 - gameStore.aiStrength) * 200; // Easier = slower
    const thinkTime = baseTime + levelMultiplier + (Math.random() * 1000);
    
    setTimeout(() => {
      const gameInstanceInTimeout = gameRef.current;
      try {
        const moves = gameInstanceInTimeout.moves({ verbose: true });
        if (moves.length === 0) {
          setIsAiThinking(false);
          gameStore.setThinking(false);
          setIsAiMakingMove(false);
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
            const testGame = new Chess(gameInstanceInTimeout.fen());
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
            const testGame = new Chess(gameInstanceInTimeout.fen());
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

        // Before making the move, validate that it's actually the AI's turn
        const aiColorCheck = gameStore.playerSide === 'white' ? 'b' : 'w';
        const currentTurnInTimeout = gameInstanceInTimeout.turn();
        
        // Ensure it's the AI's turn to move
        if (currentTurnInTimeout !== aiColorCheck) {
          console.error(`AI tried to move when it's not its turn. Current turn: ${currentTurnInTimeout}, AI color: ${aiColorCheck}`);
          setIsAiThinking(false);
          gameStore.setThinking(false);
          setIsAiMakingMove(false);
          return;
        }
        
        // Make the AI move
        const move = gameInstanceInTimeout.move(selectedMove);
        if (move) {
          const newGame = cloneWithHistory(gameInstanceInTimeout);
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
          
          // After AI moves, it should ALWAYS be the player's turn
          // Set active color for timer
          gameStore.setActiveColor(newGame.turn() === 'w' ? 'white' : 'black');
          
          // Check for checkmate, stalemate, etc.
          checkGameEnd(newGame);
          
          // IMPORTANT: Do not trigger another AI move here - wait for player's move
        }
      } catch (error) {
        console.error('AI move error:', error);
      } finally {
        // Make sure we keep the AI move flag active during animation
        // to prevent multiple quick moves
        setTimeout(() => {
          setIsAiThinking(false);
          gameStore.setThinking(false);
          setIsAiMakingMove(false);
        }, 500); // Add a delay to match animation time
      }
    }, thinkTime);
  }, [gameStore, cloneWithHistory, updateHistory, checkGameEnd]);

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

  // Handle piece drop (drag and drop)
  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    // Prevent any moves if game is not active
    if (!gameStore.gameStarted || gameStore.gameResult) {
      return false;
    }
    
    // In computer mode, enforce proper turn order
    if (gameStore.mode === 'computer') {
      // Get the piece being moved
      const piece = game.get(sourceSquare);
      if (!piece) return false;
      
      // Check if it's player's turn and they're moving their own piece
      const playerColor = gameStore.playerSide === 'white' ? 'w' : 'b';
      const isPlayerPiece = piece.color === playerColor;
      const isCorrectTurn = piece.color === game.turn();
      
      // Allow move only if:
      // 1. It's the player's piece
      // 2. It's that color's turn to move
      // 3. AI is not currently thinking
      if (!isPlayerPiece || !isCorrectTurn || gameStore.isThinking || isAiMakingMove) {
        console.log('Move rejected: Not player turn/piece or AI is thinking');
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

  // Handle square click
  const handleSquareClick = (square: Square) => {
    if (!gameStore.gameStarted || gameStore.gameResult) return;

    // In computer mode, check if it's the player's turn
    if (gameStore.mode === 'computer') {
      // Get the current turn ('w' or 'b')
      const currentTurn = game.turn();
      
      // Convert player side to color code
      const playerColor = gameStore.playerSide === 'white' ? 'w' : 'b';
      
      // Check if current turn matches player's color
      const isPlayerTurn = currentTurn === playerColor;
      
      // No moves during AI's thinking time
      if (!isPlayerTurn || gameStore.isThinking || isAiMakingMove) {
        console.log(`Square click rejected: Not player turn (${currentTurn}) or AI is thinking`);
        return;
      }
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
      // Select new piece - allow selecting pieces based on whose turn it is
      const piece = game.get(square);
      
      // We need two checks:
      // 1. Is there a piece on this square?
      // 2. Does the piece color match the current turn?
      if (piece && piece.color === game.turn()) {
        // In computer mode, make an additional check that the player is actually
        // moving their own color pieces
        if (gameStore.mode === 'computer') {
          const playerColor = gameStore.playerSide === 'white' ? 'w' : 'b';
          
          // Make sure the player is moving their assigned color
          if (piece.color !== playerColor) {
            console.log(`Cannot select opponent piece: piece=${piece.color}, playerColor=${playerColor}`);
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
          }
        }
        
        // If we get here, the piece can be selected
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
      // Get current game state
      const testGame = new Chess(game.fen());
      const piece = testGame.get(from);
      
      if (!piece) {
        console.log('No piece at the source square');
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      
      // The move should be valid if:
      // 1. It's the current color's turn to move
      // 2. In computer mode, the piece color matches the player's assigned side
      const currentTurn = game.turn();
      const playerColor = gameStore.playerSide === 'white' ? 'w' : 'b';
      
      // For human vs human, only check if it's the correct color's turn
      if (gameStore.mode === 'human' && piece.color !== currentTurn) {
        console.log(`Wrong turn: piece=${piece.color}, current turn=${currentTurn}`);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      
      // For computer mode, check both the turn and the player's assigned color
      if (gameStore.mode === 'computer') {
        // AI is thinking or making a move
        if (gameStore.isThinking || isAiMakingMove) {
          console.log('AI is currently thinking - cannot move');
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
        
        // Wrong color for current turn
        if (piece.color !== currentTurn) {
          console.log(`Wrong turn: piece=${piece.color}, current turn=${currentTurn}`);
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
        
        // Player moving opponent's pieces
        if (piece.color !== playerColor) {
          console.log(`Cannot move opponent pieces: piece=${piece.color}, player=${playerColor}`);
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }
      
      // Check if this is a promotion move (now piece is guaranteed to be defined)
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

  // Make the actual move
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
        // Check for game end conditions
        checkGameEnd(newGame);
        
        // Only request AI move if this was a player's move (not an AI move)  
        // and if it's now AI's turn based on player side selection
        const nextTurn = newGame.turn();
        const aiShouldPlayColor = gameStore.playerSide === 'white' ? 'b' : 'w';
        const aiShouldMove = (
          gameStore.mode === 'computer' &&
          nextTurn === aiShouldPlayColor &&
          !newGame.isGameOver() && 
          !isAiMakingMove
        );
        
        if (aiShouldMove) {
          // Set AI making move flag BEFORE the timeout to prevent multiple triggers
          setIsAiMakingMove(true);
          
          // Give enough time for the piece movement animation to complete
          // and for the player to see the board state
          const aiDelay = gameStore.playerSide === 'black' ? 800 : 500;
          
          // This ensures we don't get into an infinite loop of AI moves
          setTimeout(() => makeAiMove(), aiDelay);
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

  // Start a fresh game with the same settings
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
    
    // If AI should move first (player is black and it's white's turn), trigger AI's first move
    if (currentMode === 'computer' && currentSide === 'black' && new Chess().turn() === 'w') {
      console.log('Starting new game with AI as white - triggering first AI move');
      // Clear any existing AI move state
      setIsAiThinking(false);
      gameStore.setThinking(false);
      
      // Set flag to indicate AI is making a move
      setIsAiMakingMove(true);
      
      // Give a longer delay before AI makes its first move when player is black
      // This ensures all UI animations and state updates are complete
      setTimeout(() => makeAiMove(), 1000);
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

  // Check if it's player's turn (for computer mode)
  const isPlayerTurn = () => {
    // In human vs human mode, both sides can move
    if (gameStore.mode === 'human') return true;
    
    // In computer mode, player can only move when:
    // 1. Current turn matches the player's color code (w/b)
    // 2. AI is not currently thinking/making a move
    const currentTurn = game.turn(); // 'w' or 'b'
    const playerColor = gameStore.playerSide === 'white' ? 'w' : 'b';
    const playerCanMove = currentTurn === playerColor;
    
    // For debugging
    console.log(`isPlayerTurn check: currentTurn=${currentTurn}, playerColor=${playerColor}, playerSide=${gameStore.playerSide}`);
                         
    return playerCanMove && !isAiThinking && !isAiMakingMove;
  };

  // Initialize AI move on game start - only trigger once when game starts
  useEffect(() => {
    if (gameStore.gameStarted) {
      // If player chose black, AI plays white and should move first
      if (gameStore.mode === 'computer' && 
          gameStore.playerSide === 'black' && 
          gameRef.current.turn() === 'w' && 
          !isAiMakingMove) {
            
        console.log('Player chose black, AI (white) should move first');
        setIsAiMakingMove(true); // Prevent multiple AI moves
        setTimeout(() => makeAiMove(), 500);
      }
    }
  }, [gameStore.gameStarted, gameStore.mode, gameStore.playerSide, makeAiMove, isAiMakingMove]);
  
  // This separate effect only runs when the game position changes
  const gamePositionRef = useRef(game.fen());
  
  useEffect(() => {
    // Only update evaluation when game position actually changes and game has started
    const currentPosition = game.fen();
    
    if (gameStore.gameStarted && currentPosition !== gamePositionRef.current) {
      // Update our position ref
      gamePositionRef.current = currentPosition;
      
      // Update evaluation if not AI thinking
      if (!isAiThinking) {
        const evaluation = evaluatePosition(game);
        gameStore.setEvaluation(evaluation);
      }
    }
  }, [game, gameStore, isAiThinking]);

  return (
    <div 
      className="min-h-screen w-full p-4 bg-gradient-to-br from-amber-50 to-orange-100"
    >
      <div className="max-w-7xl mx-auto">
        {/* Evaluation Bar */}
        <div className="backdrop-blur-sm bg-white/90 rounded-xl p-2 border border-amber-500/50 mb-2 shadow-md">
          <EvaluationBar score={gameStore.evaluationScore} />
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-amber-500/50" ref={boardContainerRef}>
              <Chessboard
                position={game.fen()}
                onSquareClick={handleSquareClick}
                onPieceDrop={onDrop}
                arePiecesDraggable={gameStore.gameStarted && !gameStore.gameResult && isPlayerTurn() && !isAiMakingMove}
                boardOrientation={gameStore.playerSide === 'black' ? 'black' : 'white'}
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

          {/* Right Panel with Move List, Game Status and Timers */}
          <div className="space-y-4">
            {/* Move List with fixed height */}
            <div 
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-amber-500/50 flex flex-col" 
              style={{ height: '300px' }}
            >
              <h3 className="text-amber-800 font-medium mb-2 text-sm">Move History</h3>
              <div className="overflow-auto flex-grow">
                <MoveList
                  historySan={historySan}
                  compactView={true}
                />
              </div>
            </div>
            
            {/* Move Controls - Outside the moves list container */}
            <div className="flex flex-wrap gap-2 justify-between mb-3 mt-2">
              <button
                onClick={handleCopyPgn}
                className="bg-white border-2 border-amber-500/50 hover:border-amber-400 text-amber-800 font-semibold py-2 px-4 rounded-xl transition-all duration-200"
              >
                Copy PGN
              </button>
              <button
                onClick={handleDownloadPgn}
                className="bg-white border-2 border-amber-500/50 hover:border-amber-400 text-amber-800 font-semibold py-2 px-4 rounded-xl transition-all duration-200"
              >
                Download PGN
              </button>
              <button
                onClick={handleCopyFen}
                className="bg-white border-2 border-amber-500/50 hover:border-amber-400 text-amber-800 font-semibold py-2 px-4 rounded-xl transition-all duration-200"
              >
                Copy FEN
              </button>
            </div>
            
            {/* Full-width Undo button */}
            <button
              onClick={handleUndo}
              className="w-full mt-2 bg-white border-2 border-amber-500/50 hover:border-amber-400 text-amber-800 font-semibold py-2 px-4 rounded-xl transition-all duration-200"
            >
              Undo Move
            </button>
            
            {/* Game Status */}
            <div className="backdrop-blur-sm bg-white/90 rounded-xl p-3 border border-amber-500/50 shadow-md">
              <h3 className="text-amber-800 font-medium mb-1 text-sm">Game Status</h3>
              <GameStatus
                isGameActive={gameStore.gameStarted && !gameStore.gameResult}
                activeColor={gameStore.activeColor}
                isInCheck={game.inCheck()}
                gameResult={gameStore.gameResult}
                isThinking={isAiThinking}
                isPlayerTurn={isPlayerTurn()}
                compactView={true}
                lightTheme={true}
              />
            </div>
            
            {/* Timers */}
            <div className="backdrop-blur-sm bg-white/90 rounded-xl p-3 border border-amber-500/50 shadow-md">
              <h3 className="text-amber-800 font-medium mb-1 text-sm">Time Control</h3>
              <ChessTimer compactView={true} lightTheme={true} />
            </div>

            {/* Game Controls */}
            <div className="backdrop-blur-sm bg-white/90 rounded-2xl shadow-lg p-4 border border-amber-500/50 mt-2">
              <GameControls
                onNewGame={() => {
                  setGame(new Chess());
                  gameStore.resetGame();
                  setSelectedSquare(null);
                  setLegalMoves([]);
                }}
                onFlipBoard={gameStore.flipBoard}
                onUndo={handleUndo}
                allowUndo={gameStore.mode === 'human' && !gameStore.gameResult}
              />
              
              {/* Forfeit Button */}
              {gameStore.gameStarted && !gameStore.gameResult && (
                <button
                  className="w-full mt-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200 border border-red-300"
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
          </div>
        </div>

        {/* Promotion Dialog */}
        <PromotionDialog
          isOpen={!!promotionData}
          onSelect={handlePromotion}
          color={promotionData?.color || 'white'}
          lightTheme={true}
        />
        
        {/* Game Result Modal */}
        {gameStore.gameResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn backdrop-blur-sm">
            <div 
              className="bg-white border border-amber-500/50 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center transform animate-slideUp"
            >
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
                
                <h2 className="text-3xl font-bold text-amber-800 mb-2 font-serif">
                  {gameStore.gameResult.winner === 'white' && 'White Wins!'}
                  {gameStore.gameResult.winner === 'black' && 'Black Wins!'}
                  {gameStore.gameResult.winner === null && 'Draw!'}
                </h2>
                
                <p className="text-amber-700 capitalize">
                  {gameStore.gameResult.reason}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={startNewGameSameSettings}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
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
                  className="w-full bg-white border-2 border-amber-500/50 hover:border-amber-400 text-amber-800 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        )}
        
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
    </div>
  );
}
