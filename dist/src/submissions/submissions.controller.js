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
exports.SubmissionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const submissions_service_1 = require("./submissions.service");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let SubmissionsController = class SubmissionsController {
    constructor(submissionsService) {
        this.submissionsService = submissionsService;
    }
    createOralSubmission(body, req) {
        return this.submissionsService.createOralSubmission(body, req.user.sub, req.user.role);
    }
    getOralSubmission(studentId, lessonId, req) {
        return this.submissionsService.getOralSubmission(studentId, lessonId, req.user.sub, req.user.role);
    }
    createSubmission(req, body) {
        const userId = req.user.sub;
        if (body.autoGraded === true) {
            const score = Number(body.score) || 0;
            return this.submissionsService.createAutoGradedSubmission(userId, body, score, score > 0);
        }
        return this.submissionsService.createSubmission(userId, body);
    }
    getSubmissionsByStatus(status, req) {
        const finalStatus = status === 'GRADED' ? 'GRADED' : 'PENDING';
        return this.submissionsService.getSubmissionsByStatus(finalStatus, req.user.sub, req.user.role);
    }
    getPending(req) {
        return this.submissionsService.getSubmissionsByStatus('PENDING', req.user.sub, req.user.role);
    }
    gradeSubmission(id, body) {
        return this.submissionsService.gradeSubmission(id, body.score, body.comment, body.status);
    }
    getMySubmission(req, lessonId) {
        return this.submissionsService.getSubmissionForStudent(lessonId, req.user.sub);
    }
    getMySubmissions(req) {
        return this.submissionsService.getMySubmissions(req.user.sub);
    }
};
exports.SubmissionsController = SubmissionsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('CURATOR_DASHBOARD'),
    (0, common_1.Post)('oral'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "createOralSubmission", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('CURATOR_DASHBOARD'),
    (0, common_1.Get)('oral/:studentId/:lessonId'),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Param)('lessonId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getOralSubmission", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "createSubmission", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('CURATOR_DASHBOARD'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getSubmissionsByStatus", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('CURATOR_DASHBOARD'),
    (0, common_1.Get)('pending'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getPending", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('CURATOR_DASHBOARD'),
    (0, common_1.Patch)(':id/grade'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "gradeSubmission", null);
__decorate([
    (0, common_1.Get)('lesson/:lessonId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('lessonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getMySubmission", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubmissionsController.prototype, "getMySubmissions", null);
exports.SubmissionsController = SubmissionsController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('submissions'),
    __metadata("design:paramtypes", [submissions_service_1.SubmissionsService])
], SubmissionsController);
//# sourceMappingURL=submissions.controller.js.map