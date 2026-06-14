import { GamificationService } from './gamification.service';
export declare class GamificationController {
    private readonly gamificationService;
    constructor(gamificationService: GamificationService);
    getProfile(req: any): Promise<{
        points: number;
        level: number;
        pointsIntoLevel: number;
        pointsPerLevel: number;
        streak: number;
        completedCount: number;
        perfectCount: number;
        achievements: {
            code: string;
            title: string;
            description: string;
            icon: string;
            target: number;
            progress: number;
            earned: boolean;
        }[];
    }>;
    getLeaderboard(req: any): Promise<{
        rank: number;
        id: any;
        name: any;
        surname: any;
        avatar: any;
        points: any;
        isMe: boolean;
    }[]>;
}
