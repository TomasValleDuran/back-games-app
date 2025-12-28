import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface BaseMove {
  playerId: string;
  moveNumber: number;
  timestamp: Timestamp | FieldValue;
}

export interface TicTacToeMove extends BaseMove {
  position: number; // 0-8 for 3x3 board
}

export type GameMove = TicTacToeMove;

/**
 * Game move with document ID (used when retrieving from Firestore)
 */
export interface GameMoveWithId extends GameMove {
  id: string;
}
