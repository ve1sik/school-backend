import { DeckService } from './deck.service';
export declare class DeckController {
    private readonly deckService;
    constructor(deckService: DeckService);
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
            front_image: string | null;
            back_image: string | null;
        }[];
    } & {
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        lesson_id: string | null;
    }>;
    create(body: {
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
    update(id: string, body: {
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
    addCard(id: string, body: {
        front: string;
        back: string;
    }): Promise<{
        id: string;
        created_at: Date;
        order_index: number;
        deck_id: string;
        front: string;
        back: string;
        front_image: string | null;
        back_image: string | null;
    }>;
    bulkSave(id: string, body: {
        cards: {
            front: string;
            back: string;
        }[];
    }): Promise<{
        count: number;
    }>;
    updateCard(cardId: string, body: {
        front?: string;
        back?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        order_index: number;
        deck_id: string;
        front: string;
        back: string;
        front_image: string | null;
        back_image: string | null;
    }>;
    removeCard(cardId: string): Promise<{
        success: boolean;
    }>;
}
