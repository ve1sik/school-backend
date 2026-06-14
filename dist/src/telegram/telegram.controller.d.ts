import { TelegramService } from './telegram.service';
export declare class TelegramController {
    private readonly telegramService;
    constructor(telegramService: TelegramService);
    handleWebhook(update: any): Promise<{
        method: "sendMessage";
        chat_id: string | number;
        text: string;
        parse_mode: string;
        disable_web_page_preview: boolean;
        reply_markup?: any;
    } | {
        ok: true;
    }>;
    getLinkCode(req: any): Promise<{
        code: string;
        botUrl: string;
        linked: boolean;
    }>;
    registerCommands(): Promise<void>;
    testSend(chatId: string): Promise<{
        ok: boolean;
    }>;
}
