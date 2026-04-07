import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка "Бетонный CORS"
  app.enableCors({
    origin: (origin, callback) => callback(null, true), // Разрешаем вообще всё
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    allowedHeaders: '*', // Принимаем любые заголовки
  });

  await app.listen(3000);
  console.log('Backend is live on port 3000');
}
bootstrap();