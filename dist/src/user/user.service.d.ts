import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
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
    findAllStudents(): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    findAllCurators(): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        avatar: string;
    }[]>;
    updateRole(id: string, role: Role): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
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
