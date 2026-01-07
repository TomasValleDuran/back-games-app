-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('TIC_TAC_TOE', 'CONNECT4');

-- CreateTable
CREATE TABLE "GameStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameStats_userId_idx" ON "GameStats"("userId");

-- CreateIndex
CREATE INDEX "GameStats_gameType_idx" ON "GameStats"("gameType");

-- CreateIndex
CREATE UNIQUE INDEX "GameStats_userId_gameType_key" ON "GameStats"("userId", "gameType");

-- AddForeignKey
ALTER TABLE "GameStats" ADD CONSTRAINT "GameStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
