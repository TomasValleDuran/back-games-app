# 🎮 Real-Time Multiplayer Games Backend - Development Plan

## Project Overview
Backend for a mobile game hub app supporting real-time multiplayer games (tic-tac-toe, etc.) with user authentication, matchmaking, statistics tracking, and leaderboards.

---

## 🎯 Technology Stack

### Core Technologies
- **NestJS** - Backend framework
- **WebSockets (Socket.IO)** - Real-time bidirectional communication
- **Firebase Auth** - User authentication & management
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database (users, games, stats)
- **Redis** - Session management, matchmaking queues, active game state (optional for Phase 1)

### Key Packages to Install
```json
{
  "@nestjs/websockets": "^11.0.0",
  "@nestjs/platform-socket.io": "^11.0.0",
  "socket.io": "^4.6.0",
  "@nestjs/passport": "^11.0.0",
  "passport": "^0.7.0",
  "firebase-admin": "^12.0.0",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

---

## 📁 Planned Module Structure

```
src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts              # Firebase user sync to DB
│   ├── firebase-auth.guard.ts       # Guard for REST endpoints
│   ├── firebase-auth.strategy.ts    # Passport strategy
│   └── decorators/
│       └── current-user.decorator.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── dto/
├── games/
│   ├── games.module.ts
│   ├── games.service.ts
│   ├── games.controller.ts
│   ├── game-logic/
│   │   ├── game-engine.interface.ts
│   │   ├── tic-tac-toe.engine.ts
│   │   └── connect-four.engine.ts   # Future
│   └── dto/
├── matchmaking/
│   ├── matchmaking.module.ts
│   ├── matchmaking.service.ts       # Queue management
│   └── matchmaking.gateway.ts       # WebSocket handlers
├── websocket/
│   ├── websocket.module.ts
│   ├── websocket.gateway.ts         # Main WebSocket gateway
│   └── websocket-auth.guard.ts      # Guard for Socket connections
├── statistics/
│   ├── statistics.module.ts
│   ├── statistics.service.ts
│   ├── statistics.controller.ts     # Leaderboards, user stats
│   └── dto/
└── common/
    ├── filters/
    ├── interceptors/
    └── types/
```

---

## 💾 Database Schema (Prisma)

### Initial Schema Design

```prisma
// User management
model User {
  id           String   @id @default(cuid())
  firebaseUid  String   @unique
  email        String   @unique
  username     String   @unique
  displayName  String?
  photoURL     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastSeenAt   DateTime @default(now())
  
  statistics   UserStatistics[]
  gameParticipants GameParticipant[]
  gameMoves    GameMove[]
  
  @@index([firebaseUid])
  @@index([email])
}

// Game types enum
enum GameType {
  TIC_TAC_TOE
  CONNECT_FOUR
  // Add more games later
}

// Game status enum
enum GameStatus {
  WAITING      // Waiting for players
  IN_PROGRESS  // Game is active
  COMPLETED    // Game finished normally
  ABANDONED    // Game abandoned (player disconnected too long)
}

// Individual game instance
model Game {
  id          String      @id @default(cuid())
  gameType    GameType
  status      GameStatus  @default(WAITING)
  winnerId    String?
  isDraw      Boolean     @default(false)
  startedAt   DateTime    @default(now())
  endedAt     DateTime?
  
  participants GameParticipant[]
  moves        GameMove[]
  
  @@index([status])
  @@index([gameType, status])
}

// Links users to games
model GameParticipant {
  id        String   @id @default(cuid())
  gameId    String
  userId    String
  side      String   // "player1", "player2", "X", "O" depending on game
  isWinner  Boolean  @default(false)
  joinedAt  DateTime @default(now())
  
  game      Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([gameId, userId])
  @@index([userId])
  @@index([gameId])
}

// Individual moves in a game
model GameMove {
  id          String   @id @default(cuid())
  gameId      String
  userId      String
  moveNumber  Int      // 1, 2, 3... for replay
  moveData    Json     // Flexible: {row: 0, col: 1} for tic-tac-toe
  timestamp   DateTime @default(now())
  
  game        Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([gameId, moveNumber])
  @@index([gameId])
}

