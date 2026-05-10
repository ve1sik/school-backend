import { PrismaService } from '../prisma/prisma.service';
export declare class GroupService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        title: string;
    }): Promise<{
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }>;
    findAll(): Promise<{
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }[]>;
    findOne(id: string): Promise<{
        courses: {
            id: string;
            title: string;
            cover_url: string;
        }[];
        curator: {
            id: string;
            email: string;
            name: string;
            surname: string;
            avatar: string;
        };
        students: {
            id: string;
            email: string;
            name: string;
            surname: string;
            avatar: string;
        }[];
    } & {
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }>;
    update(id: string, data: {
        title?: string;
        curator_id?: string;
    }): Promise<{
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }>;
    setStudents(id: string, studentIds: string[]): Promise<{
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }>;
    setCourses(id: string, courseIds: string[]): Promise<{
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        title: string;
        price: number;
        is_public: boolean;
        curator_id: string | null;
    }>;
}
