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
                theme_id: string;
                type: import(".prisma/client").$Enums.LessonType;
                video_url: string | null;
                content: string | null;
                test_data: import("@prisma/client/runtime/library").JsonValue | null;
                is_homework: boolean;
            }[];
        } & {
            id: string;
            title: string;
            order_index: number;
            is_visible: boolean;
            course_id: string;
        })[];
    } & {
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
    getAllCourses(): Promise<({
        themes: ({
            lessons: {
                id: string;
                created_at: Date;
                title: string;
                order_index: number;
                is_visible: boolean;
                theme_id: string;
                type: import(".prisma/client").$Enums.LessonType;
                video_url: string | null;
                content: string | null;
                test_data: import("@prisma/client/runtime/library").JsonValue | null;
                is_homework: boolean;
            }[];
        } & {
            id: string;
            title: string;
            order_index: number;
            is_visible: boolean;
            course_id: string;
        })[];
    } & {
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    })[]>;
    create(dto: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
    updateCourse(id: string, dto: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
}
