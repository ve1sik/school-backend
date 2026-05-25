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
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const messages_service_1 = require("./messages.service");
const passport_1 = require("@nestjs/passport");
let MessagesController = class MessagesController {
    constructor(messagesService) {
        this.messagesService = messagesService;
    }
    async getContacts(auth) {
        if (!auth)
            throw new common_1.UnauthorizedException('Нет токена');
        const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
        return this.messagesService.getContacts(payload.sub || payload.id, payload.role);
    }
    async getUnreadCount(auth) {
        if (!auth)
            throw new common_1.UnauthorizedException('Нет токена');
        const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
        return this.messagesService.getUnreadCount(payload.sub || payload.id);
    }
    async getHistory(auth, contactId) {
        if (!auth)
            throw new common_1.UnauthorizedException('Нет токена');
        const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
        return this.messagesService.getHistory(payload.sub || payload.id, contactId);
    }
    async sendMessage(auth, contactId, text) {
        if (!auth)
            throw new common_1.UnauthorizedException('Нет токена');
        if (!text || !text.trim())
            throw new common_1.UnauthorizedException('Пустое сообщение');
        const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
        return this.messagesService.sendMessage(payload.sub || payload.id, contactId, text);
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Get)('contacts'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Get)('unread'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)(':id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "sendMessage", null);
exports.MessagesController = MessagesController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('messages'),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map