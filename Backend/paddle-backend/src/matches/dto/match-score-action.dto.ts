import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class MatchScoreActionDto {
  @IsIn(['POINT', 'ACE', 'WINNER', 'ERROR', 'UNDO', 'END'])
  kind!: 'POINT' | 'ACE' | 'WINNER' | 'ERROR' | 'UNDO' | 'END';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  team?: number;
}
