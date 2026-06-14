import { PrismaService } from '../prisma/prisma.service';
export declare class MessagesService {
    private prisma;
    constructor(prisma: PrismaService);
    getContacts(userId: string, role: string): Promise<{
        unreadCount: number;
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    getHistory(userId1: string, userId2: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        sender_id: string;
        receiver_id: string;
        is_read: boolean;
    }[]>;
    sendMessage(senderId: string, receiverId: string, text: string): Promise<{
        id: string;
        created_at: Date;
        text: string;
        sender_id: string;
        receiver_id: string;
        is_read: boolean;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
}
