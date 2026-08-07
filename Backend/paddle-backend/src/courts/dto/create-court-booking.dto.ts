import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCourtBookingDto {
  @IsString()
  timeSlotId!: string;

  @IsDateString()
  bookingDate!: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  notes?: string;
}
