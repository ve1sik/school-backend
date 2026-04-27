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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getUserIdFromToken(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Токен не найден');
        }
        const token = authHeader.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        const userId = decodedPayload.id || decodedPayload.userId || decodedPayload.sub;
        if (!userId) {
            throw new common_1.UnauthorizedException('Не удалось найти ID');
        }
        return userId;
    }
    async getAnalytics(req) {
        try {
            const userId = this.getUserIdFromToken(req);
            return await this.dashboardService.getStudentAnalytics(userId);
        }
        catch (error) {
            console.error('Ошибка в аналитике:', error);
            throw new common_1.UnauthorizedException('Ошибка доступа');
        }
    }
    async getMistakes(req, themeId) {
        try {
            const userId = this.getUserIdFromToken(req);
            return await this.dashboardService.getMistakesWork(userId, themeId);
        }
        catch (error) {
            console.error('Ошибка в выгрузке ошибок:', error);
            throw new common_1.UnauthorizedException('Ошибка доступа');
        }
    }
    async saveResult(req, body) {
        try {
            const userId = this.getUserIdFromToken(req);
            return await this.dashboardService.saveTestResult(userId, body.testId, body.score, body.answers);
        }
        catch (error) {
            console.error('Ошибка сохранения теста:', error);
            throw new common_1.UnauthorizedException('Не удалось сохранить результаты теста');
        }
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('mistakes/:themeId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('themeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getMistakes", null);
__decorate([
    (0, common_1.Post)('save-result'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "saveResult", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map