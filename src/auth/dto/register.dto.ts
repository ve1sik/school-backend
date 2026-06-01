import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Пароль минимум 6 символов' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Имя обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Фамилия обязательна' })
  surname: string;

  @IsOptional()
  @IsString()
  patronymic?: string;
}
