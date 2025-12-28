export interface BaseGameState {
  gameOver: boolean;
  winner: string | null;
  isDraw: boolean;
}

export interface TicTacToeGameState extends BaseGameState {
  board: (string | null)[]; // 3x3 board as flat array (9 cells)
}

export type GameState = TicTacToeGameState;

export function isTicTacToeState(
  state: GameState,
): state is TicTacToeGameState {
  return 'board' in state && Array.isArray(state.board);
}
