export function centipawnsToWinProbability(centipawns: number): number {
  // Convert centipawns to win probability using a sigmoid function
  // Positive centipawns favor white, negative favor black
  const k = 0.0043; // Scaling factor
  return 1 / (1 + Math.exp(-k * centipawns));
}

export function formatEvaluation(score: number, mate?: number): string {
  if (mate !== undefined) {
    return mate > 0 ? `M${mate}` : `M${Math.abs(mate)}`;
  }
  
  const centipawns = Math.round(score);
  if (centipawns === 0) return '0.00';
  
  const pawns = Math.abs(centipawns / 100);
  const sign = centipawns > 0 ? '+' : '-';
  
  return `${sign}${pawns.toFixed(2)}`;
}