import { PrismaService } from '../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
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
}
