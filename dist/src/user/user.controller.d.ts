import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
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
