import { Response } from 'express';
export declare class UploadController {
    uploadFile(file: Express.Multer.File): {
        url: string;
        originalName: string;
    };
    getFile(filename: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
}
