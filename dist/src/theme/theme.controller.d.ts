import { ThemeService } from './theme.service';
export declare class ThemeController {
    private readonly themeService;
    constructor(themeService: ThemeService);
    createTheme(dto: any, req: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        course_id: string;
    }>;
    reorder(id: string, dto: {
        newOrderIndex: number;
    }, req: any): Promise<{
        success: boolean;
    }>;
    update(id: string, dto: any, req: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        course_id: string;
    }>;
    deleteTheme(id: string, req: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        course_id: string;
    }>;
}
