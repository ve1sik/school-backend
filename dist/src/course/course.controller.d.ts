import { CourseService } from './course.service';
export declare class CourseController {
    private readonly courseService;
    constructor(courseService: CourseService);
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
    getAll(): Promise<({
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
    createCourse(dto: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
    createTheme(courseId: string, body: any): Promise<{
        message: string;
        courseId: string;
        body: any;
    }>;
    update(id: string, dto: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
    deleteCourse(id: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
    }>;
}
