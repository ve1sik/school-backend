// Файл: src/auth/roles.guard.ts (Полный код)
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS_KEY, type AdminPermission } from './permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (user.role === 'ADMIN') return true;

    if (requiredPermissions?.length) {
      const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { admin_permissions: true },
      });
      const permissions = new Set<AdminPermission>([
        ...defaultPermissions,
        ...((dbUser?.admin_permissions || []) as AdminPermission[]),
      ]);

      // Достаточно одного права из списка: например MANAGE_USERS или MANAGE_GROUPS.
      return requiredPermissions.some((permission) => permissions.has(permission));
    }

    return requiredRoles.some((role) => user?.role === role);
  }
}