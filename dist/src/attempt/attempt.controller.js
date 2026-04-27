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
exports.AttemptController = void 0;
const common_1 = require("@nestjs/common");
const attempt_service_1 = require("./attempt.service");
const submit_dto_1 = require("./dto/submit.dto");
const passport_1 = require("@nestjs/passport");
let AttemptController = class AttemptController {
    constructor(attemptService) {
        this.attemptService = attemptService;
    }
    async submit(req, dto) {
        const userId = req.user.userId || req.user.id || req.user.sub;
        return this.attemptService.submitTest(userId, dto);
    }
};
exports.AttemptController = AttemptController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('submit'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_dto_1.SubmitTestDto]),
    __metadata("design:returntype", Promise)
], AttemptController.prototype, "submit", null);
exports.AttemptController = AttemptController = __decorate([
    (0, common_1.Controller)('attempts'),
    __metadata("design:paramtypes", [attempt_service_1.AttemptService])
], AttemptController);
//# sourceMappingURL=attempt.controller.js.map