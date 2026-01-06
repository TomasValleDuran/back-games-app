import { Injectable, BadRequestException } from '@nestjs/common';
import { GameType } from '../enums/game.enums';
import { IGameLogic } from '../interfaces/game-logic.interface';
import {
  GameState,
  Connect4GameState,
  isConnect4State,
} from '../interfaces/game-state.interface';
import { GamePlayer } from '../game-firestore.service';

/**
 * Connect 4 game logic implementation
 * Board: 7 columns x 6 rows (42 cells total)
 * Represented as flat array where index = row * 7 + col
 */
@Injectable()
export class Connect4Logic implements IGameLogic {
  readonly gameType = GameType.CONNECT4;
  private static readonly COLUMNS = 7;
  private static readonly ROWS = 6;
  private static readonly TOTAL_CELLS = 42;

  createInitialState(players: GamePlayer[]): Connect4GameState {
    if (players.length !== 2) {
      throw new BadRequestException('Connect 4 requires exactly 2 players');
    }

    return {
      board: Array(Connect4Logic.TOTAL_CELLS).fill(null) as (string | null)[],
      gameOver: false,
      winner: null,
      isDraw: false,
    };
  }

  validateAndApplyMove(
    currentState: GameState,
    move: { position?: number; column?: number },
    playerId: string,
    players: GamePlayer[],
  ): {
    newState: Connect4GameState;
    gameOver: boolean;
    winnerId: string | null;
  } {
    if (!isConnect4State(currentState)) {
      throw new BadRequestException('Invalid game state for Connect 4');
    }

    // Support both 'position' and 'column' for backward compatibility
    const column = move.column !== undefined ? move.column : move.position;
    if (typeof column !== 'number') {
      throw new BadRequestException('Column is required for Connect 4');
    }

    return this.validateAndApplyConnect4Move(
      currentState,
      column,
      playerId,
      players,
    );
  }

  getNextPlayerId(currentPlayerId: string, players: GamePlayer[]): string {
    const currentPlayerIndex = players.findIndex(
      (p) => p.userId === currentPlayerId,
    );
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    return players[nextPlayerIndex].userId;
  }

  createGamePlayers(
    lobbyPlayers: Array<{
      userId: string;
      username: string;
      displayName: string;
      photoURL: string | null;
    }>,
  ): GamePlayer[] {
    if (lobbyPlayers.length !== 2) {
      throw new BadRequestException('Connect 4 requires exactly 2 players');
    }

    return lobbyPlayers.map((p, index) => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      symbol: index === 0 ? 'X' : 'O',
    }));
  }

  private validateAndApplyConnect4Move(
    currentState: Connect4GameState,
    column: number,
    playerId: string,
    players: GamePlayer[],
  ): {
    newState: Connect4GameState;
    gameOver: boolean;
    winnerId: string | null;
  } {
    // Validate column
    if (column < 0 || column >= Connect4Logic.COLUMNS) {
      throw new BadRequestException(
        `Invalid column. Must be between 0 and ${Connect4Logic.COLUMNS - 1}`,
      );
    }

    // Check if column is full
    const row = this.getDropRow(currentState.board, column);
    if (row === -1) {
      throw new BadRequestException('Column is full');
    }

    // Check if game is already over
    if (currentState.gameOver) {
      throw new BadRequestException('Game is already over');
    }

    // Get player's symbol
    const player = players.find((p) => p.userId === playerId);
    if (!player) {
      throw new BadRequestException('Player not in game');
    }

    if (!player.symbol) {
      throw new BadRequestException('Player symbol not set');
    }

    const symbol = player.symbol;

    // Apply move (drop piece into column)
    const newBoard = [...currentState.board];
    const index = row * Connect4Logic.COLUMNS + column;
    newBoard[index] = symbol;

    // Check for winner
    const winnerSymbol = this.checkConnect4Winner(newBoard);
    const isDraw = !winnerSymbol && newBoard.every((cell) => cell !== null);

    const newState: Connect4GameState = {
      board: newBoard,
      gameOver: winnerSymbol !== null || isDraw,
      winner: winnerSymbol,
      isDraw,
    };

    // Find winner's userId by matching symbol
    const winnerId = winnerSymbol
      ? players.find((p) => p.symbol === winnerSymbol)?.userId || null
      : null;

    return {
      newState,
      gameOver: newState.gameOver,
      winnerId,
    };
  }

  /**
   * Get the row where a piece would land in a column (gravity)
   * Returns -1 if column is full
   */
  private getDropRow(board: (string | null)[], column: number): number {
    // Start from bottom row and go up
    for (let row = Connect4Logic.ROWS - 1; row >= 0; row--) {
      const index = row * Connect4Logic.COLUMNS + column;
      if (board[index] === null) {
        return row;
      }
    }
    return -1; // Column is full
  }

  /**
   * Check for a Connect 4 winner (4 in a row)
   */
  private checkConnect4Winner(board: (string | null)[]): string | null {
    // Check all possible 4-in-a-row patterns
    for (let row = 0; row < Connect4Logic.ROWS; row++) {
      for (let col = 0; col < Connect4Logic.COLUMNS; col++) {
        const index = row * Connect4Logic.COLUMNS + col;
        const symbol = board[index];
        if (symbol === null) continue;

        // Check horizontal (right)
        if (col <= Connect4Logic.COLUMNS - 4) {
          const pattern = [index, index + 1, index + 2, index + 3];
          if (this.checkPattern(board, pattern, symbol)) {
            return symbol;
          }
        }

        // Check vertical (down)
        if (row <= Connect4Logic.ROWS - 4) {
          const pattern = [
            index,
            index + Connect4Logic.COLUMNS,
            index + 2 * Connect4Logic.COLUMNS,
            index + 3 * Connect4Logic.COLUMNS,
          ];
          if (this.checkPattern(board, pattern, symbol)) {
            return symbol;
          }
        }

        // Check diagonal (down-right)
        if (col <= Connect4Logic.COLUMNS - 4 && row <= Connect4Logic.ROWS - 4) {
          const pattern = [
            index,
            index + Connect4Logic.COLUMNS + 1,
            index + 2 * (Connect4Logic.COLUMNS + 1),
            index + 3 * (Connect4Logic.COLUMNS + 1),
          ];
          if (this.checkPattern(board, pattern, symbol)) {
            return symbol;
          }
        }

        // Check diagonal (down-left)
        if (col >= 3 && row <= Connect4Logic.ROWS - 4) {
          const pattern = [
            index,
            index + Connect4Logic.COLUMNS - 1,
            index + 2 * (Connect4Logic.COLUMNS - 1),
            index + 3 * (Connect4Logic.COLUMNS - 1),
          ];
          if (this.checkPattern(board, pattern, symbol)) {
            return symbol;
          }
        }
      }
    }

    return null; // No winner
  }

  private checkPattern(
    board: (string | null)[],
    pattern: number[],
    symbol: string,
  ): boolean {
    return pattern.every((idx) => board[idx] === symbol);
  }
}

