import { Controller, Post, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { Request } from 'express';

// Умная защита: если папки uploads нет, сервер сам её создаст
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        // Генерируем уникальное имя
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    // 🔥 ГЕНИАЛЬНЫЙ МУВ: Автоматически берем домен (DevTunnels или localhost)
    // Если запрос идет через туннель, читаем заголовки прокси, иначе берем обычный хост
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    
    const fullUrl = `${protocol}://${host}/uploads/${file.filename}`;
    
    console.log('Файл успешно загружен. Ссылка:', fullUrl);

    return {
      url: fullUrl, 
      fileName: file.originalname
    };
  }
}