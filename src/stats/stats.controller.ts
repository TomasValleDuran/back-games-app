import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { FirebaseAuthGuard } from '@firebase/firebase-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '@firebase/current-user.decorator';
import { GameType } from '@generated/prisma/client';

@Controller('stats')
@UseGuards(FirebaseAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getMyStats(@CurrentUser() user: AuthenticatedUser) {
    const stats = await this.statsService.getUserStats(user.id);
    return {
      success: true,
      stats,
    };
  }

  @Get('user/:userId')
  async getUserStats(@Param('userId') userId: string) {
    const stats = await this.statsService.getUserStats(userId);
    return {
      success: true,
      stats,
    };
  }

  @Get('game/:gameType')
  async getMyStatsByGameType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('gameType') gameTypeParam: string,
  ) {
    const gameType = this.parseGameType(gameTypeParam);
    const stats = await this.statsService.getUserStatsByGameType(
      user.id,
      gameType,
    );

    if (!stats) {
      return {
        success: true,
        stats: {
          userId: user.id,
          gameType,
          wins: 0,
          losses: 0,
          draws: 0,
          played: 0,
          totalGames: 0,
          winRate: 0,
        },
      };
    }

    return {
      success: true,
      stats,
    };
  }

  @Get('user/:userId/game/:gameType')
  async getUserStatsByGameType(
    @Param('userId') userId: string,
    @Param('gameType') gameTypeParam: string,
  ) {
    const gameType = this.parseGameType(gameTypeParam);
    const stats = await this.statsService.getUserStatsByGameType(
      userId,
      gameType,
    );

    if (!stats) {
      return {
        success: true,
        stats: {
          userId,
          gameType,
          wins: 0,
          losses: 0,
          draws: 0,
          played: 0,
          totalGames: 0,
          winRate: 0,
        },
      };
    }

    return {
      success: true,
      stats,
    };
  }

  private parseGameType(gameTypeParam: string): GameType {
    const gameType = gameTypeParam.toUpperCase() as GameType;
    if (!Object.values(GameType).includes(gameType)) {
      throw new BadRequestException(
        `Invalid game type: ${gameTypeParam}. Valid types: ${Object.values(GameType).join(', ')}`,
      );
    }
    return gameType;
  }
}

