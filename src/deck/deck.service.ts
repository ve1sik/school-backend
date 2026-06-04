import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeckService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deck.findMany({
      include: {
        _count: { select: { cards: true } },
        lesson: { select: { id: true, title: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id },
      include: {
        cards: { orderBy: { order_index: 'asc' } },
        lesson: { select: { id: true, title: true } },
      },
    });
    if (!deck) throw new NotFoundException('Колода не найдена');
    return deck;
  }

  create(data: { title: string; description?: string; lesson_id?: string }) {
    return this.prisma.deck.create({
      data,
      include: { _count: { select: { cards: true } } },
    });
  }

  async update(id: string, data: { title?: string; description?: string; lesson_id?: string | null }) {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Колода не найдена');
    return this.prisma.deck.update({ where: { id }, data });
  }

  async remove(id: string) {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Колода не найдена');
    await this.prisma.deck.delete({ where: { id } });
    return { success: true };
  }

  async addCard(deckId: string, data: { front: string; back: string; front_image?: string; back_image?: string; order_index?: number }) {
    const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck) throw new NotFoundException('Колода не найдена');

    const count = await this.prisma.flashcard.count({ where: { deck_id: deckId } });
    return this.prisma.flashcard.create({
      data: {
        deck_id: deckId,
        front: data.front,
        back: data.back,
        front_image: data.front_image ?? null,
        back_image: data.back_image ?? null,
        order_index: data.order_index ?? count,
      },
    });
  }

  async updateCard(cardId: string, data: { front?: string; back?: string; front_image?: string | null; back_image?: string | null }) {
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Карточка не найдена');
    return this.prisma.flashcard.update({ where: { id: cardId }, data });
  }

  async removeCard(cardId: string) {
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Карточка не найдена');
    await this.prisma.flashcard.delete({ where: { id: cardId } });
    return { success: true };
  }

  async bulkSaveCards(deckId: string, cards: { front: string; back: string; front_image?: string; back_image?: string }[]) {
    const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck) throw new NotFoundException('Колода не найдена');

    await this.prisma.flashcard.deleteMany({ where: { deck_id: deckId } });

    const created = await this.prisma.flashcard.createMany({
      data: cards.map((c, i) => ({
        deck_id: deckId,
        front: c.front,
        back: c.back,
        front_image: c.front_image ?? null,
        back_image: c.back_image ?? null,
        order_index: i,
      })),
    });
    return { count: created.count };
  }
}
