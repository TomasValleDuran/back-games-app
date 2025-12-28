import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameFirestoreService } from './game-firestore.service';
import { GameLogicService } from './game-logic.service';
import { TicTacToeLogic } from './games/tic-tac-toe.logic';
import { LobbyModule } from '../lobby/lobby.module';

@Module({
  imports: [LobbyModule],
  controllers: [GameController],
  providers: [GameFirestoreService, GameLogicService, TicTacToeLogic],
  exports: [GameFirestoreService, GameLogicService],
})
export class GameModule {}
