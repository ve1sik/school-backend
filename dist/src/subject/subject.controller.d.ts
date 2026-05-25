import { SubjectService } from './subject.service';
export declare class SubjectController {
    private readonly subjectService;
    constructor(subjectService: SubjectService);
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
    assignTeacher(id: string, body: {
        teacherId?: string | null;
    }): Promise<{
        id: string;
        title: string;
        teacher_id: string;
    }>;
}
