import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 🔒 Глобальная валидация входящих DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // вырезаем поля, которых нет в DTO
      transform: true, // приводим типы (string → number и т.п.)
      forbidNonWhitelisted: false, // не валим запрос из-за лишних полей (безопасно для текущего фронта)
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();