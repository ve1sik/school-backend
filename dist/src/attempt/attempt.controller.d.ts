import { AttemptService } from './attempt.service';
import { SubmitTestDto } from './dto/submit.dto';
export declare class AttemptController {
    private readonly attemptService;
    constructor(attemptService: AttemptService);
    submit(req: any, dto: SubmitTestDto): Promise<{
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
