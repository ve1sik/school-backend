import { PrismaService } from '../prisma/prisma.service';
export declare class ThemeService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: any): Promise<{
        id: string;
        title: string;
        order_index: number;
        is_visible: boolean;
        course_id: string;
    }>;
    update(id: string, dto: any): Promise<{
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
    reorder(id: string, newOrderIndex: number): Promise<{
        success: boolean;
    }>;
}
