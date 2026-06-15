import { TelegramService } from './telegram.service';
export declare class TelegramController {
    private readonly telegramService;
    constructor(telegramService: TelegramService);
    handleWebhook(update: any): Promise<{
        [x: string]: any;
    }>;
    getLinkCode(req: any): Promise<{
        code: string;
        botUrl: string;
        linked: boolean;
    }>;
    registerCommands(): Promise<void>;
    health(): Promise<{
        tokenConfigured: boolean;
        botUsername: string;
        preparedCodes: number;
        linkedChats: number;
        architecture: string;
    }>;
    testSend(chatId: string): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
    }>;
}
