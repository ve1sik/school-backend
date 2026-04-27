"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttemptService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AttemptService = class AttemptService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async submitTest(userId, dto) {
        const test = await this.prisma.test.findUnique({
            where: { id: dto.test_id },
            include: { questions: true },
        });
        if (!test)
            throw new common_1.BadRequestException('Тест не найден.');
        const attemptsCount = await this.prisma.testAttempt.count({
            where: { test_id: dto.test_id, user_id: userId },
        });
        if (attemptsCount >= test.max_attempts) {
            throw new common_1.BadRequestException('Лимит попыток для этого теста исчерпан.');
        }
        let totalScore = 0;
        const answersData = [];
        for (const studentAnswer of dto.answers) {
            const question = test.questions.find((q) => q.id === studentAnswer.question_id);
            if (!question)
                continue;
            const isCorrect = question.correct_answer === studentAnswer.user_answer;
            const pointsAwarded = isCorrect ? question.points : 0;
            totalScore += pointsAwarded;
            answersData.push({
                question_id: question.id,
                user_answer: studentAnswer.user_answer,
                is_correct: isCorrect,
            });
        }
        const newAttempt = await this.prisma.testAttempt.create({
            data: {
                test: { connect: { id: dto.test_id } },
                user: { connect: { id: userId } },
                score: totalScore,
                attempt_number: attemptsCount + 1,
                answers: {
                    create: answersData,
                },
            },
            include: {
                answers: true,
            },
        });
        return newAttempt;
    }
};
exports.AttemptService = AttemptService;
exports.AttemptService = AttemptService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttemptService);
//# sourceMappingURL=attempt.service.js.map