"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("./roles.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
const permissions_decorator_1 = require("./permissions.decorator");
let RolesGuard = class RolesGuard {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles && !requiredPermissions) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        if (!user)
            return false;
        if (user.role === 'ADMIN')
            return true;
        if (requiredPermissions?.length) {
            const defaultPermissions = permissions_decorator_1.DEFAULT_ROLE_PERMISSIONS[user.role] || [];
            const dbUser = await this.prisma.user.findUnique({
                where: { id: user.sub },
                select: { admin_permissions: true },
            });
            const permissions = new Set([
                ...defaultPermissions,
                ...(dbUser?.admin_permissions || []),
            ]);
            return requiredPermissions.some((permission) => permissions.has(permission));
        }
        return requiredRoles.some((role) => user?.role === role);
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map