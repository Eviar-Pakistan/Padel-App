import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PaddleOwnerController } from './paddle-owner.controller';
import { PaddleOwnerService } from './paddle-owner.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],
  controllers: [PaddleOwnerController],
  providers: [PaddleOwnerService],
})
export class PaddleOwnerModule {}
