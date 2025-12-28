import { LobbyStatus, GameType } from '../enums/lobby.enums';
import { getGameLobbyConfig } from '../interfaces/game-config.interface';

export class PlayerDto {
  userId: string;
  username: string;
  displayName: string | null;
  photoURL: string | null;
  isReady: boolean;
  joinedAt: Date;
}

export class LobbyResponseDto {
  id: string;
  name: string;
  ownerId: string;
  maxPlayers: number;
  status: LobbyStatus;
  gameType: GameType;
  players: PlayerDto[];
  createdAt: Date;
  updatedAt: Date;

  get currentPlayerCount(): number {
    return this.players.length;
  }

  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }

  get canStart(): boolean {
    if (this.status !== LobbyStatus.WAITING) {
      return false;
    }

    // Use game-specific configuration to determine if lobby can start
    const gameConfig = getGameLobbyConfig(this.gameType);

    if (gameConfig.canStart) {
      return gameConfig.canStart({
        players: this.players.map((p) => ({
          userId: p.userId,
          isReady: p.isReady,
        })),
        ownerId: this.ownerId,
      });
    }

    // Fallback to default logic if no custom canStart function
    return (
      this.players.length >= gameConfig.minPlayers &&
      this.players.every((p) => p.isReady)
    );
  }
}
