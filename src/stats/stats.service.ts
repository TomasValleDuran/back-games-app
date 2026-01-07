import { Injectable } from '@nestjs/common';
import { StatsRepository } from './repositories/stats.repository';
import { GameType } from '@generated/prisma/client';

export interface PlayerStats {
  userId: string;
  gameType: GameType;
  wins: number;
  losses: number;
  draws: number;
  played: number;
  totalGames: number;
  winRate: number;
}

export interface AggregateStats {
  userId: string;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalPlayed: number;
  overallWinRate: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  async getUserStats(userId: string): Promise<PlayerStats[]> {
    const stats = await this.statsRepository.getStatsByUserId(userId);

    return stats.map((stat) => this.calculateStats(stat));
  }

  async getUserStatsByGameType(
    userId: string,
    gameType: GameType,
  ): Promise<PlayerStats | null> {
    const stat = await this.statsRepository.getStatsByUserAndGameType(
      userId,
      gameType,
    );

    if (!stat) {
      return null;
    }

    return this.calculateStats(stat);
  }

  async getAggregateStats(userId: string): Promise<AggregateStats> {
    const stats = await this.statsRepository.getStatsByUserId(userId);

    const aggregate = stats.reduce(
      (acc, stat) => {
        acc.totalWins += stat.wins;
        acc.totalLosses += stat.losses;
        acc.totalDraws += stat.draws;
        acc.totalPlayed += stat.played;
        return acc;
      },
      {
        totalWins: 0,
        totalLosses: 0,
        totalDraws: 0,
        totalPlayed: 0,
      },
    );

    const overallWinRate =
      aggregate.totalPlayed > 0
        ? (aggregate.totalWins / aggregate.totalPlayed) * 100
        : 0;

    return {
      userId,
      totalWins: aggregate.totalWins,
      totalLosses: aggregate.totalLosses,
      totalDraws: aggregate.totalDraws,
      totalPlayed: aggregate.totalPlayed,
      overallWinRate: Math.round(overallWinRate * 100) / 100, // Round to 2 decimal places
    };
  }

  async updateStatsForGameCompletion(
    players: Array<{ userId: string }>,
    winnerId: string | null,
    gameType: GameType,
  ): Promise<void> {
    await this.statsRepository.updateStatsForGameCompletion(
      players,
      winnerId,
      gameType,
    );
  }

  async updateStatsForGameAbandonment(
    players: Array<{ userId: string }>,
    gameType: GameType,
  ): Promise<void> {
    await this.statsRepository.updateStatsForGameAbandonment(players, gameType);
  }

  private calculateStats(stat: {
    wins: number;
    losses: number;
    draws: number;
    played: number;
    userId: string;
    gameType: GameType;
  }): PlayerStats {
    // totalGames should match played (since played counts all completed/abandoned games)
    const totalGames = stat.played;
    const winRate = totalGames > 0 ? (stat.wins / totalGames) * 100 : 0;

    return {
      userId: stat.userId,
      gameType: stat.gameType,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      played: stat.played,
      totalGames,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
    };
  }
}
