import { IsEnum } from 'class-validator';
import { BookingStatus } from '../../../generated/prisma/client';

export class UpdateCoachBookingStatusDto {
  @IsEnum(BookingStatus)
  status!: BookingStatus;
}
