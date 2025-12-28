import { IsString, IsEnum, IsInt, Min, Max, MinLength } from 'class-validator';
import { GameType } from '../enums/lobby.enums';

export class CreateLobbyDto {
  @IsString()
  @MinLength(3, { message: 'Lobby name must be at least 3 characters long' })
  name: string;

  @IsEnum(GameType)
  gameType: GameType;

  @IsInt()
  @Min(2)
  @Max(8)
  maxPlayers: number;
}
