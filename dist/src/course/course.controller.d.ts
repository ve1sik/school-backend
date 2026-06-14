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
    getAll(req: any): Promise<({
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
    createCourse(dto: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        spell_check: boolean;
        subject_id: string | null;
    }>;
    update(id: string, dto: any, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        spell_check: boolean;
        subject_id: string | null;
    }>;
    deleteCourse(id: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        spell_check: boolean;
        subject_id: string | null;
    }>;
}
