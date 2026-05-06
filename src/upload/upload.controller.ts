import { Controller, Post, Get, Param, Res, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Response } from 'express';

// Создаем папку, если её нет, чтобы не было ошибок
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

@Controller('upload')
export class UploadController {

  // 1. ЗАГРУЗКА (POST) - Сюда летит файл с компа
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const name = Date.now() + extname(file.originalname);
        cb(null, name);
      },
    }),
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new HttpException('Файл потерялся по дороге', HttpStatus.BAD_REQUEST);

    // Возвращаем ссылку, которая СТОПУДОВО пролезет через Nginx
    return {
      url: `https://prepodmgy.ru/api/upload/file/${file.filename}`,
      originalName: file.originalname
    };
  }

  // 2. СКАЧИВАНИЕ (GET) - Этот метод сам отдаст файл браузеру
  @Get('file/:filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const path = join(process.cwd(), 'uploads', filename);
    
    if (!fs.existsSync(path)) {
      return res.status(404).send('Брат, файла нет на диске!');
    }

    // Эта команда заставляет браузер именно СКАЧИВАТЬ файл
    return res.sendFile(path);
  }
}