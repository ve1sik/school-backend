import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getAnalytics(req: any): Promise<{
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
        weakestTheme: {
            id: string;
            title: string;
            score: number;
        };
        progressData: any[];
        activityData: {
            name: string;
            count: number;
        }[];
        modules: {
            activityData: {
                name: string;
                count: number;
            }[];
            id: string;
            title: string;
            averageScore: number;
            totalTests: number;
            breakdown: {
                tests: number;
                written: number;
                oral: number;
            };
        }[];
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
        score: number;
        attempt_number: number;
        test_id: string;
        user_id: string;
    }>;
}
