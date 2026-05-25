import { PrismaService } from '../prisma/prisma.service';
export declare class SubjectService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        _count: {
            courses: number;
        };
        teacher: {
            id: string;
            email: string;
            name: string;
            surname: string;
        };
    } & {
        id: string;
        title: string;
        teacher_id: string | null;
    })[]>;
    assignTeacher(id: string, teacherId: string | null): Promise<{
        id: string;
        title: string;
        teacher_id: string;
    }>;
}
