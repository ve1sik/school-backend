import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. НАЙДИ СВОЙ EMAIL ТУТ (впиши тот, под которым заходишь на сайт)
  const myEmail = 'a@fre'; 

  console.log('🚀 Запуск авто-заправки данных...');

  const user = await prisma.user.findUnique({ where: { email: myEmail } });

  if (!user) {
    console.error(`❌ Ошибка: Пользователь с email ${myEmail} не найден. Сначала зарегайся на сайте!`);
    return;
  }

  // 2. СОЗДАЕМ КУРС
  const course = await prisma.course.create({
    data: {
      title: 'Русский язык (ОГЭ/ЕГЭ)',
      description: 'Полная подготовка к экзаменам',
    }
  });

  // 3. СОЗДАЕМ ТЕМУ
  const theme = await prisma.theme.create({
    data: {
      title: 'Правописание приставок ПРЕ- и ПРИ-',
      order_index: 1,
      course_id: course.id,
    }
  });

  // 4. СОЗДАЕМ ТЕСТ
  const test = await prisma.test.create({
    data: {
      title: 'Тест на знание приставок',
      theme_id: theme.id,
    }
  });

  // 5. СОЗДАЕМ "ПЛОХУЮ" ПОПЫТКУ (30 баллов)
  await prisma.testAttempt.create({
    data: {
      user_id: user.id,
      test_id: test.id,
      score: 30, // Специально низкий балл для теста аналитики
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