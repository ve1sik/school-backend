import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    private issueTokens;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    register(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    login(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    getMe(userId: string): Promise<{
        id: string;
        email: string;
        invite_code: string | null;
        telegram_chat_id: string | null;
        telegram_link_code: string | null;
        role: import(".prisma/client").$Enums.Role;
        admin_permissions: string[];
        name: string | null;
        surname: string | null;
        patronymic: string | null;
        birthday: string | null;
        city: string | null;
        avatar: string | null;
        points: number;
        parent_id: string | null;
        telegram_linked_at: Date | null;
        created_at: Date;
    }>;
    updateProfile(userId: string, dto: any): Promise<{
        id: string;
        email: string;
        invite_code: string | null;
        telegram_chat_id: string | null;
        telegram_link_code: string | null;
        role: import(".prisma/client").$Enums.Role;
        admin_permissions: string[];
        name: string | null;
        surname: string | null;
        patronymic: string | null;
        birthday: string | null;
        city: string | null;
        avatar: string | null;
        points: number;
        parent_id: string | null;
        telegram_linked_at: Date | null;
        created_at: Date;
    }>;
    changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    generateInviteCode(userId: string): Promise<{
        code: string;
        invite_code: string;
    }>;
    registerParent(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    linkToStudent(parentId: string, inviteCode: string): Promise<{
        message: string;
    }>;
    getChildren(parentId: string): Promise<{
        id: string;
        name: string;
        surname: string;
        avatar: string;
        test_attempts: ({
            test: {
                id: string;
                title: string;
                max_attempts: number;
                theme_id: string;
            };
        } & {
            id: string;
            created_at: Date;
            score: number;
            attempt_number: number;
            test_id: string;
            user_id: string;
        })[];
    }[]>;
}
