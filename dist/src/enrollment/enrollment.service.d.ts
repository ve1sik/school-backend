import { PrismaService } from '../prisma/prisma.service';
export declare class EnrollmentService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    enroll(userId: string, courseId: string): Promise<{
        course: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        course_id: string;
        user_id: string;
    }>;
    getMyCourses(userId: string): Promise<({
        course: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        course_id: string;
        user_id: string;
    })[]>;
}
