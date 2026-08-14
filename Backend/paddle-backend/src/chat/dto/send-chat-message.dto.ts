import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ChatMessageType } from '../../../generated/prisma/client';

export class SendChatMessageDto {
  @IsEnum(ChatMessageType)
  type!: ChatMessageType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec?: number;
}
