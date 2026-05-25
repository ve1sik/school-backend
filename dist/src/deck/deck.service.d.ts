import { PrismaService } from '../prisma/prisma.service';
export declare class DeckService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        lesson: {
            id: string;
            title: string;
        };
        _count: {
            cards: number;
        };
    } & {
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        lesson_id: string | null;
    })[]>;
    findOne(id: string): Promise<{
        lesson: {
            id: string;
            title: string;
        };
        cards: {
            id: string;
            created_at: Date;
            order_index: number;
            deck_id: string;
            front: string;
            back: string;
        }[];
    } & {
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        lesson_id: string | null;
    }>;
    create(data: {
        title: string;
        description?: string;
        lesson_id?: string;
    }): import(".prisma/client").Prisma.Prisma__DeckClient<{
        _count: {
            cards: number;
        };
    } & {
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        lesson_id: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, data: {
        title?: string;
        description?: string;
        lesson_id?: string | null;
    }): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        lesson_id: string | null;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    addCard(deckId: string, data: {
        front: string;
        back: string;
        order_index?: number;
    }): Promise<{
        id: string;
        created_at: Date;
        order_index: number;
        deck_id: string;
        front: string;
        back: string;
    }>;
    updateCard(cardId: string, data: {
        front?: string;
        back?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        order_index: number;
        deck_id: string;
        front: string;
        back: string;
    }>;
    removeCard(cardId: string): Promise<{
        success: boolean;
    }>;
    bulkSaveCards(deckId: string, cards: {
        front: string;
        back: string;
    }[]): Promise<{
        count: number;
    }>;
}
