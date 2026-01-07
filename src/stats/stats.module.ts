import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { StatsRepository } from './repositories/stats.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController],
  providers: [StatsService, StatsRepository],
  exports: [StatsService],
})
export class StatsModule {}

