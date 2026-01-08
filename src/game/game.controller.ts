import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GameFirestoreService } from './game-firestore.service';
import { GameLogicService } from './game-logic.service';
import { LobbyFirestoreService } from '@lobby/lobby-firestore.service';
import { StatsService } from '@stats/stats.service';
import { MakeMoveDto } from './dto/make-move.dto';
import { FirebaseAuthGuard } from '@firebase/firebase-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '@firebase/current-user.decorator';
import { getGameLobbyConfig } from '@lobby/interfaces/game-config.interface';
import { GameStatus } from './enums/game.enums';
import { LobbyStatus } from '@lobby/enums/lobby.enums';

@Controller('games')
@UseGuards(FirebaseAuthGuard) // Protect all routes
export class GameController {
  constructor(
    private gameFirestoreService: GameFirestoreService,
    private gameLogicService: GameLogicService,
    private lobbyFirestoreService: LobbyFirestoreService,
    private statsService: StatsService,
  ) {}

  @Post('start/:lobbyId')
  async startGame(
    @Param('lobbyId') lobbyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Get lobby
    const lobby = await this.lobbyFirestoreService.getLobby(lobbyId);
    if (!lobby) {
      throw new NotFoundException('Lobby not found');
    }

    // Check if user is the owner
    if (lobby.ownerId !== user.id) {
      throw new BadRequestException('Only the lobby owner can start the game');
    }

    // Check if lobby is in waiting status
    if (lobby.status !== LobbyStatus.WAITING) {
      throw new BadRequestException('Game already started or finished');
    }

    // Get game-specific configuration
    const gameConfig = getGameLobbyConfig(lobby.gameType);

    // Check minimum players using game config
    if (lobby.players.length < gameConfig.minPlayers) {
      throw new BadRequestException(
        `Need at least ${gameConfig.minPlayers} players to start`,
      );
    }

    // Use game config's canStart function if available, otherwise use default logic
    const canStart = gameConfig.canStart
      ? gameConfig.canStart({
          players: lobby.players.map((p) => ({
            userId: p.userId,
            isReady: p.isReady,
          })),
          ownerId: lobby.ownerId,
        })
      : lobby.players.length >= gameConfig.minPlayers &&
        lobby.players.every((p) => p.isReady);

    if (!canStart) {
      throw new BadRequestException(
        'Game cannot start. Check that all required players are ready.',
      );
    }

    // Create game players with symbols based on game type
    const gamePlayers = this.gameLogicService.createGamePlayers(
      lobby.gameType,
      lobby.players,
    );

    // Create initial game state
    const initialState = this.gameLogicService.createInitialState(
      lobby.gameType,
      gamePlayers,
    );

    // Create game in Firestore
    const game = await this.gameFirestoreService.createGame({
      lobbyId: lobby.id,
      gameType: lobby.gameType,
      players: gamePlayers,
      initialState,
    });

    // Update lobby status
    await this.lobbyFirestoreService.updateLobbyStatus(
      lobbyId,
      LobbyStatus.IN_GAME,
      game.id,
    );

    return {
      success: true,
      game,
      message: 'Game started! Listen to Firestore path: /games/' + game.id,
    };
  }

  @Get(':id')
  async getGame(@Param('id') gameId: string) {
    const game = await this.gameFirestoreService.getGame(gameId);

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return {
      success: true,
      game,
    };
  }

  @Post(':id/move')
  async makeMove(
    @Param('id') gameId: string,
    @Body() makeMoveDto: MakeMoveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Get game
    const game = await this.gameFirestoreService.getGame(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Check if game is in progress
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress');
    }

    // Check if it's player's turn
    if (game.currentPlayerId !== user.id) {
      throw new BadRequestException('Not your turn');
    }

    // Check if user is a player in the game
    const isPlayerInGame = game.players.some((p) => p.userId === user.id);
    if (!isPlayerInGame) {
      throw new BadRequestException('You are not a player in this game');
    }

    // Validate and apply move using generic method
    const result = this.gameLogicService.validateAndApplyMove(
      game.gameType,
      game.state,
      { position: makeMoveDto.position },
      user.id,
      game.players,
    );

    // Get next player using game-specific logic
    const nextPlayerId = this.gameLogicService.getNextPlayerId(
      game.gameType,
      user.id,
      game.players,
    );

    // Calculate move number (count non-null cells for Tic Tac Toe)
    let moveNumber = 1;
    if ('board' in game.state && Array.isArray(game.state.board)) {
      moveNumber =
        game.state.board.filter((cell: any) => cell !== null).length + 1;
    }

    // Update game state in Firestore
    await this.gameFirestoreService.updateGameState(
      gameId,
      result.newState,
      nextPlayerId,
    );

    // Save move to history
    await this.gameFirestoreService.addMove(gameId, {
      playerId: user.id,
      position: makeMoveDto.position,
      moveNumber,
    });

    // If game is over, update game status
    if (result.gameOver) {
      await this.gameFirestoreService.endGame(gameId, result.winnerId);

      // Update stats for all players
      await this.statsService.updateStatsForGameCompletion(
        game.players.map((p) => ({ userId: p.userId })),
        result.winnerId,
        game.gameType,
      );

      // Reset lobby back to WAITING so players can play again
      await this.lobbyFirestoreService.resetLobbyAfterGame(game.lobbyId);
    }

    return {
      success: true,
      gameOver: result.gameOver,
      winnerId: result.winnerId,
      message: result.gameOver
        ? result.winnerId
          ? `Game over! Winner: ${result.winnerId}`
          : 'Game over! Draw!'
        : 'Move applied successfully',
    };
  }

  @Post(':id/abandon')
  async abandonGame(
    @Param('id') gameId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const game = await this.gameFirestoreService.getGame(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Check if user is in the game
    const isPlayerInGame = game.players.some((p) => p.userId === user.id);
    if (!isPlayerInGame) {
      throw new BadRequestException('You are not in this game');
    }

    // Check if game is already finished
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is already finished');
    }

    await this.gameFirestoreService.abandonGame(gameId);

    // Update stats for all players (abandoned game)
    // Abandoning player gets a loss, others just get played incremented
    await this.statsService.updateStatsForGameAbandonment(
      game.players.map((p) => ({ userId: p.userId })),
      user.id,
      game.gameType,
    );

    // Reset lobby back to WAITING so players can play again
    await this.lobbyFirestoreService.resetLobbyAfterGame(game.lobbyId);

    return {
      success: true,
      message: 'Game abandoned',
    };
  }

  @Get(':id/moves')
  async getGameMoves(@Param('id') gameId: string) {
    const moves = await this.gameFirestoreService.getGameMoves(gameId);

    return {
      success: true,
      moves,
      count: moves.length,
    };
  }
}
