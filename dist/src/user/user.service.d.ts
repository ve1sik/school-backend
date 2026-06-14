import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(skip?: number, take?: number, requesterId?: string, requesterRole?: string, requesterPermissions?: string[]): Promise<{
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
    findAllStudents(requesterId?: string, requesterRole?: string, requesterPermissions?: string[]): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    findAllCurators(requesterId?: string, requesterRole?: string, requesterPermissions?: string[]): Promise<{
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
    createUser(dto: {
        email: string;
        password: string;
        name?: string;
        surname?: string;
        role?: Role;
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
    updateUser(id: string, dto: {
        role?: Role;
        name?: string;
        surname?: string;
        email?: string;
        password?: string;
        admin_permissions?: string[];
    }, requesterRole?: string): Promise<{
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
    updateRole(id: string, role: Role): Promise<{
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
    deleteUser(id: string): Promise<{
        success: boolean;
    }>;
}
