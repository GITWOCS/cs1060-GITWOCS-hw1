import { TimeControl } from '../types/chess';

export const TIME_CONTROLS: TimeControl[] = [
  { minutes: 1, increment: 0, name: 'Bullet 1+0' },
  { minutes: 1, increment: 1, name: 'Bullet 1+1' },
  { minutes: 3, increment: 0, name: 'Blitz 3+0' },
  { minutes: 3, increment: 2, name: 'Blitz 3+2' },
  { minutes: 5, increment: 0, name: 'Blitz 5+0' },
  { minutes: 5, increment: 3, name: 'Blitz 5+3' },
  { minutes: 10, increment: 0, name: 'Rapid 10+0' },
  { minutes: 10, increment: 5, name: 'Rapid 10+5' },
  { minutes: 15, increment: 10, name: 'Rapid 15+10' },
  { minutes: 30, increment: 0, name: 'Classical 30+0' },
];

export const AI_STRENGTHS = [
  { level: 1, name: 'Beginner', skillLevel: 1, elo: 400 },
  { level: 2, name: 'Easy', skillLevel: 3, elo: 800 },
  { level: 3, name: 'Novice', skillLevel: 5, elo: 1300 },
  { level: 4, name: 'Intermediate', skillLevel: 8, elo: 1500 },
  { level: 5, name: 'Advanced', skillLevel: 12, elo: 1800 },
  { level: 6, name: 'Expert', skillLevel: 16, elo: 2100 },
  { level: 7, name: 'Master', skillLevel: 20, elo: 2400 },
];