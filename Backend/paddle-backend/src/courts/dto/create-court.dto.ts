import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { CourtEnvironmentType } from '../../../generated/prisma/client';

export class TimeSlotDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be HH:mm (24h)',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be HH:mm (24h)',
  })
  endTime!: string;
}

function normalizeSlotTime(value: unknown): string {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  const h = Number(match[1]);
  const m = match[2];
  if (Number.isNaN(h) || h > 23) return raw;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function parseTimeSlots(value: unknown): TimeSlotDto[] {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw.map((item: { startTime?: string; endTime?: string }) => {
    const slot = new TimeSlotDto();
    slot.startTime = normalizeSlotTime(item?.startTime);
    slot.endTime = normalizeSlotTime(item?.endTime);
    return slot;
  });
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export class CreateCourtDto {
  @IsString()
  name!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  pricePerHour!: number;

  @IsOptional()
  @IsEnum(CourtEnvironmentType)
  environmentType?: CourtEnvironmentType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @Transform(({ value }) => parseTimeSlots(value))
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots!: TimeSlotDto[];
}
