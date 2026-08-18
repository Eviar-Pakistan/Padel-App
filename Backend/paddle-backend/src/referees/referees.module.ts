import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ImageUploadService } from '../common/image-upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RefereesController } from './referees.controller';
import { RefereesService } from './referees.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [RefereesController],
  providers: [RefereesService, ImageUploadService],
})
export class RefereesModule {}
