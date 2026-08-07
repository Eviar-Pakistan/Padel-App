import { IsEnum } from 'class-validator';
import { BookingStatus } from '../../../generated/prisma/client';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status!: BookingStatus;
}
