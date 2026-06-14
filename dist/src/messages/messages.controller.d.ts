import { MessagesService } from './messages.service';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
    getContacts(req: any): Promise<{
        unreadCount: number;
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
    getHistory(req: any, contactId: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        sender_id: string;
        receiver_id: string;
        is_read: boolean;
    }[]>;
    sendMessage(req: any, contactId: string, text: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        sender_id: string;
        receiver_id: string;
        is_read: boolean;
    }>;
}
