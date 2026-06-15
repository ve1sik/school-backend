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
    getParentData(req: any): Promise<{
        isLinked: boolean;
        studentName: string;
        courses: ({
            themes: ({
                lessons: {
                    id: string;
                    created_at: Date;
                    title: string;
                    order_index: number;
                    is_visible: boolean;
                    unlock_date: Date | null;
                    deadline: Date | null;
                    theme_id: string;
                    type: import(".prisma/client").$Enums.LessonType;
                    video_url: string | null;
                    content: string | null;
                    test_data: import("@prisma/client/runtime/library").JsonValue | null;
                    include_in_analytics: boolean;
                    is_homework: boolean;
                }[];
            } & {
                id: string;
                title: string;
                order_index: number;
                is_visible: boolean;
                unlock_date: Date | null;
                deadline: Date | null;
                course_id: string;
            })[];
        } & {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            spell_check: boolean;
            subject_id: string | null;
        })[];
        submissions: {
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
        }[];
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
