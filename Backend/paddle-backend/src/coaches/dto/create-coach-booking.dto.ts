import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCoachBookingDto {
  @IsDateString()
  bookingDate!: string; // YYYY-MM-DD

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be HH:mm (24h)',
  })
  startTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
