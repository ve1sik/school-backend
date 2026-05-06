import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    private getUserIdFromToken;
    getAnalytics(req: any): Promise<{
        studentName: string;
        isLinked: boolean;
        totalTests: number;
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
    getMistakes(req: any, themeId: string): Promise<{
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
    saveResult(req: any, body: any): Promise<{
        id: string;
        created_at: Date;
        test_id: string;
        user_id: string;
        score: number;
        attempt_number: number;
    }>;
}
