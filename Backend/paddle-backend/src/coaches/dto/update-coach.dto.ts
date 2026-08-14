import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import {
  Gender,
  CoachStatus,
  WeekDay,
} from '../../../generated/prisma/client';

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

function emptyToNull(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function parseStringArray(value: unknown): string[] | undefined {
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

export class UpdateCoachDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  certificationLevel?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sessionRate?: number;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsEnum(WeekDay)
  availableFromDay?: WeekDay | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsEnum(WeekDay)
  availableToDay?: WeekDay | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'availableFromTime must be HH:mm (24h)',
  })
  availableFromTime?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'availableToTime must be HH:mm (24h)',
  })
  availableToTime?: string | null;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsEnum(CoachStatus)
  status?: CoachStatus;
}
