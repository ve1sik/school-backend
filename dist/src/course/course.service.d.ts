import { PrismaService } from '../prisma/prisma.service';
export declare class CourseService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(id: string): Promise<{
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
    }>;
    getAllCourses(userId?: string, userRole?: string): Promise<({
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
    })[]>;
    create(dto: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        spell_check: boolean;
        subject_id: string | null;
    }>;
    private ensureCanManageCourse;
    updateCourse(id: string, dto: any, userId?: string, userRole?: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        spell_check: boolean;
        subject_id: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        spell_check: boolean;
        subject_id: string | null;
    }>;
}
