import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TimeSlotDto } from './create-court.dto';

function parseTimeSlots(value: unknown): TimeSlotDto[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(raw)) return undefined;

  return raw.map((item: { startTime?: string; endTime?: string }) => {
    const slot = new TimeSlotDto();
    slot.startTime = item?.startTime ?? '';
    slot.endTime = item?.endTime ?? '';
    return slot;
  });
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : toBoolean(value),
  )
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseTimeSlots(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];

  /** Existing image URLs to keep when updating (JSON string array) */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  existingImages?: string[];
}
