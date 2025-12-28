import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

/**
 * DTO for making a move in a game
 * Note: Position validation is game-specific
 * For Tic Tac Toe: 0-8 (3x3 board)
 * For other games, extend this DTO or create game-specific DTOs
 */
export class MakeMoveDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(8) // Tic Tac Toe specific - will need to be dynamic for other games
  position: number;
}
