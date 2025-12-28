# Games App Backend

A scalable multiplayer games backend built with **NestJS**, **Firestore**, and **PostgreSQL**. Features real-time game synchronization and a flexible architecture for adding new game types.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Firebase project with Firestore enabled

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Setup database
npx prisma db push

# 4. Start development server
npm run start:dev
```

Server runs on `http://localhost:3000`

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/games_db"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
PORT=3000
```

Get Firebase credentials from: Firebase Console → Project Settings → Service Accounts

## 📁 Project Structure

```
src/
├── firebase/              # Firebase Admin SDK & Auth
│   ├── firebase.service.ts
│   ├── firebase-auth.guard.ts
│   └── current-user.decorator.ts
├── prisma/               # Database service
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── user/                 # User management (PostgreSQL)
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── repositories/
├── lobby/                # Lobby management (Firestore)
│   ├── lobby.controller.ts
│   ├── lobby-firestore.service.ts
│   ├── enums/
│   ├── dto/
│   └── interfaces/
│       └── game-config.interface.ts  # Game-specific lobby rules
├── game/                 # Game logic & state (Firestore)
│   ├── game.controller.ts
│   ├── game-firestore.service.ts
│   ├── game-logic.service.ts        # Registry for game implementations
│   ├── games/                       # Individual game implementations
│   │   └── tic-tac-toe.logic.ts
│   ├── interfaces/
│   │   ├── game-logic.interface.ts  # Contract for game implementations
│   │   ├── game-state.interface.ts
│   │   └── move.interface.ts
│   └── enums/
└── app.module.ts
```

## 🏗️ Architecture

### Data Storage Strategy
- **PostgreSQL (Prisma)**: User accounts, profiles, persistent data
- **Firestore**: Active lobbies, game states, real-time synchronization

### Authentication Flow
1. Client authenticates with Firebase Auth
2. Client sends Firebase ID token in `Authorization: Bearer <token>` header
3. `FirebaseAuthGuard` validates token and loads user from PostgreSQL
4. `@CurrentUser()` decorator provides authenticated user to controllers

### Real-time Updates
- Clients listen to Firestore collections (`/lobbies/{id}`, `/games/{id}`)
- Backend updates Firestore via Admin SDK
- Changes propagate automatically to all connected clients

## 🎮 Adding a New Game

### 1. Add Game Type Enum

```typescript
// src/lobby/enums/lobby.enums.ts
export enum GameType {
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  YOUR_GAME = 'YOUR_GAME',  // Add here
}
```

### 2. Create Game State Interface

```typescript
// src/game/interfaces/game-state.interface.ts
export interface YourGameState extends BaseGameState {
  // Your game-specific state fields
}

export type GameState = TicTacToeGameState | YourGameState;  // Add union
```

### 3. Create Game Logic Implementation

```typescript
// src/game/games/your-game.logic.ts
@Injectable()
export class YourGameLogic implements IGameLogic {
  readonly gameType = GameType.YOUR_GAME;

  createInitialState(players: GamePlayer[]): YourGameState {
    // Initialize game state
  }

  validateAndApplyMove(...): { newState: YourGameState; gameOver: boolean; winnerId: string | null } {
    // Validate and apply move
  }

  getNextPlayerId(...): string {
    // Determine next player
  }

  createGamePlayers(...): GamePlayer[] {
    // Assign game-specific player properties
  }
}
```

### 4. Register Game Logic

```typescript
// src/game/game.module.ts
providers: [
  // ...
  YourGameLogic,  // Add here
]

// src/game/game-logic.service.ts
constructor(
  private readonly ticTacToeLogic: TicTacToeLogic,
  private readonly yourGameLogic: YourGameLogic,  // Add here
) {
  this.gameLogics = new Map([
    [GameType.TIC_TAC_TOE, this.ticTacToeLogic],
    [GameType.YOUR_GAME, this.yourGameLogic],  // Add here
  ]);
}
```

### 5. Configure Lobby Rules

```typescript
// src/lobby/interfaces/game-config.interface.ts
export const GAME_LOBBY_CONFIGS: Record<GameType, GameLobbyConfig> = {
  // ...
  [GameType.YOUR_GAME]: {
    minPlayers: 2,
    maxPlayers: 4,
    ownerMustBeReady: true,
    ownerCanToggleReady: true,
    usesReadySystem: true,
    canStart: (lobby) => {
      // Custom start validation logic
    },
  },
};
```

## 🛠️ Development

### Available Scripts

```bash
npm run start:dev      # Start development server with hot reload
npm run build         # Build for production
npm run start:prod    # Run production build
npm run lint          # Run ESLint and auto-fix
npm run format        # Format code with Prettier
npm test              # Run unit tests
npm run test:e2e      # Run end-to-end tests
```

### Code Style

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier (runs on save)
- **Type Safety**: Strict TypeScript configuration
- **Architecture**: Strategy pattern for game logic, dependency injection

### Key Principles

1. **Separation of Concerns**: Controllers handle HTTP, services handle business logic
2. **Type Safety**: No `any` types, proper interfaces everywhere
3. **Game Agnostic**: Lobby and game services work with any game type
4. **Real-time First**: Firestore for state, REST API for actions
5. **Extensibility**: Easy to add new games without modifying existing code

## 📡 API Endpoints

### Authentication
All endpoints require `Authorization: Bearer <firebase-id-token>` header.

### Lobbies
- `POST /lobbies` - Create a new lobby
- `GET /lobbies` - List available lobbies
- `GET /lobbies/:id` - Get lobby details
- `POST /lobbies/:id/join` - Join a lobby
- `POST /lobbies/:id/leave` - Leave a lobby
- `POST /lobbies/:id/ready` - Toggle ready status
- `GET /lobbies/user/current` - Get current user's lobby

### Games
- `POST /games/start/:lobbyId` - Start a game from lobby
- `GET /games/:id` - Get game state
- `POST /games/:id/move` - Make a move
- `POST /games/:id/abandon` - Abandon a game
- `GET /games/:id/moves` - Get move history

### Users
- `GET /user` - Get current user profile
- `PATCH /user/:id` - Update user profile

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🔥 Firestore Collections

### `/lobbies/{lobbyId}`
```typescript
{
  name: string;
  ownerId: string;
  gameType: GameType;
  status: 'WAITING' | 'IN_GAME' | 'FINISHED';
  maxPlayers: number;
  players: LobbyPlayer[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `/games/{gameId}`
```typescript
{
  lobbyId: string;
  gameType: GameType;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  currentPlayerId: string;
  players: GamePlayer[];
  state: GameState;
  winnerId: string | null;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
}
```

### `/games/{gameId}/moves/{moveId}`
Move history for replay and analysis.

## 🤝 Contributing

### Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Write tests for new features
   - Update documentation if needed

3. **Run checks before committing**
   ```bash
   npm run lint
   npm run format
   npm test
   ```

4. **Commit and push**
   ```bash
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Describe what changed and why
   - Reference any related issues
   - Ensure CI passes

### Code Review Guidelines

- **Keep PRs focused**: One feature/fix per PR
- **Write clear commits**: Use conventional commit messages
- **Test thoroughly**: Include unit and integration tests
- **Document changes**: Update README/docs if needed

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Reset database
npx prisma db push --force-reset
```

### Firebase Authentication Errors
- Verify `FIREBASE_PRIVATE_KEY` has `\n` for newlines
- Check service account has Firestore permissions
- Ensure Firebase project has Firestore enabled

### Port Already in Use
```bash
# Change port in .env
PORT=3001
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

UNLICENSED - Private project

---

**Happy coding! 🚀**
