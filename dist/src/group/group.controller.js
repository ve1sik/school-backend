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
exports.GroupController = void 0;
const common_1 = require("@nestjs/common");
const group_service_1 = require("./group.service");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let GroupController = class GroupController {
    constructor(groupService) {
        this.groupService = groupService;
    }
    create(createGroupDto) {
        return this.groupService.create(createGroupDto);
    }
    findAll(req) {
        return this.groupService.findAll(req.user.sub, req.user.role, req.user.admin_permissions || []);
    }
    findShopGroups() {
        return this.groupService.findShopGroups();
    }
    getMyApplications(req) {
        const userId = req.user.sub || req.user.id;
        return this.groupService.getMyApplications(userId);
    }
    getMyThemeAccess(req) {
        const userId = req.user.sub || req.user.id || req.user.userId;
        return this.groupService.getMyThemeAccess(userId);
    }
    getCuratorScope(req) {
        return this.groupService.getCuratorScope(req.user.sub, req.user.role);
    }
    findOne(id, req) {
        return this.groupService.findOne(id, req.user.sub, req.user.role, req.user.admin_permissions || []);
    }
    update(id, updateGroupDto, req) {
        return this.groupService.update(id, updateGroupDto, req.user.sub, req.user.role, req.user.admin_permissions || []);
    }
    remove(id) {
        return this.groupService.remove(id);
    }
    updateCourses(id, body) {
        return this.groupService.updateCourses(id, body.courseIds);
    }
    updateStudents(id, body, req) {
        if (body.userId) {
            return this.groupService.enrollStudent(id, body.userId, req.user.sub, req.user.role);
        }
        return this.groupService.updateStudents(id, body.studentIds || [], req.user.sub, req.user.role);
    }
    applyForGroup(id, req, body) {
        const userId = req.user.sub || req.user.id;
        return this.groupService.applyForGroup(id, userId, body);
    }
    getApplications(id, req) {
        return this.groupService.getApplications(id, req.user.sub, req.user.role);
    }
    approveApplication(appId, req) {
        const reviewerId = req.user.sub || req.user.id;
        return this.groupService.approveApplication(appId, reviewerId, req.user.role);
    }
    rejectApplication(appId, req) {
        const reviewerId = req.user.sub || req.user.id;
        return this.groupService.rejectApplication(appId, reviewerId, req.user.role);
    }
    removeStudent(id, userId, req) {
        return this.groupService.removeStudent(id, userId, req.user.sub, req.user.role);
    }
    getThemeAccess(id) {
        return this.groupService.getThemeAccess(id);
    }
    upsertThemeAccess(id, body) {
        const { themeId, ...data } = body;
        return this.groupService.upsertThemeAccess(id, themeId, data);
    }
};
exports.GroupController = GroupController;
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS', 'MANAGE_USERS'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR', 'STUDENT', 'TEACHER'),
    (0, common_1.Get)('shop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "findShopGroups", null);
__decorate([
    (0, roles_decorator_1.Roles)('STUDENT', 'ADMIN', 'CURATOR'),
    (0, common_1.Get)('my-applications'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getMyApplications", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR', 'TEACHER', 'STUDENT'),
    (0, common_1.Get)('my-theme-access'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getMyThemeAccess", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('CURATOR_DASHBOARD'),
    (0, common_1.Get)('curator-scope'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getCuratorScope", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS', 'MANAGE_USERS'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "remove", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS'),
    (0, common_1.Post)(':id/courses'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "updateCourses", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS', 'MANAGE_USERS'),
    (0, common_1.Post)(':id/students'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "updateStudents", null);
__decorate([
    (0, roles_decorator_1.Roles)('STUDENT', 'ADMIN', 'CURATOR'),
    (0, common_1.Post)(':id/apply'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "applyForGroup", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Get)(':id/applications'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getApplications", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Patch)('applications/:appId/approve'),
    __param(0, (0, common_1.Param)('appId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "approveApplication", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Patch)('applications/:appId/reject'),
    __param(0, (0, common_1.Param)('appId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "rejectApplication", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_GROUPS', 'MANAGE_USERS'),
    (0, common_1.Delete)(':id/students/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "removeStudent", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_COURSES', 'MANAGE_GROUPS'),
    (0, common_1.Get)(':id/theme-access'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "getThemeAccess", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('MANAGE_COURSES', 'MANAGE_GROUPS'),
    (0, common_1.Post)(':id/theme-access'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupController.prototype, "upsertThemeAccess", null);
exports.GroupController = GroupController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('groups'),
    __metadata("design:paramtypes", [group_service_1.GroupService])
], GroupController);
//# sourceMappingURL=group.controller.js.map