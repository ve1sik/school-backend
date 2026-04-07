// Файл: src/auth/dto/auth.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  password: string;
}

export class LoginDto extends RegisterDto {} // Для логина нам нужны те же поля, просто копируем их