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
        group_id: string | null;
    }[]>;
    createEvent(body: any): Promise<{
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
