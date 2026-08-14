import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import sharp from 'sharp';
import { ChatMessageType } from '../../generated/prisma/client';

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif',
];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/m4a',
];

@Injectable()
export class ChatMediaService {
  private readonly dir = join(process.cwd(), 'uploads', 'chat');

  constructor() {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  async save(
    file: Express.Multer.File,
    type: ChatMessageType,
  ): Promise<{ url: string; fileName: string; mimeType: string }> {
    if (!file) throw new BadRequestException('A file is required');

    if (type === ChatMessageType.IMAGE) {
      if (!IMAGE_TYPES.includes(file.mimetype)) {
        throw new BadRequestException('Only JPEG, PNG, WebP, or GIF images are allowed');
      }
      const filename = `${randomUUID()}.webp`;
      await sharp(file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(join(this.dir, filename));
      return {
        url: `/uploads/chat/${filename}`,
        fileName: file.originalname || filename,
        mimeType: 'image/webp',
      };
    }

    if (type === ChatMessageType.VIDEO && !VIDEO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only MP4 or WebM videos are allowed');
    }
    if (type === ChatMessageType.AUDIO && !AUDIO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported audio format');
    }

    const ext = extname(file.originalname || '').slice(0, 8) || this.extFromMime(file.mimetype);
    const filename = `${randomUUID()}${ext}`;
    writeFileSync(join(this.dir, filename), file.buffer);
    return {
      url: `/uploads/chat/${filename}`,
      fileName: file.originalname || filename,
      mimeType: file.mimetype,
    };
  }

  private extFromMime(mime: string) {
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('mp4')) return '.mp4';
    if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
    if (mime.includes('ogg')) return '.ogg';
    if (mime.includes('wav')) return '.wav';
    return '';
  }
}
