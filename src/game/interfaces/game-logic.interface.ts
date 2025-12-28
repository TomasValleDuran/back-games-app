import { GameType } from '../enums/game.enums';
import { GameState } from './game-state.interface';
import { GamePlayer } from '../game-firestore.service';

export interface IGameLogic {
  readonly gameType: GameType;

  /**
   * Create the initial state for a new game
   */
  createInitialState(players: GamePlayer[]): GameState;

  /**
   * Validate and apply a move
   * Returns the new game state and whether the game is over
   */
  validateAndApplyMove(
    currentState: GameState,
    move: Record<string, any>,
    playerId: string,
    players: GamePlayer[],
  ): {
    newState: GameState;
    gameOver: boolean;
    winnerId: string | null;
  };

  /**
   * Get the next player ID after a move
   * Default implementation uses round-robin, but games can override
   */
  getNextPlayerId(currentPlayerId: string, players: GamePlayer[]): string;

  /**
   * Create game players with game-specific symbols/identifiers
   */
  createGamePlayers(
    lobbyPlayers: Array<{
      userId: string;
      username: string;
      displayName: string;
      photoURL: string | null;
    }>,
  ): GamePlayer[];
}
