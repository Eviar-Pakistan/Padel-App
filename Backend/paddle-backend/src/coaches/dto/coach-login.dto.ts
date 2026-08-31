import { IsString, MinLength } from 'class-validator';

export class CoachLoginDto {
  @IsString()
  @MinLength(1)
  phoneNumber!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
