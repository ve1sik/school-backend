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
exports.DeckService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DeckService = class DeckService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.deck.findMany({
            include: {
                _count: { select: { cards: true } },
                lesson: { select: { id: true, title: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id) {
        const deck = await this.prisma.deck.findUnique({
            where: { id },
            include: {
                cards: { orderBy: { order_index: 'asc' } },
                lesson: { select: { id: true, title: true } },
            },
        });
        if (!deck)
            throw new common_1.NotFoundException('Колода не найдена');
        return deck;
    }
    create(data) {
        return this.prisma.deck.create({
            data,
            include: { _count: { select: { cards: true } } },
        });
    }
    async update(id, data) {
        const deck = await this.prisma.deck.findUnique({ where: { id } });
        if (!deck)
            throw new common_1.NotFoundException('Колода не найдена');
        return this.prisma.deck.update({ where: { id }, data });
    }
    async remove(id) {
        const deck = await this.prisma.deck.findUnique({ where: { id } });
        if (!deck)
            throw new common_1.NotFoundException('Колода не найдена');
        await this.prisma.deck.delete({ where: { id } });
        return { success: true };
    }
    async addCard(deckId, data) {
        const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
        if (!deck)
            throw new common_1.NotFoundException('Колода не найдена');
        const count = await this.prisma.flashcard.count({ where: { deck_id: deckId } });
        return this.prisma.flashcard.create({
            data: {
                deck_id: deckId,
                front: data.front,
                back: data.back,
                order_index: data.order_index ?? count,
            },
        });
    }
    async updateCard(cardId, data) {
        const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
        if (!card)
            throw new common_1.NotFoundException('Карточка не найдена');
        return this.prisma.flashcard.update({ where: { id: cardId }, data });
    }
    async removeCard(cardId) {
        const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
        if (!card)
            throw new common_1.NotFoundException('Карточка не найдена');
        await this.prisma.flashcard.delete({ where: { id: cardId } });
        return { success: true };
    }
    async bulkSaveCards(deckId, cards) {
        const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
        if (!deck)
            throw new common_1.NotFoundException('Колода не найдена');
        await this.prisma.flashcard.deleteMany({ where: { deck_id: deckId } });
        const created = await this.prisma.flashcard.createMany({
            data: cards.map((c, i) => ({
                deck_id: deckId,
                front: c.front,
                back: c.back,
                order_index: i,
            })),
        });
        return { count: created.count };
    }
};
exports.DeckService = DeckService;
exports.DeckService = DeckService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeckService);
//# sourceMappingURL=deck.service.js.map