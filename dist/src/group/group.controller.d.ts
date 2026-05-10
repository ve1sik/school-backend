import { GroupService } from './group.service';
export declare class GroupController {
    private readonly groupService;
    constructor(groupService: GroupService);
    create(createGroupDto: {
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
    update(id: string, updateGroupDto: {
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
