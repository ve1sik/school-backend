import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
export declare class DashboardService {
    private prisma;
    private aiService;
    constructor(prisma: PrismaService, aiService: AiService);
    private submissionType;
    private bucketPct;
    private emptyBuckets;
    private addToBucket;
    getStudentAnalytics(userId: string): Promise<{
        studentName: string;
        isLinked: boolean;
        totalTests: number;
        gradedCount: number;
        averageScore: number;
        breakdown: {
            tests: number;
            written: number;
            oral: number;
        };
        streakDays: number;
        weakestTheme: any;
        progressData: any[];
        activityData: {
            name: string;
            count: number;
        }[];
        modules: any[];
        aiReport: string;
    }>;
    getMistakesWork(userId: string, themeId: string): Promise<{
        hasMistakes: boolean;
        questions: any[];
        testId?: undefined;
    } | {
        hasMistakes: boolean;
        testId: string;
        questions: {
            questionId: string;
            content: string;
            yourWrongAnswer: string;
        }[];
    }>;
    saveTestResult(userId: string, testId: string, score: number, answers: any[]): Promise<{
        id: string;
        created_at: Date;
        score: number;
        attempt_number: number;
        test_id: string;
        user_id: string;
    }>;
}
