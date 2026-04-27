import { Request } from 'express';
export declare class UploadController {
    uploadFile(file: Express.Multer.File, req: Request): {
        url: string;
        fileName: string;
    };
}
