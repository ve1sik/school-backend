import { GroupService } from './group.service';
export declare class GroupController {
    private readonly groupService;
    constructor(groupService: GroupService);
    create(createGroupDto: any): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
    findAll(): Promise<({
        _count: {
            courses: number;
            students: number;
        };
        curator: {
            id: string;
            email: string;
            invite_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            parent_id: string | null;
            created_at: Date;
        };
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    })[]>;
    findShopGroups(): Promise<({
        curator: {
            name: string;
            surname: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    })[]>;
    findOne(id: string): Promise<{
        courses: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            subject_id: string | null;
        }[];
        curator: {
            id: string;
            email: string;
            invite_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            parent_id: string | null;
            created_at: Date;
        };
        students: {
            id: string;
            email: string;
            invite_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            parent_id: string | null;
            created_at: Date;
        }[];
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
    update(id: string, updateGroupDto: any): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
    updateCourses(id: string, body: {
        courseIds: string[];
    }): Promise<{
        students: {
            id: string;
            email: string;
            invite_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            parent_id: string | null;
            created_at: Date;
        }[];
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
    updateStudents(id: string, body: {
        studentIds?: string[];
        userId?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }> | Promise<{
        courses: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            subject_id: string | null;
        }[];
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
    removeStudent(id: string, userId: string): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        curator_id: string | null;
    }>;
}
