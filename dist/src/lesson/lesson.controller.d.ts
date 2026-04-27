import { LessonService } from './lesson.service';
export declare class LessonController {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    create(dto: any): Promise<{
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
    }>;
    getByTheme(themeId: string): Promise<{
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
    }[]>;
    update(id: string, dto: any): Promise<{
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
    }>;
    delete(id: string): Promise<{
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
    }>;
}
