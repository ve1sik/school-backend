import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 МОЩНЫЙ CORS (чтобы не было красных ошибок в консоли на фронтенде)
  app.enableCors({
    origin: true, // Разрешаем любые подключения (туннели, localhost и т.д.)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 🔥 СНИМАЕМ ЛИМИТЫ: Разрешаем загружать файлы и картинки до 50 мегабайт
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(3000);
}
bootstrap();