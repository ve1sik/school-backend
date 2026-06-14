import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
type WebhookReply = {
    method: 'sendMessage';
    chat_id: string | number;
    text: string;
    parse_mode: string;
    disable_web_page_preview: boolean;
    reply_markup?: any;
} | {
    ok: true;
};
export declare class TelegramService implements OnModuleInit {
    private prisma;
    private readonly logger;
    private readonly linksPath;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    private get token();
    get botUsername(): string;
    get botUrl(): string;
    registerBotCommands(): Promise<void>;
    private loadLinks;
    private saveLinks;
    private buildCode;
    ensureTelegramCode(userId: string): Promise<{
        code: string;
        botUrl: string;
        linked: boolean;
    }>;
    private getChatIdForUser;
    private findUserByCode;
    private findUserByChatId;
    private pushMessage;
    private reply;
    private answerCbq;
    handleUpdate(update: any): Promise<WebhookReply>;
    private handleMessage;
    private handleCallback;
    private requireLinked;
    private resolveStudent;
    private userName;
    private getStudentCourses;
    private sendWelcome;
    private handleStart;
    private handleLinkCode;
    private showHome;
    private showHelp;
    private showNotifSettings;
    private showProfile;
    private showCourseList;
    private showCourseStats;
    private showThemeStats;
    private showDeadlines;
    notifySubmissionGraded(submissionId: string, kind?: 'written' | 'oral'): Promise<void>;
    sendDeadlineReminders(): Promise<void>;
    testSend(chatId: string): Promise<{
        ok: boolean;
    }>;
    private buildOverallSummary;
    private calcStats;
    private getLessonBreakdown;
    private getNearestCourseDeadline;
    private getAnyNearestDeadline;
    private calcStreak;
}
export {};
