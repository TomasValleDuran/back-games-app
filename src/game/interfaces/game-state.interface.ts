export interface BaseGameState {
  gameOver: boolean;
  winner: string | null;
  isDraw: boolean;
}

export interface TicTacToeGameState extends BaseGameState {
  board: (string | null)[]; // 3x3 board as flat array (9 cells)
}

export interface Connect4GameState extends BaseGameState {
  board: (string | null)[]; // 7x6 board as flat array (42 cells)
}

export type GameState = TicTacToeGameState | Connect4GameState;

export function isTicTacToeState(
  state: GameState,
): state is TicTacToeGameState {
  return 'board' in state && Array.isArray(state.board) && state.board.length === 9;
}

export function isConnect4State(
  state: GameState,
): state is Connect4GameState {
  return 'board' in state && Array.isArray(state.board) && state.board.length === 42;
}
