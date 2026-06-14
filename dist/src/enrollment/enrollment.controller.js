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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentController = void 0;
const common_1 = require("@nestjs/common");
const enrollment_service_1 = require("./enrollment.service");
const enroll_dto_1 = require("./dto/enroll.dto");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let EnrollmentController = class EnrollmentController {
    constructor(enrollmentService) {
        this.enrollmentService = enrollmentService;
    }
    async enroll(req, dto) {
        const requesterId = req.user.sub || req.user.id || req.user.userId;
        const targetUserId = dto.userId || dto.user_id || requesterId;
        const courseId = dto.courseId || dto.course_id;
        if (!courseId) {
            throw new common_1.ForbiddenException('Не указан курс');
        }
        const canManageUsers = req.user.role === 'ADMIN' || (req.user.admin_permissions || []).includes('MANAGE_USERS');
        if (targetUserId !== requesterId && !canManageUsers) {
            throw new common_1.ForbiddenException('Недостаточно прав для записи другого пользователя');
        }
        return this.enrollmentService.enroll(targetUserId, courseId);
    }
    async getMyCourses(req) {
        const userId = req.user.sub || req.user.id || req.user.userId;
        return this.enrollmentService.getMyCourses(userId);
    }
    async unenroll(userId, courseId) {
        return this.enrollmentService.unenroll(userId, courseId);
    }
};
exports.EnrollmentController = EnrollmentController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, enroll_dto_1.EnrollCourseDto]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "enroll", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "getMyCourses", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_USERS'),
    (0, common_1.Delete)(':userId/:courseId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "unenroll", null);
exports.EnrollmentController = EnrollmentController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('enrollments'),
    __metadata("design:paramtypes", [enrollment_service_1.EnrollmentService])
], EnrollmentController);
//# sourceMappingURL=enrollment.controller.js.map