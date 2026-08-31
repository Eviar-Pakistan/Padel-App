import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RefereeRankEntryDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  rank!: number;
}

export class SubmitRefereeRankingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefereeRankEntryDto)
  rankings!: RefereeRankEntryDto[];
}
