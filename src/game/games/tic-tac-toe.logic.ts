import { Injectable, BadRequestException } from '@nestjs/common';
import { GameType } from '../enums/game.enums';
import { IGameLogic } from '../interfaces/game-logic.interface';
import {
  GameState,
  TicTacToeGameState,
  isTicTacToeState,
} from '../interfaces/game-state.interface';
import { GamePlayer } from '../game-firestore.service';

/**
 * Tic Tac Toe game logic implementation
 */
@Injectable()
export class TicTacToeLogic implements IGameLogic {
  readonly gameType = GameType.TIC_TAC_TOE;

  createInitialState(players: GamePlayer[]): TicTacToeGameState {
    if (players.length !== 2) {
      throw new BadRequestException('Tic Tac Toe requires exactly 2 players');
    }

    return {
      board: Array(9).fill(null) as (string | null)[], // 3x3 board represented as flat array
      gameOver: false,
      winner: null,
      isDraw: false,
    };
  }

  validateAndApplyMove(
    currentState: GameState,
    move: { position?: number },
    playerId: string,
    players: GamePlayer[],
  ): {
    newState: TicTacToeGameState;
    gameOver: boolean;
    winnerId: string | null;
  } {
    if (!isTicTacToeState(currentState)) {
      throw new BadRequestException('Invalid game state for Tic Tac Toe');
    }

    if (typeof move.position !== 'number') {
      throw new BadRequestException('Position is required for Tic Tac Toe');
    }

    return this.validateAndApplyTicTacToeMove(
      currentState,
      move.position,
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
      throw new BadRequestException('Tic Tac Toe requires exactly 2 players');
    }

    return lobbyPlayers.map((p, index) => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      symbol: index === 0 ? 'X' : 'O',
    }));
  }

  private validateAndApplyTicTacToeMove(
    currentState: TicTacToeGameState,
    position: number,
    playerId: string,
    players: GamePlayer[],
  ): {
    newState: TicTacToeGameState;
    gameOver: boolean;
    winnerId: string | null;
  } {
    // Validate position
    if (position < 0 || position > 8) {
      throw new BadRequestException(
        'Invalid position. Must be between 0 and 8',
      );
    }

    // Check if position is already taken
    if (currentState.board[position] !== null) {
      throw new BadRequestException('Position already taken');
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

    // Apply move
    const newBoard = [...currentState.board];
    newBoard[position] = symbol;

    // Check for winner
    const winnerSymbol = this.checkTicTacToeWinner(newBoard);
    const isDraw = !winnerSymbol && newBoard.every((cell) => cell !== null);

    const newState: TicTacToeGameState = {
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

  private checkTicTacToeWinner(board: (string | null)[]): string | null {
    // Winning combinations (8 possible lines)
    const lines = [
      [0, 1, 2], // Top row
      [3, 4, 5], // Middle row
      [6, 7, 8], // Bottom row
      [0, 3, 6], // Left column
      [1, 4, 7], // Middle column
      [2, 5, 8], // Right column
      [0, 4, 8], // Diagonal top-left to bottom-right
      [2, 4, 6], // Diagonal top-right to bottom-left
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // Return 'X' or 'O'
      }
    }

    return null; // No winner
  }
}
