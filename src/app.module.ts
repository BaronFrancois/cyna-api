import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './v1/auth/auth.module';
import { PayementModule } from './v1/payement/payement.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PayementModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
