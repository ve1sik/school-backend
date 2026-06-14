import { PrismaService } from '../prisma/prisma.service';
export declare class ThemeService {
    private prisma;
    constructor(prisma: PrismaService);
    private ensureCanManageCourse;
    private ensureCanManageTheme;
    create(dto: any, userId?: string, userRole?: string): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        course_id: string;
    }>;
    update(id: string, dto: any, userId?: string, userRole?: string): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        course_id: string;
    }>;
    delete(id: string, userId?: string, userRole?: string): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        course_id: string;
    }>;
    reorder(id: string, newOrderIndex: number, userId?: string, userRole?: string): Promise<{
        success: boolean;
    }>;
}
