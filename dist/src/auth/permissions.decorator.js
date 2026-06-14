"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permissions = exports.DEFAULT_ROLE_PERMISSIONS = exports.PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = 'permissions';
exports.DEFAULT_ROLE_PERMISSIONS = {
    ADMIN: ['MANAGE_COURSES', 'MANAGE_USERS', 'MANAGE_GROUPS', 'MANAGE_DECKS', 'CURATOR_DASHBOARD'],
    TEACHER: ['MANAGE_COURSES', 'MANAGE_DECKS'],
    CURATOR: ['CURATOR_DASHBOARD'],
    STUDENT: [],
    PARENT: [],
};
const Permissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.Permissions = Permissions;
//# sourceMappingURL=permissions.decorator.js.map