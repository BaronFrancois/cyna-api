import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PayementModule } from './v1/payement/payement.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PayementModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
