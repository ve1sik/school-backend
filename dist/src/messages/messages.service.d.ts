import { PrismaService } from '../prisma/prisma.service';
export declare class MessagesService {
    private prisma;
    constructor(prisma: PrismaService);
    getContacts(userId: string, role: string): Promise<any[]>;
    getHistory(userId1: string, userId2: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        is_read: boolean;
        sender_id: string;
        receiver_id: string;
    }[]>;
    sendMessage(senderId: string, receiverId: string, text: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        is_read: boolean;
        sender_id: string;
        receiver_id: string;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
}
