import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    findAll(req: any, skip?: string, take?: string): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        admin_permissions: string[];
        name: string;
        surname: string;
        patronymic: string;
        birthday: string;
        city: string;
        avatar: string;
        created_at: Date;
        enrollments: ({
            course: {
                id: string;
                title: string;
            };
        } & {
            id: string;
            created_at: Date;
            course_id: string;
            user_id: string;
        })[];
        groups: {
            id: string;
            title: string;
        }[];
        subjects: {
            id: string;
            title: string;
        }[];
    }[]>;
    findAllStudents(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    findAllCurators(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    findAllTeachers(): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    create(dto: {
        email: string;
        password: string;
        name?: string;
        surname?: string;
        role?: any;
    }): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        admin_permissions: string[];
        name: string;
        surname: string;
        patronymic: string;
        birthday: string;
        city: string;
        avatar: string;
        created_at: Date;
        enrollments: ({
            course: {
                id: string;
                title: string;
            };
        } & {
            id: string;
            created_at: Date;
            course_id: string;
            user_id: string;
        })[];
        groups: {
            id: string;
            title: string;
        }[];
        subjects: {
            id: string;
            title: string;
        }[];
    }>;
    update(id: string, dto: any, req: any): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        admin_permissions: string[];
        name: string;
        surname: string;
        patronymic: string;
        birthday: string;
        city: string;
        avatar: string;
        created_at: Date;
        enrollments: ({
            course: {
                id: string;
                title: string;
            };
        } & {
            id: string;
            created_at: Date;
            course_id: string;
            user_id: string;
        })[];
        groups: {
            id: string;
            title: string;
        }[];
        subjects: {
            id: string;
            title: string;
        }[];
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
