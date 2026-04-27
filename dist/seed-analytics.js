"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const myEmail = 'a@fre';
    console.log('🚀 Запуск авто-заправки данных...');
    const user = await prisma.user.findUnique({ where: { email: myEmail } });
    if (!user) {
        console.error(`❌ Ошибка: Пользователь с email ${myEmail} не найден. Сначала зарегайся на сайте!`);
        return;
    }
    const course = await prisma.course.create({
        data: {
            title: 'Русский язык (ОГЭ/ЕГЭ)',
            description: 'Полная подготовка к экзаменам',
        }
    });
    const theme = await prisma.theme.create({
        data: {
            title: 'Правописание приставок ПРЕ- и ПРИ-',
            order_index: 1,
            course_id: course.id,
        }
    });
    const test = await prisma.test.create({
        data: {
            title: 'Тест на знание приставок',
            theme_id: theme.id,
        }
    });
    await prisma.testAttempt.create({
        data: {
            user_id: user.id,
            test_id: test.id,
            score: 30,
            attempt_number: 1,
        }
    });
    console.log('✅ ГОТОВО! Данные заправлены.');
    console.log(`Курс: ${course.title}`);
    console.log(`Тема: ${theme.title}`);
    console.log('Теперь просто обнови главную страницу на сайте!');
}
main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=seed-analytics.js.map