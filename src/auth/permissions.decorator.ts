import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export type AdminPermission =
  | 'MANAGE_COURSES'
  | 'MANAGE_USERS'
  | 'MANAGE_GROUPS'
  | 'MANAGE_DECKS'
  | 'CURATOR_DASHBOARD';

export const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  ADMIN: ['MANAGE_COURSES', 'MANAGE_USERS', 'MANAGE_GROUPS', 'MANAGE_DECKS', 'CURATOR_DASHBOARD'],
  TEACHER: ['MANAGE_COURSES', 'MANAGE_DECKS'],
  CURATOR: ['CURATOR_DASHBOARD'],
  STUDENT: [],
  PARENT: [],
};

export const Permissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
