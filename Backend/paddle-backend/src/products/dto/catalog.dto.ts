import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateProductBrandDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateProductBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
