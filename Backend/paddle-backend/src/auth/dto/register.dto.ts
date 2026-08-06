import { IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsString()
  mobileNumber!: string;

  @IsString()
  cnicNumber!: string;

  @IsString()
  @MinLength(6)
  password!: string;

}