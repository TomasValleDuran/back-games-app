import { IsEnum } from 'class-validator';
import { GameType } from '../enums/lobby.enums';

export class UpdateGameTypeDto {
  @IsEnum(GameType)
  gameType: GameType;
}

