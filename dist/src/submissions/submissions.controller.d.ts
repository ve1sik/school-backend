import { SubmissionsService } from './submissions.service';
export declare class SubmissionsController {
    private readonly submissionsService;
    constructor(submissionsService: SubmissionsService);
    createSubmission(auth: string, body: any): Promise<{
        id: string;
        created_at: Date;
        score: number | null;
        user_id: string;
        question: string;
        answer: string;
        lesson_id: string;
        block_id: string;
        max_score: number;
        comment: string | null;
        status: import(".prisma/client").$Enums.SubmissionStatus;
        updated_at: Date;
    }>;
    getPending(): Promise<{
        id: string;
        studentName: string;
        courseName: string;
        lessonTitle: string;
        question: string;
        answer: string;
        maxScore: number;
        status: import(".prisma/client").$Enums.SubmissionStatus;
        date: string;
    }[]>;
    gradeSubmission(id: string, body: any): Promise<{
        id: string;
        created_at: Date;
        score: number | null;
        user_id: string;
        question: string;
        answer: string;
        lesson_id: string;
        block_id: string;
        max_score: number;
        comment: string | null;
        status: import(".prisma/client").$Enums.SubmissionStatus;
        updated_at: Date;
    }>;
    getMySubmission(auth: string, lessonId: string): Promise<{
        id: string;
        created_at: Date;
        score: number | null;
        user_id: string;
        question: string;
        answer: string;
        lesson_id: string;
        block_id: string;
        max_score: number;
        comment: string | null;
        status: import(".prisma/client").$Enums.SubmissionStatus;
        updated_at: Date;
    }>;
    getMySubmissions(auth: string): Promise<{
        id: string;
        created_at: Date;
        score: number | null;
        user_id: string;
        question: string;
        answer: string;
        lesson_id: string;
        block_id: string;
        max_score: number;
        comment: string | null;
        status: import(".prisma/client").$Enums.SubmissionStatus;
        updated_at: Date;
    }[]>;
}
