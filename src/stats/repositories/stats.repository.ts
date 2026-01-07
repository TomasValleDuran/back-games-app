import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { GameType } from '@generated/prisma/client';

export interface GameStatsData {
  userId: string;
  gameType: GameType;
  wins: number;
  losses: number;
  draws: number;
  played: number;
}

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStatsByUserId(userId: string) {
    return this.prisma.gameStats.findMany({
      where: { userId },
      orderBy: { gameType: 'asc' },
    });
  }

  async getStatsByUserAndGameType(
    userId: string,
    gameType: GameType,
  ) {
    return this.prisma.gameStats.findUnique({
      where: {
        userId_gameType: {
          userId,
          gameType,
        },
      },
    });
  }

  async incrementWin(userId: string, gameType: GameType) {
    return this.prisma.gameStats.upsert({
      where: {
        userId_gameType: {
          userId,
          gameType,
        },
      },
      create: {
        userId,
        gameType,
        wins: 1,
        losses: 0,
        draws: 0,
        played: 1,
      },
      update: {
        wins: { increment: 1 },
        played: { increment: 1 },
      },
    });
  }

  async incrementLoss(userId: string, gameType: GameType) {
    return this.prisma.gameStats.upsert({
      where: {
        userId_gameType: {
          userId,
          gameType,
        },
      },
      create: {
        userId,
        gameType,
        wins: 0,
        losses: 1,
        draws: 0,
        played: 1,
      },
      update: {
        losses: { increment: 1 },
        played: { increment: 1 },
      },
    });
  }

  async incrementDraw(userId: string, gameType: GameType) {
    return this.prisma.gameStats.upsert({
      where: {
        userId_gameType: {
          userId,
          gameType,
        },
      },
      create: {
        userId,
        gameType,
        wins: 0,
        losses: 0,
        draws: 1,
        played: 1,
      },
      update: {
        draws: { increment: 1 },
        played: { increment: 1 },
      },
    });
  }

  async incrementPlayed(userId: string, gameType: GameType) {
    return this.prisma.gameStats.upsert({
      where: {
        userId_gameType: {
          userId,
          gameType,
        },
      },
      create: {
        userId,
        gameType,
        wins: 0,
        losses: 0,
        draws: 0,
        played: 1,
      },
      update: {
        played: { increment: 1 },
      },
    });
  }

  async updateStatsForGameCompletion(
    players: Array<{ userId: string }>,
    winnerId: string | null,
    gameType: GameType,
  ) {
    // If there's a winner, increment win for winner and loss for others
    // If draw, increment draw for all players
    // All players get "played" incremented (handled in incrementWin/Loss/Draw)
    
    if (winnerId) {
      // Winner gets a win (and played is incremented)
      await this.incrementWin(winnerId, gameType);
      
      // Others get a loss (and played is incremented)
      for (const player of players) {
        if (player.userId !== winnerId) {
          await this.incrementLoss(player.userId, gameType);
        }
      }
    } else {
      // Draw - all players get a draw (and played is incremented)
      for (const player of players) {
        await this.incrementDraw(player.userId, gameType);
      }
    }
  }

  async updateStatsForGameAbandonment(
    players: Array<{ userId: string }>,
    gameType: GameType,
  ) {
    // All players get "played" incremented (they did play the game)
    for (const player of players) {
      await this.incrementPlayed(player.userId, gameType);
    }
  }
}

