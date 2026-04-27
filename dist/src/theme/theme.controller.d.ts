import { ThemeService } from './theme.service';
export declare class ThemeController {
    private readonly themeService;
    constructor(themeService: ThemeService);
    create(dto: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
    delete(id: string): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
    updateVisibility(id: string, is_visible: boolean): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
}