// Aggregated user statistics per game type
model UserStatistics {
  id        String   @id @default(cuid())
  userId    String
  gameType  GameType
  wins      Int      @default(0)
  losses    Int      @default(0)
  draws     Int      @default(0)
  totalGames Int     @default(0)
  rating    Int      @default(1000) // ELO rating (optional)
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, gameType])
  @@index([gameType, rating]) // For leaderboards
}
```

---

## 🔐 Firebase Authentication Flow

### How It Works

1. **Mobile App** → Firebase SDK → User logs in (email/password, Google, Apple, etc.)
2. **Firebase** → Returns ID Token to mobile app
3. **Mobile App** → Sends ID Token in Authorization header to NestJS
4. **NestJS** → Verifies token with Firebase Admin SDK
5. **NestJS** → Checks if user exists in DB, creates if first time
6. **NestJS** → Returns app-specific data

### Firebase Setup Steps
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication methods (Email/Password, Google, Apple)
3. Go to Project Settings → Service Accounts
4. Generate new private key (downloads JSON file)
5. Save as `firebase-service-account.json` in project root
6. **Add to .gitignore!**
7. Set environment variable: `FIREBASE_SERVICE_ACCOUNT_PATH`

### User Sync Strategy
- First API call from Firebase user → Create user in PostgreSQL
- Store: firebaseUid (for lookups), email, username, displayName, photoURL
- Link all game data to your DB user ID
- Update lastSeenAt on each request

---

## 🔄 WebSocket Architecture

### Connection Flow

```
1. Client connects to WebSocket with Firebase ID token
   → ws://your-server.com?token=FIREBASE_ID_TOKEN
   
2. Server validates token via Firebase Admin SDK
   
3. Server stores mapping: userId → socketId
   
4. Client can now:
   - Join matchmaking queue
   - Create/join private rooms
   - Send game moves
   - Chat with opponent
   
5. When matched → Both players join a "game room" (Socket.IO room)
   
6. All game updates broadcast to room only
   
7. On disconnect → Handle reconnection or forfeit logic
```

### Socket Events Design

#### Client → Server Events
```typescript
// Matchmaking
'matchmaking:join' → { gameType: 'TIC_TAC_TOE' }
'matchmaking:leave' → {}

// Gameplay
'game:make_move' → { gameId: string, moveData: {row: number, col: number} }
'game:resign' → { gameId: string }
'game:offer_draw' → { gameId: string }
'game:accept_draw' → { gameId: string }

// Chat (optional)
'game:chat' → { gameId: string, message: string }

// Connection
'disconnect' → automatic
'reconnect' → automatic
```

#### Server → Client Events
```typescript
// Matchmaking
'matchmaking:searching' → { estimatedWait: number }
'matchmaking:match_found' → { gameId: string, opponent: User, yourSide: string }

// Gameplay
'game:started' → { gameId: string, gameState: GameState }
'game:update' → { gameState: GameState }
'game:opponent_move' → { moveData: any, gameState: GameState }
'game:your_turn' → {}
'game:over' → { result: 'win'|'loss'|'draw', reason: string, stats: GameStats }

// Connection
'game:opponent_disconnected' → { reconnectDeadline: timestamp }
'game:opponent_reconnected' → {}

