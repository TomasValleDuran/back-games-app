import { Injectable, BadRequestException } from '@nestjs/common';
import { GameType } from './enums/game.enums';
import { IGameLogic } from './interfaces/game-logic.interface';
import { GameState } from './interfaces/game-state.interface';
import { GamePlayer } from './game-firestore.service';
import { TicTacToeLogic } from './games/tic-tac-toe.logic';
import { Connect4Logic } from './games/connect4.logic';

/**
 * Service that acts as a registry and factory for game logic implementations
 * Routes requests to the appropriate game logic implementation
 */
@Injectable()
export class GameLogicService {
  private readonly gameLogics: Map<GameType, IGameLogic>;

  constructor(
    private readonly ticTacToeLogic: TicTacToeLogic,
    private readonly connect4Logic: Connect4Logic,
  ) {
    this.gameLogics = new Map([
      [GameType.TIC_TAC_TOE, this.ticTacToeLogic],
      [GameType.CONNECT4, this.connect4Logic],
    ]);
  }

  /**
   * Get the game logic implementation for a specific game type
   */
  private getGameLogic(gameType: GameType): IGameLogic {
    const gameLogic = this.gameLogics.get(gameType);
    if (!gameLogic) {
      throw new BadRequestException(`Game type ${gameType} not implemented`);
    }
    return gameLogic;
  }

  /**
   * Create initial game state based on game type
   */
  createInitialState(gameType: GameType, players: GamePlayer[]): GameState {
    const gameLogic = this.getGameLogic(gameType);
    return gameLogic.createInitialState(players);
  }

  /**
   * Validate and apply a move based on game type
   */
  validateAndApplyMove(
    gameType: GameType,
    currentState: GameState,
    move: Record<string, any>,
    playerId: string,
    players: GamePlayer[],
  ): { newState: GameState; gameOver: boolean; winnerId: string | null } {
    const gameLogic = this.getGameLogic(gameType);
    return gameLogic.validateAndApplyMove(
      currentState,
      move,
      playerId,
      players,
    );
  }

  /**
   * Get the next player ID after a move
   */
  getNextPlayerId(
    gameType: GameType,
    currentPlayerId: string,
    players: GamePlayer[],
  ): string {
    const gameLogic = this.getGameLogic(gameType);
    return gameLogic.getNextPlayerId(currentPlayerId, players);
  }

  /**
   * Create game players with game-specific symbols/identifiers
   */
  createGamePlayers(
    gameType: GameType,
    lobbyPlayers: Array<{
      userId: string;
      username: string;
      displayName: string;
      photoURL: string | null;
    }>,
  ): GamePlayer[] {
    const gameLogic = this.getGameLogic(gameType);
    return gameLogic.createGamePlayers(lobbyPlayers);
  }
}
