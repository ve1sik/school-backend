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
    }[]>;
    createEvent(data: any): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.EventType;
        link: string | null;
        date: Date;
    }>;
    deleteEvent(id: string): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.EventType;
        link: string | null;
        date: Date;
    }>;
}
