import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '@firebase/firebase.service';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { LobbyStatus, GameType } from './enums/lobby.enums';
import { getGameLobbyConfig } from './interfaces/game-config.interface';

export interface LobbyPlayer {
  userId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  isReady: boolean;
  joinedAt: FirebaseFirestore.Timestamp | FieldValue;
}

export interface Lobby {
  id: string;
  name: string;
  ownerId: string;
  gameType: GameType;
  status: LobbyStatus;
  maxPlayers: number;
  players: LobbyPlayer[];
  createdAt: FirebaseFirestore.Timestamp | FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FieldValue;
}

@Injectable()
export class LobbyFirestoreService {
  private firestore: Firestore;
  private lobbiesCollection: FirebaseFirestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getFirestore();
    this.lobbiesCollection = this.firestore.collection('lobbies');
  }

  async createLobby(data: {
    name: string;
    ownerId: string;
    ownerUsername: string;
    ownerDisplayName: string;
    ownerPhotoURL: string | null;
    gameType: GameType;
    maxPlayers: number;
  }): Promise<Lobby> {
    const lobbyRef = this.lobbiesCollection.doc();

    // Get game-specific configuration
    const gameConfig = getGameLobbyConfig(data.gameType);

    const lobby: Omit<Lobby, 'id'> = {
      name: data.name,
      ownerId: data.ownerId,
      gameType: data.gameType,
      status: LobbyStatus.WAITING,
      maxPlayers: data.maxPlayers,
      players: [
        {
          userId: data.ownerId,
          username: data.ownerUsername,
          displayName: data.ownerDisplayName,
          photoURL: data.ownerPhotoURL,
          // Owner ready status depends on game configuration
          isReady: !gameConfig.ownerMustBeReady,
          joinedAt: FieldValue.serverTimestamp(),
        },
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await lobbyRef.set(lobby);

    return {
      ...lobby,
      id: lobbyRef.id,
      players: lobby.players.map((p) => ({
        ...p,
        joinedAt: p.joinedAt as FirebaseFirestore.Timestamp,
      })),
      createdAt: lobby.createdAt as FirebaseFirestore.Timestamp,
      updatedAt: lobby.updatedAt as FirebaseFirestore.Timestamp,
    };
  }

  async getLobby(lobbyId: string): Promise<Lobby | null> {
    if (!lobbyId || lobbyId.trim().length === 0) {
      return null;
    }

    const lobbyDoc = await this.lobbiesCollection.doc(lobbyId).get();

    if (!lobbyDoc.exists) {
      return null;
    }

    const data = lobbyDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: lobbyDoc.id,
      ...data,
    } as Lobby;
  }

  async getAvailableLobbies(limit = 50): Promise<Lobby[]> {
    const snapshot = await this.lobbiesCollection
      .where('status', '==', LobbyStatus.WAITING)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (!data) return null;
        return {
          id: doc.id,
          ...data,
        } as Lobby;
      })
      .filter((lobby): lobby is Lobby => lobby !== null);
  }

  async addPlayerToLobby(
    lobbyId: string,
    player: Omit<LobbyPlayer, 'isReady' | 'joinedAt'>,
  ): Promise<void> {
    const lobbyRef = this.lobbiesCollection.doc(lobbyId);

    // Use transaction to ensure atomicity
    await this.firestore.runTransaction(async (transaction) => {
      const lobbyDoc = await transaction.get(lobbyRef);

      if (!lobbyDoc.exists) {
        throw new NotFoundException('Lobby not found');
      }

      const lobby = { id: lobbyDoc.id, ...lobbyDoc.data() } as Lobby;

      // Check if lobby is full
      if (lobby.players.length >= lobby.maxPlayers) {
        throw new BadRequestException('Lobby is full');
      }

      // Check if player already in lobby
      const existingPlayer = lobby.players.find(
        (p) => p.userId === player.userId,
      );
      if (existingPlayer) {
        throw new BadRequestException('Player already in lobby');
      }

      // Check if lobby is accepting players
      if (lobby.status !== LobbyStatus.WAITING) {
        throw new BadRequestException('Lobby is not accepting new players');
      }

      // Add player to lobby by replacing entire array
      const updatedPlayers = [
        ...lobby.players,
        {
          ...player,
          isReady: false,
          joinedAt: FieldValue.serverTimestamp(),
        },
      ];

      transaction.update(lobbyRef, {
        players: updatedPlayers,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  async removePlayerFromLobby(
    lobbyId: string,
    userId: string,
  ): Promise<boolean> {
    const lobbyRef = this.lobbiesCollection.doc(lobbyId);

    // Use transaction to ensure atomicity
    return await this.firestore.runTransaction(async (transaction) => {
      const lobbyDoc = await transaction.get(lobbyRef);

      if (!lobbyDoc.exists) {
        throw new NotFoundException('Lobby not found');
      }

      const lobby = { id: lobbyDoc.id, ...lobbyDoc.data() } as Lobby;

      const player = lobby.players.find((p) => p.userId === userId);
      if (!player) {
        throw new BadRequestException('Player not in lobby');
      }

      // If owner leaves or it's the last player, delete the lobby
      if (lobby.ownerId === userId || lobby.players.length === 1) {
        transaction.delete(lobbyRef);
        return true; // Lobby deleted
      }

      // Remove player from array
      const updatedPlayers = lobby.players.filter((p) => p.userId !== userId);

      transaction.update(lobbyRef, {
        players: updatedPlayers,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return false; // Lobby not deleted
    });
  }

  async togglePlayerReady(lobbyId: string, userId: string): Promise<void> {
    const lobbyRef = this.lobbiesCollection.doc(lobbyId);

    // Use transaction to ensure atomicity
    await this.firestore.runTransaction(async (transaction) => {
      const lobbyDoc = await transaction.get(lobbyRef);

      if (!lobbyDoc.exists) {
        throw new NotFoundException('Lobby not found');
      }

      const lobby = { id: lobbyDoc.id, ...lobbyDoc.data() } as Lobby;

      // Get game-specific configuration
      const gameConfig = getGameLobbyConfig(lobby.gameType);

      // Check if game uses ready system
      if (!gameConfig.usesReadySystem) {
        throw new BadRequestException(
          'This game type does not use a ready system',
        );
      }

      // Check if owner can toggle ready based on game configuration
      if (lobby.ownerId === userId && !gameConfig.ownerCanToggleReady) {
        throw new BadRequestException(
          'Lobby owner cannot toggle ready status for this game type',
        );
      }

      const playerIndex = lobby.players.findIndex((p) => p.userId === userId);
      if (playerIndex === -1) {
        throw new BadRequestException('Player not in lobby');
      }

      // Toggle ready status
      const updatedPlayers = [...lobby.players];
      updatedPlayers[playerIndex].isReady =
        !updatedPlayers[playerIndex].isReady;

      transaction.update(lobbyRef, {
        players: updatedPlayers,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  async updateLobbyStatus(lobbyId: string, status: LobbyStatus): Promise<void> {
    await this.lobbiesCollection.doc(lobbyId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async findUserCurrentLobby(userId: string): Promise<Lobby | null> {
    const snapshot = await this.lobbiesCollection
      .where('status', '==', LobbyStatus.WAITING)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data) continue;

      const lobby = { id: doc.id, ...data } as Lobby;
      const isPlayerInLobby = lobby.players.some((p) => p.userId === userId);

      if (isPlayerInLobby) {
        return lobby;
      }
    }

    return null;
  }
}
