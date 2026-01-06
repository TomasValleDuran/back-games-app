import { GameType } from '../enums/lobby.enums';

/**
 * Configuration for lobby behavior based on game type
 * This allows each game type to define its own lobby rules
 */
export interface GameLobbyConfig {
  /** Minimum number of players required to start the game */
  minPlayers: number;

  /** Maximum number of players allowed (can be overridden by lobby creator) */
  maxPlayers: number;

  /** Whether the owner needs to be ready to start (false = owner auto-ready) */
  ownerMustBeReady: boolean;

  /** Whether the owner can toggle their ready status */
  ownerCanToggleReady: boolean;

  /** Whether the game uses a ready system at all */
  usesReadySystem: boolean;

  /** Custom validation function to check if lobby can start */
  canStart?: (lobby: {
    players: Array<{ userId: string; isReady: boolean }>;
    ownerId: string;
  }) => boolean;
}

/**
 * Registry of game configurations
 * Add new game types here with their specific lobby rules
 */
export const GAME_LOBBY_CONFIGS: Record<GameType, GameLobbyConfig> = {
  [GameType.TIC_TAC_TOE]: {
    minPlayers: 2,
    maxPlayers: 2,
    ownerMustBeReady: false, // Owner is auto-ready
    ownerCanToggleReady: false, // Owner cannot toggle ready
    usesReadySystem: true,
    canStart: (lobby) => {
      // For Tic Tac Toe: need 2 players, all non-owner players ready
      if (lobby.players.length < 2) return false;
      const nonOwnerPlayers = lobby.players.filter(
        (p) => p.userId !== lobby.ownerId,
      );
      return nonOwnerPlayers.every((p) => p.isReady);
    },
  },
  [GameType.CONNECT4]: {
    minPlayers: 2,
    maxPlayers: 2,
    ownerMustBeReady: false,
    ownerCanToggleReady: false,
    usesReadySystem: true,
    canStart: (lobby) => {
      if (lobby.players.length < 2) return false;
      const nonOwnerPlayers = lobby.players.filter(
        (p) => p.userId !== lobby.ownerId,
      );
      return nonOwnerPlayers.every((p) => p.isReady);
    },
  },
};

/**
 * Get lobby configuration for a specific game type
 */
export function getGameLobbyConfig(gameType: GameType): GameLobbyConfig {
  const config = GAME_LOBBY_CONFIGS[gameType];
  if (!config) {
    throw new Error(`No lobby configuration found for game type: ${gameType}`);
  }
  return config;
}
