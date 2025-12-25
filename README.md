# Games App - Backend API

NestJS backend API for the Games mobile application with PostgreSQL and Prisma ORM.

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Database
```bash
docker-compose up -d
```

### 3. Setup Environment
Create a `.env` file in the root:
```env
DATABASE_URL="postgresql://games_user:games_password@localhost:5432/games_db?schema=public"
PORT=3000
NODE_ENV=development
```

### 4. Initialize Database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the App
```bash
npm run start:dev
```

The API will be running at `http://localhost:3000` 🚀


## Development Commands

```bash
# Development with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run tests
npm run test

# Lint & format
npm run lint
npm run format
```

## Database Management

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Open Prisma Studio (Database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Docker Commands

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Stop and remove all data
docker-compose down -v

# View logs
docker-compose logs -f
```

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16
- **ORM**: Prisma 7
- **Language**: TypeScript 5
- **Validation**: class-validator & class-transformer

## License

UNLICENSED
