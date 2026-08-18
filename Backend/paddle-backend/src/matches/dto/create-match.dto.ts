import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

export class CreateMatchDto {
  @IsString()
  @MinLength(1)
  courtId!: string;

  @IsString()
  @MinLength(1)
  timeSlotId!: string;

  @IsDateString()
  bookingDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @Type(() => Number)
  @IsInt({ each: true })
  playerIds!: number[];

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  openSlots?: number;

  @IsOptional()
  @IsString()
  refereeId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
