export declare const PERMISSIONS_KEY = "permissions";
export type AdminPermission = 'MANAGE_COURSES' | 'MANAGE_USERS' | 'MANAGE_GROUPS' | 'MANAGE_DECKS' | 'CURATOR_DASHBOARD';
export declare const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermission[]>;
export declare const Permissions: (...permissions: AdminPermission[]) => import("@nestjs/common").CustomDecorator<string>;
