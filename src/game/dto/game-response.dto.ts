import { GameStatus, GameType } from '../enums/game.enums';
import { GameState } from '../interfaces/game-state.interface';
import { GamePlayer } from '../game-firestore.service';

export class GameResponseDto {
  id: string;
  lobbyId: string;
  gameType: GameType;
  status: GameStatus;
  currentPlayerId: string;
  players: GamePlayer[];
  state: GameState;
  winnerId: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

// Re-export GamePlayer for convenience
export { GamePlayer } from '../game-firestore.service';
