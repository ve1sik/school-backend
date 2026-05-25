import { ThemeService } from './theme.service';
export declare class ThemeController {
    private readonly themeService;
    constructor(themeService: ThemeService);
    createTheme(dto: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
    reorder(id: string, dto: {
        newOrderIndex: number;
    }): Promise<{
        success: boolean;
    }>;
    update(id: string, dto: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
    deleteTheme(id: string): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
}
