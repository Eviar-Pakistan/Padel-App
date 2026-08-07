import { IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  organizationName!: string;

  @IsString()
  username!: string;

  @IsString()
  location!: string;

  @IsString()
  number!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
