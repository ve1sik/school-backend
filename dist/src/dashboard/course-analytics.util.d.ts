type Bucket = {
    e: number;
    m: number;
    count: number;
};
export type CourseAnalytics = {
    id: string;
    title: string;
    averageScore: number;
    totalSubmissions: number;
    gradedCount: number;
    breakdown: {
        tests: number;
        written: number;
        oral: number;
    };
    buckets: {
        tests: Bucket;
        written: Bucket;
        oral: Bucket;
    };
    modules: Array<{
        id: string;
        title: string;
        averageScore: number;
        totalTests: number;
        breakdown: {
            tests: number;
            written: number;
            oral: number;
        };
    }>;
};
export declare function buildCourseAnalytics(course: any, submissions: any[]): CourseAnalytics | null;
export declare function mergeCourseAnalytics(courses: CourseAnalytics[]): {
    averageScore: number;
    gradedCount: number;
    totalSubmissions: number;
    breakdown: {
        tests: number;
        written: number;
        oral: number;
    };
    modules: {
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
    weakestTheme: {
        id: string;
        title: string;
        score: number;
    };
};
export {};
