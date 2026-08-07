import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

@Injectable()
export class ImageUploadService {
  private readonly uploadRoot = join(process.cwd(), 'uploads');
  private readonly courtsDir = join(this.uploadRoot, 'courts');
  private readonly newsDir = join(this.uploadRoot, 'news');

  constructor() {
    if (!existsSync(this.courtsDir)) {
      mkdirSync(this.courtsDir, { recursive: true });
    }
    if (!existsSync(this.newsDir)) {
      mkdirSync(this.newsDir, { recursive: true });
    }
  }

  async saveCourtImage(file?: Express.Multer.File): Promise<string | undefined> {
    const urls = await this.saveCourtImages(file ? [file] : []);
    return urls[0];
  }

  async saveCourtImages(files: Express.Multer.File[] = []): Promise<string[]> {
    return this.saveImages(files, this.courtsDir, 'courts');
  }

  async saveNewsImages(files: Express.Multer.File[] = []): Promise<string[]> {
    return this.saveImages(files, this.newsDir, 'news');
  }

  private async saveImages(
    files: Express.Multer.File[],
    dir: string,
    urlSegment: string,
  ): Promise<string[]> {
    if (!files.length) return [];

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'image/gif',
    ];

    const urls: string[] = [];

    for (const file of files) {
      if (!allowed.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only JPEG, PNG, WebP, or GIF images are allowed',
        );
      }

      const filename = `${randomUUID()}.webp`;
      const filepath = join(dir, filename);

      await sharp(file.buffer)
        .rotate()
        .resize({
          width: 1280,
          height: 1280,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toFile(filepath);

      urls.push(`/uploads/${urlSegment}/${filename}`);
    }

    return urls;
  }
}
