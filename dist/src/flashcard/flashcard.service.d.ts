import { PrismaService } from '../prisma/prisma.service';
export declare class FlashcardService {
    private prisma;
    constructor(prisma: PrismaService);
    getDueCards(userId: string, deckId?: string): Promise<{
        review: {
            isNew: boolean;
            deck: {
                title: string;
            };
            progress: {
                id: string;
                user_id: string;
                flashcard_id: string;
                interval: number;
                ease_factor: number;
                next_review_at: Date;
                last_reviewed_at: Date | null;
                repetitions: number;
            }[];
            id: string;
            created_at: Date;
            order_index: number;
            deck_id: string;
            front: string;
            back: string;
        }[];
        new: {
            progress: any[];
            isNew: boolean;
            deck: {
                title: string;
            };
            id: string;
            created_at: Date;
            order_index: number;
            deck_id: string;
            front: string;
            back: string;
        }[];
        totalDue: number;
    }>;
    submitReview(userId: string, flashcardId: string, rating: 0 | 1 | 2): Promise<{
        id: string;
        user_id: string;
        flashcard_id: string;
        interval: number;
        ease_factor: number;
        next_review_at: Date;
        last_reviewed_at: Date | null;
        repetitions: number;
    }>;
    getStats(userId: string): Promise<{
        totalLearned: number;
        dueTodayCount: number;
        newCount: number;
        streak: number;
    }>;
}
