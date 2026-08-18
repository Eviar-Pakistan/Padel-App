import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { PaddleOwnerModule } from './paddle-owner/paddle-owner.module';
import { CoachesModule } from './coaches/coaches.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CourtsModule } from './courts/courts.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { ChallengesModule } from './challenges/challenges.module';
import { RefereesModule } from './referees/referees.module';
import { MatchesModule } from './matches/matches.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    SuperAdminModule,
    PaddleOwnerModule,
    CoachesModule,
    ProductsModule,
    OrdersModule,
    CourtsModule,
    NewsModule,
    NotificationsModule,
    ChatModule,
    ChallengesModule,
    RefereesModule,
    MatchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
