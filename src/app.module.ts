import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { CarouselModule } from './carousel/carousel.module';
import { HomeTextBlocksModule } from './home-text-blocks/home-text-blocks.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ContactModule } from './contact/contact.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { PayementModule } from './v1/payement/payement.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    PaymentMethodsModule,
    CategoriesModule,
    ProductsModule,
    SubscriptionPlansModule,
    CarouselModule,
    HomeTextBlocksModule,
    CartModule,
    OrdersModule,
    SubscriptionsModule,
    InvoicesModule,
    ContactModule,
    ChatbotModule,
    PayementModule,
    AdminAnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