// Errors
'error' → { message: string, code: string }
```

### Game State Structure (Example for Tic-Tac-Toe)
```typescript
interface GameState {
  gameId: string;
  gameType: 'TIC_TAC_TOE';
  board: ('X' | 'O' | null)[][];  // 3x3 array
  currentTurn: 'player1' | 'player2';
  players: {
    player1: { userId: string, username: string, side: 'X' };
    player2: { userId: string, username: string, side: 'O' };
  };
  status: 'in_progress' | 'completed';
  winner?: string;
  winningLine?: number[];  // For UI highlighting
}
```

---

## 🎮 Game Logic Implementation Strategy

### Abstraction Pattern
Create a generic `GameEngine` interface that all games implement:

```typescript
interface GameEngine {
  gameType: GameType;
  initializeGame(): GameState;
  validateMove(gameState: GameState, move: any, playerId: string): boolean;
  applyMove(gameState: GameState, move: any, playerId: string): GameState;
  checkWinCondition(gameState: GameState): WinResult;
  isGameOver(gameState: GameState): boolean;
}
```

Each game (tic-tac-toe, connect-four) implements this interface.

### Where to Store Active Game State

**Option A: In-Memory (Simple, for MVP)**
- Store in Map/Object in service
- Fast, simple
- Lost on server restart
- Works for single server

**Option B: Redis (Recommended for production)**
- Store game state in Redis
- Survives server restart
- Works with multiple servers (horizontal scaling)
- Set TTL for auto-cleanup

**Recommendation:** Start with Option A, migrate to Redis later.

---

## 🎯 Development Phases (Step-by-Step Checklist)

### ✅ Phase 1: Project Setup & Firebase Auth

#### 1.1 Environment Setup
- [ ] Install PostgreSQL locally or use Docker
- [ ] Create `.env` file with:
  ```
  DATABASE_URL="postgresql://user:password@localhost:5432/games_app"
  FIREBASE_SERVICE_ACCOUNT_PATH="./firebase-service-account.json"
  PORT=3000
  ```
- [ ] Add `.env` and `firebase-service-account.json` to `.gitignore`

#### 1.2 Install Dependencies
- [ ] Install Prisma: `npm install prisma @prisma/client`
- [ ] Install Firebase Admin: `npm install firebase-admin`
- [ ] Install validation: `npm install class-validator class-transformer`
- [ ] Install Passport: `npm install @nestjs/passport passport`

#### 1.3 Prisma Setup
- [ ] Run `npx prisma init`
- [ ] Copy the database schema from above into `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Verify database tables created

#### 1.4 Firebase Setup
- [ ] Create Firebase project
- [ ] Enable Email/Password authentication
- [ ] Download service account JSON
- [ ] Place in project root
- [ ] Initialize Firebase Admin in app

#### 1.5 Auth Module
- [ ] Generate auth module: `nest g module auth`
- [ ] Generate auth service: `nest g service auth`
- [ ] Create Firebase initialization service
- [ ] Create `firebase-auth.guard.ts`
- [ ] Create `firebase-auth.strategy.ts` (Passport)
- [ ] Create `@CurrentUser()` decorator
- [ ] Implement user sync logic (Firebase → PostgreSQL)

#### 1.6 Users Module
- [ ] Generate users module: `nest g module users`
- [ ] Generate users service: `nest g service users`
- [ ] Generate users controller: `nest g controller users`
- [ ] Create DTOs (UserResponseDto, UpdateUserDto)
- [ ] Implement CRUD operations
- [ ] Create endpoint: `GET /users/me` (protected with Firebase guard)
- [ ] Create endpoint: `PATCH /users/me` (update profile)

#### 1.7 Testing Phase 1
- [ ] Test Firebase token verification
- [ ] Test user creation on first login
- [ ] Test protected endpoints with valid/invalid tokens
- [ ] Test user profile retrieval

---

### ✅ Phase 2: WebSocket Infrastructure

#### 2.1 Install WebSocket Dependencies
- [ ] Install: `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io`

#### 2.2 WebSocket Module
- [ ] Generate websocket module: `nest g module websocket`
- [ ] Create `websocket.gateway.ts`
- [ ] Implement connection handler with Firebase token verification
- [ ] Create `websocket-auth.guard.ts`
- [ ] Store socket connections in memory (userId → socket mapping)
- [ ] Handle disconnection cleanup

#### 2.3 Connection Authentication
- [ ] Extract token from handshake: `socket.handshake.auth.token`
- [ ] Verify Firebase token on connection
- [ ] Reject invalid connections
- [ ] Store authenticated user in socket.data

#### 2.4 Basic Event Handlers
- [ ] Implement `connection` handler
- [ ] Implement `disconnect` handler
- [ ] Create test event: `ping` → `pong`

#### 2.5 Testing Phase 2
- [ ] Test WebSocket connection with valid token
- [ ] Test connection rejection with invalid token
- [ ] Test ping/pong events
- [ ] Test disconnect handling
- [ ] Use tool like Postman or write simple test client

---

### ✅ Phase 3: Tic-Tac-Toe Game Implementation

#### 3.1 Games Module
- [ ] Generate games module: `nest g module games`
- [ ] Generate games service: `nest g service games`
- [ ] Generate games controller: `nest g controller games`

