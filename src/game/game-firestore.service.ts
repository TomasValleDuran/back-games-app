import { Injectable, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '@firebase/firebase.service';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { GameStatus, GameType } from './enums/game.enums';
import { GameState } from './interfaces/game-state.interface';
import { GameMove, GameMoveWithId } from './interfaces/move.interface';

export interface GamePlayer {
  userId: string;
  username: string;
  displayName: string;
  photoURL?: string | null; // Player's avatar/photo URL
  symbol?: string; // Game-specific symbol (e.g., 'X'/'O' for Tic Tac Toe)
}

export interface Game {
  id: string;
  lobbyId: string;
  gameType: GameType;
  status: GameStatus;
  currentPlayerId: string;
  players: GamePlayer[];
  state: GameState;
  winnerId: string | null;
  startedAt: FirebaseFirestore.Timestamp | FieldValue;
  endedAt: FirebaseFirestore.Timestamp | FieldValue | null;
}

@Injectable()
export class GameFirestoreService {
  private firestore: Firestore;
  private gamesCollection: FirebaseFirestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getFirestore();
    this.gamesCollection = this.firestore.collection('games');
  }

  async createGame(data: {
    lobbyId: string;
    gameType: GameType;
    players: GamePlayer[];
    initialState: GameState;
    startingPlayerId?: string; // Optional: which player starts (defaults to first)
  }): Promise<Game> {
    const gameRef = this.gamesCollection.doc();

    if (!data.players || data.players.length === 0) {
      throw new BadRequestException('Game must have at least one player');
    }

    const game: Omit<Game, 'id'> = {
      lobbyId: data.lobbyId,
      gameType: data.gameType,
      status: GameStatus.IN_PROGRESS,
      currentPlayerId: data.startingPlayerId || data.players[0].userId,
      players: data.players,
      state: data.initialState,
      winnerId: null,
      startedAt: FieldValue.serverTimestamp(),
      endedAt: null,
    };

    await gameRef.set(game);

    return {
      ...game,
      id: gameRef.id,
      startedAt: game.startedAt as FirebaseFirestore.Timestamp,
    };
  }

  async getGame(gameId: string): Promise<Game | null> {
    if (!gameId || gameId.trim().length === 0) {
      return null;
    }

    const gameDoc = await this.gamesCollection.doc(gameId).get();

    if (!gameDoc.exists) {
      return null;
    }

    const data = gameDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: gameDoc.id,
      ...data,
    } as Game;
  }

  async updateGameState(
    gameId: string,
    newState: GameState,
    nextPlayerId: string,
  ): Promise<void> {
    await this.gamesCollection.doc(gameId).update({
      state: newState,
      currentPlayerId: nextPlayerId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async endGame(gameId: string, winnerId: string | null): Promise<void> {
    await this.gamesCollection.doc(gameId).update({
      status: GameStatus.COMPLETED,
      winnerId,
      endedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async abandonGame(gameId: string): Promise<void> {
    await this.gamesCollection.doc(gameId).update({
      status: GameStatus.ABANDONED,
      endedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async addMove(
    gameId: string,
    move: Omit<GameMove, 'timestamp'>,
  ): Promise<void> {
    const movesCollection = this.gamesCollection
      .doc(gameId)
      .collection('moves');
    await movesCollection.add({
      ...move,
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  async getGameMoves(gameId: string): Promise<GameMoveWithId[]> {
    const movesSnapshot = await this.gamesCollection
      .doc(gameId)
      .collection('moves')
      .orderBy('timestamp', 'asc')
      .get();

    return movesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as GameMoveWithId;
    });
  }
}
