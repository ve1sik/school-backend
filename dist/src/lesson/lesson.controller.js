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
exports.LessonController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const lesson_service_1 = require("./lesson.service");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let LessonController = class LessonController {
    constructor(lessonService) {
        this.lessonService = lessonService;
    }
    create(dto, req) {
        return this.lessonService.create(dto, req.user.sub, req.user.role);
    }
    getByTheme(themeId) {
        return this.lessonService.getByTheme(themeId);
    }
    reorder(id, dto, req) {
        return this.lessonService.reorder(id, dto.themeId, dto.newOrderIndex, req.user.sub, req.user.role);
    }
    update(id, dto, req) {
        if (Object.keys(dto).length === 1 && 'is_visible' in dto) {
            return this.lessonService.updateVisibility(id, dto.is_visible, req.user.sub, req.user.role);
        }
        if (Object.keys(dto).length === 1 && 'include_in_analytics' in dto) {
            return this.lessonService.updateAnalyticsVisibility(id, dto.include_in_analytics, req.user.sub, req.user.role);
        }
        return this.lessonService.update(id, dto, req.user.sub, req.user.role);
    }
    delete(id, req) {
        return this.lessonService.delete(id, req.user.sub, req.user.role);
    }
};
exports.LessonController = LessonController;
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_COURSES'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LessonController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('theme/:themeId'),
    __param(0, (0, common_1.Param)('themeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonController.prototype, "getByTheme", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_COURSES'),
    (0, common_1.Patch)(':id/reorder'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonController.prototype, "reorder", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_COURSES'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LessonController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_COURSES'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonController.prototype, "delete", null);
exports.LessonController = LessonController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('lessons'),
    __metadata("design:paramtypes", [lesson_service_1.LessonService])
], LessonController);
//# sourceMappingURL=lesson.controller.js.map