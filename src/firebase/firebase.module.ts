import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { PrismaModule } from '@prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FirebaseService, FirebaseAuthGuard],
  exports: [FirebaseService, FirebaseAuthGuard],
})
export class FirebaseModule {}
