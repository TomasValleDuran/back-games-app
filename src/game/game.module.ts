import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameFirestoreService } from './game-firestore.service';
import { GameLogicService } from './game-logic.service';
import { TicTacToeLogic } from './games/tic-tac-toe.logic';
import { Connect4Logic } from './games/connect4.logic';
import { LobbyModule } from '@lobby/lobby.module';
import { StatsModule } from '@stats/stats.module';

@Module({
  imports: [LobbyModule, StatsModule],
  controllers: [GameController],
  providers: [
    GameFirestoreService,
    GameLogicService,
    TicTacToeLogic,
    Connect4Logic,
  ],
  exports: [GameFirestoreService, GameLogicService],
})
export class GameModule {}
