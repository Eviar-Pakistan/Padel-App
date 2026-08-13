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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