#### 3.2 Game Engine
- [ ] Create `game-logic/game-engine.interface.ts`
- [ ] Create `game-logic/tic-tac-toe.engine.ts`
- [ ] Implement:
  - [ ] `initializeGame()` - Create empty 3x3 board
  - [ ] `validateMove()` - Check if move is legal
  - [ ] `applyMove()` - Place X or O
  - [ ] `checkWinCondition()` - Check rows, cols, diagonals
  - [ ] `isGameOver()` - Win or draw detection

#### 3.3 Game State Management
- [ ] Create service to store active games (in-memory Map)
- [ ] Methods: `createGame()`, `getGame()`, `updateGame()`, `deleteGame()`
- [ ] Implement game timeout logic (forfeit after 5 min inactive)

#### 3.4 Matchmaking Module
- [ ] Generate matchmaking module: `nest g module matchmaking`
- [ ] Generate matchmaking service: `nest g service matchmaking`
- [ ] Create matchmaking queue (simple array for MVP)
- [ ] Logic: When 2 players in queue → create game, notify both

#### 3.5 WebSocket Game Events
In `websocket.gateway.ts`:
- [ ] Add event: `matchmaking:join`
  - Add user to queue
  - If match found → create game, notify both players
- [ ] Add event: `matchmaking:leave`
  - Remove user from queue
- [ ] Add event: `game:make_move`
  - Validate move
  - Update game state
  - Check win condition
  - Broadcast to opponent
  - Save move to database
- [ ] Add event: `game:resign`
  - End game, declare opponent winner

#### 3.6 Game Persistence
- [ ] On game start: Create `Game` record in DB (status: IN_PROGRESS)
- [ ] On each move: Create `GameMove` record
- [ ] On game end: Update `Game` (status: COMPLETED, winnerId)

#### 3.7 Testing Phase 3
- [ ] Test matchmaking with 2 clients
- [ ] Test full tic-tac-toe game flow
- [ ] Test move validation (invalid moves rejected)
- [ ] Test win detection (all 8 possible lines)
- [ ] Test draw detection (board full, no winner)
- [ ] Test database persistence

---

### ✅ Phase 4: Statistics & Leaderboards

#### 4.1 Statistics Module
- [ ] Generate statistics module: `nest g module statistics`
- [ ] Generate statistics service: `nest g service statistics`
- [ ] Generate statistics controller: `nest g controller statistics`

#### 4.2 Stats Calculation
- [ ] On game end: Update `UserStatistics` for both players
- [ ] Increment wins/losses/draws/totalGames
- [ ] Calculate win rate

#### 4.3 Leaderboard Endpoints
- [ ] `GET /statistics/leaderboard/:gameType` - Top 100 players by wins
- [ ] `GET /statistics/me` - Current user's stats across all games
- [ ] `GET /statistics/me/:gameType` - Current user's stats for specific game

#### 4.4 User Profile Stats
- [ ] Add stats to `GET /users/me` response
- [ ] Show total wins, losses, favorite game

#### 4.5 Testing Phase 4
- [ ] Play several games, verify stats update correctly
- [ ] Test leaderboard queries
- [ ] Test stats for multiple game types

---

### ✅ Phase 5: Polish & Additional Features

#### 5.1 Reconnection Logic
- [ ] When player disconnects, don't end game immediately
- [ ] Give 2-minute grace period
- [ ] Notify opponent of disconnection
- [ ] If reconnect in time → resume game
- [ ] If not → forfeit

#### 5.2 Private Games / Friend Challenges
- [ ] Add `roomCode` to Game model
- [ ] Endpoint: `POST /games/create-private` → Returns room code
- [ ] Socket event: `game:join_private` → { roomCode: string }
- [ ] Share code between friends outside app

#### 5.3 Game History
- [ ] Endpoint: `GET /games/history` - User's past games
- [ ] Endpoint: `GET /games/:gameId` - Single game details with moves
- [ ] Optional: Game replay feature

#### 5.4 Chat System (Optional)
- [ ] Add `game:chat` event
- [ ] Broadcast to opponent only
- [ ] Optional: Store in DB for moderation

#### 5.5 Rate Limiting & Security
- [ ] Add rate limiting to prevent spam
- [ ] Validate all user inputs
- [ ] Add request throttling on WebSocket events

