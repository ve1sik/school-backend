import { GroupService } from './group.service';
export declare class GroupController {
    private readonly groupService;
    constructor(groupService: GroupService);
    create(createGroupDto: any): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    findAll(req: any): Promise<({
        _count: {
            courses: number;
            students: number;
        };
        teacher: {
            id: string;
            email: string;
            invite_code: string | null;
            telegram_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            admin_permissions: string[];
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            points: number;
            telegram_chat_id: string | null;
            telegram_linked_at: Date | null;
            parent_id: string | null;
            created_at: Date;
        };
        curator: {
            id: string;
            email: string;
            invite_code: string | null;
            telegram_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            admin_permissions: string[];
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            points: number;
            telegram_chat_id: string | null;
            telegram_linked_at: Date | null;
            parent_id: string | null;
            created_at: Date;
        };
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    })[]>;
    findShopGroups(): Promise<({
        _count: {
            students: number;
        };
        courses: {
            id: string;
            title: string;
            description: string;
            cover_url: string;
        }[];
        curator: {
            name: string;
            surname: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    })[]>;
    getMyApplications(req: any): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        group_id: string;
    }[]>;
    getMyThemeAccess(req: any): Promise<{
        group_id: string;
        group_title: string;
        theme_id: string;
        theme_title: string;
        theme_order: number;
        unlock_date: Date;
        deadline: Date;
        is_visible: boolean;
    }[]>;
    getCuratorScope(req: any): Promise<({
        courses: ({
            themes: ({
                lessons: {
                    id: string;
                    created_at: Date;
                    title: string;
                    order_index: number;
                    is_visible: boolean;
                    unlock_date: Date | null;
                    deadline: Date | null;
                    theme_id: string;
                    type: import(".prisma/client").$Enums.LessonType;
                    video_url: string | null;
                    content: string | null;
                    test_data: import("@prisma/client/runtime/library").JsonValue | null;
                    include_in_analytics: boolean;
                    is_homework: boolean;
                }[];
            } & {
                id: string;
                title: string;
                order_index: number;
                is_visible: boolean;
                unlock_date: Date | null;
                deadline: Date | null;
                course_id: string;
            })[];
        } & {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            spell_check: boolean;
            subject_id: string | null;
        })[];
        teacher: {
            id: string;
            email: string;
            name: string;
            surname: string;
        };
        curator: {
            id: string;
            email: string;
            name: string;
            surname: string;
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
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    })[]>;
    findOne(id: string, req: any): Promise<{
        courses: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            spell_check: boolean;
            subject_id: string | null;
        }[];
        teacher: {
            id: string;
            email: string;
            invite_code: string | null;
            telegram_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            admin_permissions: string[];
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            points: number;
            telegram_chat_id: string | null;
            telegram_linked_at: Date | null;
            parent_id: string | null;
            created_at: Date;
        };
        curator: {
            id: string;
            email: string;
            invite_code: string | null;
            telegram_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            admin_permissions: string[];
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            points: number;
            telegram_chat_id: string | null;
            telegram_linked_at: Date | null;
            parent_id: string | null;
            created_at: Date;
        };
        students: {
            id: string;
            email: string;
            invite_code: string | null;
            telegram_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            admin_permissions: string[];
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            points: number;
            telegram_chat_id: string | null;
            telegram_linked_at: Date | null;
            parent_id: string | null;
            created_at: Date;
        }[];
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    update(id: string, updateGroupDto: any, req: any): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    updateCourses(id: string, body: {
        courseIds: string[];
    }): Promise<{
        students: {
            id: string;
            email: string;
            invite_code: string | null;
            telegram_code: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            refresh_token: string | null;
            admin_permissions: string[];
            name: string | null;
            surname: string | null;
            patronymic: string | null;
            birthday: string | null;
            city: string | null;
            avatar: string | null;
            points: number;
            telegram_chat_id: string | null;
            telegram_linked_at: Date | null;
            parent_id: string | null;
            created_at: Date;
        }[];
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    updateStudents(id: string, body: {
        studentIds?: string[];
        userId?: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }> | Promise<{
        courses: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            spell_check: boolean;
            subject_id: string | null;
        }[];
    } & {
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    applyForGroup(id: string, req: any, body: {
        comment?: string;
        proof_image?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        comment: string | null;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        group_id: string;
        proof_image: string | null;
        reviewed_by: string | null;
        reviewed_at: Date | null;
    }>;
    getApplications(id: string, req: any): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
            surname: string;
            avatar: string;
        };
        group: {
            id: string;
            title: string;
        };
    } & {
        id: string;
        created_at: Date;
        user_id: string;
        comment: string | null;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        group_id: string;
        proof_image: string | null;
        reviewed_by: string | null;
        reviewed_at: Date | null;
    })[]>;
    approveApplication(appId: string, req: any): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        comment: string | null;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        group_id: string;
        proof_image: string | null;
        reviewed_by: string | null;
        reviewed_at: Date | null;
    }>;
    rejectApplication(appId: string, req: any): Promise<{
        id: string;
        created_at: Date;
        user_id: string;
        comment: string | null;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        group_id: string;
        proof_image: string | null;
        reviewed_by: string | null;
        reviewed_at: Date | null;
    }>;
    removeStudent(id: string, userId: string, req: any): Promise<{
        id: string;
        title: string;
        cover_url: string | null;
        teacher_id: string | null;
        curator_id: string | null;
        price: number;
        old_price: number | null;
        start_date: string | null;
        badge: string | null;
        features: string[];
        is_public: boolean;
        payment_info: string | null;
        payment_qr_url: string | null;
    }>;
    getThemeAccess(id: string): Promise<({
        theme: {
            id: string;
            title: string;
            order_index: number;
        };
    } & {
        id: string;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        theme_id: string;
        group_id: string;
    })[]>;
    upsertThemeAccess(id: string, body: {
        themeId: string;
        unlock_date?: string | null;
        deadline?: string | null;
        is_visible?: boolean;
    }): Promise<{
        theme: {
            id: string;
            title: string;
            order_index: number;
            is_visible: boolean;
            unlock_date: Date | null;
            deadline: Date | null;
            course_id: string;
        };
        group: {
            id: string;
            title: string;
            cover_url: string | null;
            teacher_id: string | null;
            curator_id: string | null;
            price: number;
            old_price: number | null;
            start_date: string | null;
            badge: string | null;
            features: string[];
            is_public: boolean;
            payment_info: string | null;
            payment_qr_url: string | null;
        };
    } & {
        id: string;
        is_visible: boolean;
        unlock_date: Date | null;
        deadline: Date | null;
        theme_id: string;
        group_id: string;
    }>;
}
