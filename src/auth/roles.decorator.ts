// Файл: src/auth/roles.decorator.ts (Полный код)
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Вот эта строчка должна быть один в один:
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);