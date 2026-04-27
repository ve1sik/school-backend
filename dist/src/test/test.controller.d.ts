import { TestService } from './test.service';
import { CreateTestDto } from './dto/test.dto';
export declare class TestController {
    private readonly testService;
    constructor(testService: TestService);
    create(dto: CreateTestDto): Promise<{
        id: string;
        title: string;
        max_attempts: number;
        theme_id: string;
    }>;
    getByTheme(themeId: string): Promise<({
        questions: {
            id: string;
            test_id: string;
            type: import(".prisma/client").$Enums.QuestionType;
            content: string;
            correct_answer: string | null;
            points: number;
        }[];
    } & {
        id: string;
        title: string;
        max_attempts: number;
        theme_id: string;
    })[]>;
}
