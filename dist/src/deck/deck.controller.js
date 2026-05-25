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
exports.DeckController = void 0;
const common_1 = require("@nestjs/common");
const deck_service_1 = require("./deck.service");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let DeckController = class DeckController {
    constructor(deckService) {
        this.deckService = deckService;
    }
    findAll() {
        return this.deckService.findAll();
    }
    findOne(id) {
        return this.deckService.findOne(id);
    }
    create(body) {
        return this.deckService.create(body);
    }
    update(id, body) {
        return this.deckService.update(id, body);
    }
    remove(id) {
        return this.deckService.remove(id);
    }
    addCard(id, body) {
        return this.deckService.addCard(id, body);
    }
    bulkSave(id, body) {
        return this.deckService.bulkSaveCards(id, body.cards);
    }
    updateCard(cardId, body) {
        return this.deckService.updateCard(cardId, body);
    }
    removeCard(cardId) {
        return this.deckService.removeCard(cardId);
    }
};
exports.DeckController = DeckController;
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR', 'STUDENT'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR', 'STUDENT'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "remove", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Post)(':id/cards'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "addCard", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Post)(':id/cards/bulk'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "bulkSave", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Patch)('cards/:cardId'),
    __param(0, (0, common_1.Param)('cardId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "updateCard", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'CURATOR'),
    (0, common_1.Delete)('cards/:cardId'),
    __param(0, (0, common_1.Param)('cardId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeckController.prototype, "removeCard", null);
exports.DeckController = DeckController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('decks'),
    __metadata("design:paramtypes", [deck_service_1.DeckService])
], DeckController);
//# sourceMappingURL=deck.controller.js.map