import { FlashcardService } from './flashcard.service';
export declare class FlashcardController {
    private readonly flashcardService;
    constructor(flashcardService: FlashcardService);
    getDue(req: any, deckId?: string): Promise<{
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
            front_image: string | null;
            back_image: string | null;
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
            front_image: string | null;
            back_image: string | null;
        }[];
        totalDue: number;
    }>;
    getStats(req: any): Promise<{
        totalLearned: number;
        dueTodayCount: number;
        newCount: number;
        streak: number;
    }>;
    submitReview(req: any, body: {
        flashcardId: string;
        rating: 0 | 1 | 2;
    }): Promise<{
        id: string;
        user_id: string;
        flashcard_id: string;
        interval: number;
        ease_factor: number;
        next_review_at: Date;
        last_reviewed_at: Date | null;
        repetitions: number;
    }>;
}
