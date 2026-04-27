import { PrismaService } from '../prisma/prisma.service';
import { SubmitTestDto } from './dto/submit.dto';
export declare class AttemptService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    submitTest(userId: string, dto: SubmitTestDto): Promise<{
        answers: {
            id: string;
            attempt_id: string;
            question_id: string;
            user_answer: string;
            is_correct: boolean;
            points_awarded: number;
        }[];
    } & {
        id: string;
        created_at: Date;
        score: number;
        attempt_number: number;
        test_id: string;
        user_id: string;
    }>;
}
