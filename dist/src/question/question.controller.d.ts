import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/question.dto';
export declare class QuestionController {
    private readonly questionService;
    constructor(questionService: QuestionService);
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
