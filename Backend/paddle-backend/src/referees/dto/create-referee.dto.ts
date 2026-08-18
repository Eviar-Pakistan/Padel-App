import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import {
  RefereeStatus,
  WeekDay,
} from '../../../generated/prisma/client';

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

function toHhMm(value: unknown) {
  const s = toOptionalString(value);
  if (!s) return s;
  const match = s.match(/^([01]\d|2[0-3]):[0-5]\d/);
  return match ? match[0] : s;
}

function parseIdArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

export class CreateRefereeDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsEnum(WeekDay)
  availableFromDay?: WeekDay;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsEnum(WeekDay)
  availableToDay?: WeekDay;

  @IsOptional()
  @Transform(({ value }) => toHhMm(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'availableFromTime must be HH:mm (24h)',
  })
  availableFromTime?: string;

  @IsOptional()
  @Transform(({ value }) => toHhMm(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'availableToTime must be HH:mm (24h)',
  })
  availableToTime?: string;

  @IsOptional()
  @IsEnum(RefereeStatus)
  status?: RefereeStatus;

  @IsOptional()
  @Transform(({ value }) => parseIdArray(value))
  @IsArray()
  @IsString({ each: true })
  courtIds?: string[];
}
