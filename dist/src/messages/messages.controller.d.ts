import { MessagesService } from './messages.service';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
    getContacts(auth: string): Promise<any[]>;
    getUnreadCount(auth: string): Promise<{
        count: number;
    }>;
    getHistory(auth: string, contactId: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        is_read: boolean;
        sender_id: string;
        receiver_id: string;
    }[]>;
    sendMessage(auth: string, contactId: string, text: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        is_read: boolean;
        sender_id: string;
        receiver_id: string;
    }>;
}
