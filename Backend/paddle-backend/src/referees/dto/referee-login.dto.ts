import { IsString, MinLength } from 'class-validator';

export class RefereeLoginDto {
  @IsString()
  @MinLength(1)
  phoneNumber!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
