import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/question.dto';
export declare class QuestionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateQuestionDto): Promise<{
        id: string;
        test_id: string;
        type: import(".prisma/client").$Enums.QuestionType;
        content: string;
        correct_answer: string | null;
        points: number;
    }>;
    getByTest(testId: string): Promise<{
        id: string;
        test_id: string;
        type: import(".prisma/client").$Enums.QuestionType;
        content: string;
        correct_answer: string | null;
        points: number;
    }[]>;
}
