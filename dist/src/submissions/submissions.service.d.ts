import { PrismaService } from '../prisma/prisma.service';
export declare class SubmissionsService {
    private prisma;
    constructor(prisma: PrismaService);
    createSubmission(userId: string, body: any): Promise<{
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
    getPendingSubmissions(): Promise<{
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
    gradeSubmission(id: string, score: number, comment: string): Promise<{
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
    getSubmissionForStudent(lessonId: string, userId: string): Promise<{
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
    getMySubmissions(userId: string): Promise<{
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
