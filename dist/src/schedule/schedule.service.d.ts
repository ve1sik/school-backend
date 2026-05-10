import { PrismaService } from '../prisma/prisma.service';
export declare class ScheduleService {
    private prisma;
    constructor(prisma: PrismaService);
    getEvents(): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.EventType;
        link: string | null;
        date: Date;
        group_id: string | null;
    }[]>;
    createEvent(data: any): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.EventType;
        link: string | null;
        date: Date;
        group_id: string | null;
    }>;
    deleteEvent(id: string): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.EventType;
        link: string | null;
        date: Date;
        group_id: string | null;
    }>;
}
