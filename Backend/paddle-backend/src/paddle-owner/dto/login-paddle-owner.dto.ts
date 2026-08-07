import { IsString, MinLength } from 'class-validator';

export class LoginPaddleOwnerDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
