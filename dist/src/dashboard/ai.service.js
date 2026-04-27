"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
let AiService = class AiService {
    async generateStrictReport(studentName, testsScore, writtenScore, oralScore, weakestTheme) {
        const totalScore = Math.round((testsScore + writtenScore + oralScore) / 3);
        await new Promise(resolve => setTimeout(resolve, 800));
        return this.generateSmartAnalytics(totalScore, testsScore, writtenScore, weakestTheme);
    }
    generateSmartAnalytics(totalScore, testsScore, writtenScore, weakestTheme) {
        if (totalScore === 0) {
            return `Анализ успеваемости невозможен ввиду отсутствия сданных работ. Рекомендуется незамедлительно приступить к изучению теоретического материала и выполнению первых заданий.`;
        }
        let report = '';
        if (totalScore < 50) {
            report += `Выявлен критически низкий уровень усвоения материала (Средний балл: ${totalScore}/100). `;
        }
        else if (totalScore < 75) {
            report += `Анализ показывает удовлетворительный базовый уровень подготовки (Средний балл: ${totalScore}/100). `;
        }
        else {
            report += `Аналитика фиксирует высокий и стабильный уровень освоения образовательной программы (Средний балл: ${totalScore}/100). `;
        }
        if (writtenScore > 0 && testsScore > 0) {
            if (writtenScore < testsScore - 20) {
                report += `Наблюдается сильный дисбаланс: тестовая часть дается значительно лучше, чем письменные задания с развернутым ответом (Балл за ДЗ: ${writtenScore}). `;
            }
            else if (testsScore < writtenScore - 20) {
                report += `Студент отлично справляется с письменными работами (Балл за ДЗ: ${writtenScore}), однако допускает систематические ошибки в тестовой части. `;
            }
            else if (totalScore >= 75) {
                report += `Письменные задания и тесты выполняются на стабильно высоком и сбалансированном уровне. `;
            }
            else {
                report += `Качество выполнения тестов и письменных работ находится на одном уровне. `;
            }
        }
        else if (writtenScore === 0 && testsScore > 0) {
            report += `В системе зафиксированы только результаты тестов, развернутые домашние задания отсутствуют или ожидают проверки куратора. `;
        }
        if (weakestTheme && totalScore < 85) {
            report += `Программный алгоритм определил проблемный модуль: «${weakestTheme}». `;
            report += `Рекомендуется повторное прохождение теории и назначение дополнительных практических упражнений по данному разделу.`;
        }
        else if (totalScore >= 85) {
            report += `Критических пробелов в модулях не выявлено. Рекомендуется поддерживать текущий темп обучения.`;
        }
        else {
            report += `Рекомендуется сфокусироваться на полноте раскрытия тем при выполнении будущих заданий и проработать ошибки с куратором.`;
        }
        return report;
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)()
], AiService);
//# sourceMappingURL=ai.service.js.map