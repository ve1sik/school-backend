import { PrismaService } from '../prisma/prisma.service';
export declare class GamificationService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
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
    getLeaderboard(userId: string): Promise<{
        rank: number;
        id: any;
        name: any;
        surname: any;
        avatar: any;
        points: any;
        isMe: boolean;
    }[]>;
    private computeStreak;
    private computeAchievements;
}
