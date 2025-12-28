import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@prisma/prisma.module';
import { FirebaseModule } from '@firebase/firebase.module';
import { UserModule } from '@user/user.module';
import { LobbyModule } from '@lobby/lobby.module';
import { GameModule } from '@game/game.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    FirebaseModule,
    UserModule,
    LobbyModule,
    GameModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
