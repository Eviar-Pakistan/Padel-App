import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateChallengeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opponentId!: number;
}
