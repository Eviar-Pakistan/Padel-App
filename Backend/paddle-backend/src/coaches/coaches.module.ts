import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';

@Module({
  imports: [PrismaModule],
  controllers: [CoachesController],
  providers: [CoachesService],
})
export class CoachesModule {}
