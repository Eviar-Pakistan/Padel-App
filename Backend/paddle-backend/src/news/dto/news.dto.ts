import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { NewsCategory } from '../../../generated/prisma/client';

export class CreateNewsPostDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsEnum(NewsCategory)
  category!: NewsCategory;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateNewsPostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(NewsCategory)
  category?: NewsCategory;

  @IsOptional()
  @IsString()
  location?: string;

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

export class CreateNewsCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
