export enum GameStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

// Re-export GameType from lobby enums for convenience
export { GameType } from '@lobby/enums/lobby.enums';
