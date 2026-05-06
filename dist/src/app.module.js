"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const course_module_1 = require("./course/course.module");
const theme_module_1 = require("./theme/theme.module");
const lesson_module_1 = require("./lesson/lesson.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const submissions_module_1 = require("./submissions/submissions.module");
const schedule_module_1 = require("./schedule/schedule.module");
const upload_controller_1 = require("./upload/upload.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/api/uploads',
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            course_module_1.CoursesModule,
            theme_module_1.ThemeModule,
            lesson_module_1.LessonModule,
            dashboard_module_1.DashboardModule,
            submissions_module_1.SubmissionsModule,
            schedule_module_1.ScheduleModule,
        ],
        controllers: [
            upload_controller_1.UploadController,
        ],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map