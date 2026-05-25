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
exports.FlashcardController = void 0;
const common_1 = require("@nestjs/common");
const flashcard_service_1 = require("./flashcard.service");
const passport_1 = require("@nestjs/passport");
let FlashcardController = class FlashcardController {
    constructor(flashcardService) {
        this.flashcardService = flashcardService;
    }
    getDue(req, deckId) {
        const userId = req.user.sub || req.user.id || req.user.userId;
        return this.flashcardService.getDueCards(userId, deckId);
    }
    getStats(req) {
        const userId = req.user.sub || req.user.id || req.user.userId;
        return this.flashcardService.getStats(userId);
    }
    submitReview(req, body) {
        const userId = req.user.sub || req.user.id || req.user.userId;
        return this.flashcardService.submitReview(userId, body.flashcardId, body.rating);
    }
};
exports.FlashcardController = FlashcardController;
__decorate([
    (0, common_1.Get)('due'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('deckId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FlashcardController.prototype, "getDue", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FlashcardController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('review'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FlashcardController.prototype, "submitReview", null);
exports.FlashcardController = FlashcardController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('flashcards'),
    __metadata("design:paramtypes", [flashcard_service_1.FlashcardService])
], FlashcardController);
//# sourceMappingURL=flashcard.controller.js.map