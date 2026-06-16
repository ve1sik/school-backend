import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://prepodmgy.ru',
    'https://www.prepodmgy.ru',
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : []),
  ];

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`), false);
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    maxAge: 86400,
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