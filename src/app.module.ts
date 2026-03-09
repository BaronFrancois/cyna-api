import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
=======
import { PayementModule } from './v1/payement/payement.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PayementModule],
>>>>>>> 3647e5ee6ba623709b5f6d1435e7ecc20831dda3
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
