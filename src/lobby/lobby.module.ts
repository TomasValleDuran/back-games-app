import { Module } from '@nestjs/common';
import { LobbyController } from './lobby.controller';
import { LobbyFirestoreService } from './lobby-firestore.service';
import { PrismaModule } from '@prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LobbyController],
  providers: [LobbyFirestoreService],
  exports: [LobbyFirestoreService],
})
export class LobbyModule {}
