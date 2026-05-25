import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
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
    update(id: string, dto: UpdateUserDto): Promise<{
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
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
