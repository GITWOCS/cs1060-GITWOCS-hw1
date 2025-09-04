import React from 'react';
import { useGameStore } from './store/gameStore';
import { GameSetup } from './components/GameSetup';
import { ChessGame } from './components/ChessGame';

function App() {
  const gameStarted = useGameStore((state) => state.gameStarted);

  return gameStarted ? <ChessGame /> : <GameSetup />;
}

export default App;