import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