#### 5.6 Testing Phase 5
- [ ] Test reconnection scenarios
- [ ] Test private games
- [ ] Load testing with multiple concurrent games

---

### ✅ Phase 6: Add Second Game (Connect Four)

#### 6.1 Game Engine
- [ ] Create `game-logic/connect-four.engine.ts`
- [ ] Implement 7x6 board
- [ ] Implement drop physics (piece falls to lowest row)
- [ ] Implement win detection (4 in a row: horizontal, vertical, diagonal)

#### 6.2 Integration
- [ ] Add `CONNECT_FOUR` to `GameType` enum
- [ ] Update matchmaking to support game type selection
- [ ] Test full flow

#### 6.3 Verify Abstraction
- [ ] Both games should use same WebSocket events
- [ ] Minimal code duplication
- [ ] Easy to add new games

---

## 🚀 Running the Application

### Development
```bash
npm run start:dev
```

### Database Commands
```bash
# Create migration
npx prisma migrate dev --name <migration-name>

# View database
npx prisma studio

# Reset database (careful!)
npx prisma migrate reset
```

### Testing WebSocket Connections
Use a tool like:
- Postman (has WebSocket support)
- Socket.IO client test page
- Write simple HTML test client

---

## 📋 Key Technical Decisions

### Database
- [x] PostgreSQL (relational data fits well)
- [ ] Add Redis later for active game state & matchmaking queue

### Authentication
- [x] Firebase Auth (mobile-friendly, easy social auth)
- Alternative considered: JWT in-house (more work, less mobile-optimized)

### WebSocket Library
- [x] Socket.IO (automatic reconnection, room support, battle-tested)
- Alternative: Native WebSockets (less features, more manual work)

### Game State Storage
- [x] In-memory for MVP (simple)
- [ ] Migrate to Redis for production (scalability, persistence)

### Matchmaking Algorithm
- [x] Simple FIFO queue for MVP
- [ ] Add ELO-based matchmaking later
- [ ] Add game type preference

---

## 🔍 Testing Strategy

### Unit Tests
- Game engines (tic-tac-toe logic, win detection)
- Move validation
- Statistics calculations

### Integration Tests
- Auth flow (Firebase → NestJS → DB)
- Game creation and persistence
- Matchmaking logic

### E2E Tests
- Full game flow (2 clients playing)
- WebSocket connection/disconnection
- Leaderboard queries

---

## 🎯 Nice-to-Have Features (Post-MVP)

- [ ] ELO rating system
- [ ] Achievements/badges
- [ ] Daily challenges
- [ ] Spectator mode
- [ ] Game replays
- [ ] Friend system
- [ ] Push notifications (match found, your turn)
- [ ] In-game chat with emoji/stickers
- [ ] Tournament system
- [ ] Multiple game modes (ranked, casual, time-attack)

---

## 📚 Useful Resources

- NestJS Docs: https://docs.nestjs.com/
- Socket.IO Docs: https://socket.io/docs/v4/
- Prisma Docs: https://www.prisma.io/docs/
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Firebase Auth: https://firebase.google.com/docs/auth

---

## 🐛 Common Issues & Solutions

### Issue: Firebase token verification fails
- **Solution**: Check service account JSON path, ensure it's valid
- **Solution**: Verify token is being sent correctly from client

### Issue: WebSocket connection rejected
- **Solution**: Check CORS settings in main.ts
- **Solution**: Verify token format in handshake

### Issue: Game state not updating
- **Solution**: Check Socket.IO rooms - ensure both players joined
- **Solution**: Verify event names match client/server

### Issue: Database constraint errors
- **Solution**: Check unique constraints (username, email)
- **Solution**: Ensure Firebase UID is being stored correctly

---

## 🎉 Success Criteria

You'll know each phase is complete when:

**Phase 1**: You can register via Firebase, login, and access `/users/me`  
**Phase 2**: You can connect to WebSocket with Firebase token  
**Phase 3**: Two clients can play full tic-tac-toe game  
**Phase 4**: Stats update after games, leaderboard shows correct data  
**Phase 5**: Reconnection works, private games work  
**Phase 6**: Connect Four is playable  

---

**Good luck! 🚀 Start with Phase 1.1 and work your way down. Feel free to ask questions as you implement each part.**

