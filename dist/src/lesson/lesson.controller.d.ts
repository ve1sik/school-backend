import { LessonService } from './lesson.service';
export declare class LessonController {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    create(dto: any, req: any): Promise<{
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
    }>;
    getByTheme(themeId: string): Promise<{
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
    }[]>;
    reorder(id: string, dto: {
        themeId: string;
        newOrderIndex: number;
    }, req: any): Promise<{
        success: boolean;
    }>;
    update(id: string, dto: any, req: any): Promise<{
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
    }>;
    delete(id: string, req: any): Promise<{
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
    }>;
}
