import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    login(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    getMe(req: any): Promise<{
        id: string;
        email: string;
        invite_code: string | null;
        role: import(".prisma/client").$Enums.Role;
        name: string | null;
        surname: string | null;
        patronymic: string | null;
        birthday: string | null;
        city: string | null;
        avatar: string | null;
        parent_id: string | null;
        created_at: Date;
    }>;
    updateProfile(req: any, dto: any): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            invite_code: string | null;
            role: import(".prisma/client").$Enums.Role;
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            parent_id: string | null;
            created_at: Date;
        };
    }>;
    generateCode(req: any): Promise<{
        code: string;
    }>;
    linkStudent(req: any, code: string): Promise<{
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
        };
    }>;
}
