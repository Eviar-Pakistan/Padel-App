import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cnicNumber?: string;

  @IsOptional()
  @IsString()
  handedness?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
