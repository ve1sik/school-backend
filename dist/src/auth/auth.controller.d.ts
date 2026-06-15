import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    refresh(body: {
        refresh_token: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            admin_permissions: string[];
        };
    }>;
    getMe(req: any): Promise<{
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
    updateProfile(req: any, dto: any): Promise<{
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
    changePassword(req: any, body: {
        oldPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
    generateCode(req: any): Promise<{
        code: string;
        invite_code: string;
    }>;
    linkStudent(req: any, body: {
        code?: string;
        invite_code?: string;
    }): Promise<{
        message: string;
    }>;
    getChildren(req: any): Promise<{
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
}
