import { IsString, MinLength } from 'class-validator';

export class AssignRefereeDto {
  @IsString()
  @MinLength(1)
  refereeId!: string;
}
