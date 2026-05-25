import { EnrollmentService } from './enrollment.service';
import { EnrollCourseDto } from './dto/enroll.dto';
export declare class EnrollmentController {
    private readonly enrollmentService;
    constructor(enrollmentService: EnrollmentService);
    enroll(req: any, dto: EnrollCourseDto): Promise<{
        course: {
            id: string;
            title: string;
        };
    } & {
        id: string;
        created_at: Date;
        course_id: string;
        user_id: string;
    }>;
    getMyCourses(req: any): Promise<({
        course: {
            id: string;
            title: string;
            description: string | null;
            cover_url: string | null;
            subject_id: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        course_id: string;
        user_id: string;
    })[]>;
    unenroll(userId: string, courseId: string): Promise<{
        success: boolean;
    }>;
}
