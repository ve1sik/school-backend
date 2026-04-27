import { ScheduleService } from './schedule.service';
export declare class ScheduleController {
    private readonly scheduleService;
    constructor(scheduleService: ScheduleService);
    getAllEvents(): Promise<{
        id: string;
        created_at: Date;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.EventType;
        link: string | null;
        date: Date;
    }[]>;
    createEvent(body: any): Promise<{
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
