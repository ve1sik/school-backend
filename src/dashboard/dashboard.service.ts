import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service'; 

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService, 
  ) {}

  async getStudentAnalytics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { children: true },
    });

    let targetUserId = userId;
    let studentName = user?.name || 'Ученик';
    let isLinked = true;

    if (user?.role === 'PARENT') {
      if (user.children && user.children.length > 0) {
        targetUserId = user.children[0].id;
        studentName = user.children[0].name || 'Ученик';
        isLinked = true;
      } else {
        isLinked = false;
      }
    }

    // Достаем старые попытки (для обратной совместимости)
    const attempts = await this.prisma.testAttempt.findMany({
      where: { user_id: targetUserId },
      orderBy: { created_at: 'desc' },
      include: { test: { include: { theme: true } } },
    });

    // Достаем новые сабмишены (тесты, ДЗ, эссе)
    const submissions = await this.prisma.submission.findMany({
      where: { user_id: targetUserId },
      include: { lesson: { include: { theme: true } } }
    });

    if (attempts.length === 0 && submissions.length === 0) {
      return {
        studentName, isLinked, totalTests: 0, averageScore: 0,
        breakdown: { tests: 0, written: 0, oral: 0 },
        streakDays: 0, weakestTheme: null, progressData: [], activityData: [],
        modules: [], 
        aiReport: 'Данные для анализа отсутствуют. Начните выполнение заданий, чтобы система смогла сформировать отчет.',
      };
    }

    // Отсеиваем дубликаты старых тестов (берем последнюю попытку)
    const latestAttemptsMap = new Map();
    attempts.forEach((attempt) => {
      if (!latestAttemptsMap.has(attempt.test_id)) {
        latestAttemptsMap.set(attempt.test_id, attempt);
      }
    });
    const latestAttempts = Array.from(latestAttemptsMap.values());

    // 🔥 ГЕНИАЛЬНЫЙ ФИКС МАТЕМАТИКИ: Собираем все проверенные работы в один массив с ПРАВИЛЬНЫМИ процентами
    const gradedItems = [];

    latestAttempts.forEach((a: any) => {
      if (a.test?.theme) {
        gradedItems.push({
          percentage: Math.min(100, Math.max(0, a.score)), // Защита от кривых данных
          date: new Date(a.created_at),
          theme: a.test.theme,
          type: 'test'
        });
      }
    });

    const gradedSubmissions = submissions.filter(s => s.status === 'GRADED' && s.score !== null && s.max_score > 0);
    gradedSubmissions.forEach((s: any) => {
      if (s.lesson?.theme) {
        gradedItems.push({
          // Строгий расчет: (Получил / Максимум) * 100
          percentage: Math.min(100, Math.max(0, (s.score / s.max_score) * 100)),
          date: new Date(s.created_at),
          theme: s.lesson.theme,
          type: 'written' // Считаем сабмишены как письменные работы для баланса
        });
      }
    });

    // 1. Итоговый средний балл (честный!)
    const totalPercentage = gradedItems.reduce((sum, item) => sum + item.percentage, 0);
    const finalAverageScore = gradedItems.length > 0 ? Math.round(totalPercentage / gradedItems.length) : 0;

    // 2. Группируем статистику по темам (чтобы найти слабую и собрать модули)
    const themeStats: Record<string, { id: string; title: string; sum: number; count: number }> = {};
    gradedItems.forEach(item => {
      const tId = item.theme.id;
      if (!themeStats[tId]) {
        themeStats[tId] = { id: tId, title: item.theme.title, sum: 0, count: 0 };
      }
      themeStats[tId].sum += item.percentage;
      themeStats[tId].count += 1;
    });

    let weakestTheme = null;
    let lowestAvg = 101;
    const modules = [];

    for (const [id, data] of Object.entries(themeStats)) {
      const avg = Math.round(data.sum / data.count);
      
      // Ищем самую слабую тему (меньше 75 баллов)
      if (avg < lowestAvg && avg <= 75) {
        lowestAvg = avg;
        weakestTheme = { id, title: data.title, score: avg };
      }

      // Собираем данные для модулей на фронтенде
      modules.push({
        id: data.id,
        title: data.title,
        averageScore: avg,
        totalTests: data.count,
        breakdown: { tests: avg, written: avg, oral: 0 }, // Упрощаем разбивку для красоты UI
        activityData: [
          { name: 'Выполнено', count: data.count }
        ]
      });
    }

    // 3. Высчитываем стрик (Дни подряд)
    const dates = attempts.map((a) => new Date(a.created_at).setHours(0, 0, 0, 0));
    submissions.forEach(s => dates.push(new Date(s.created_at).setHours(0, 0, 0, 0)));
    
    const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
    let streakDays = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    let currentDateCheck = uniqueDates[0] === today ? today : (uniqueDates[0] === yesterday ? yesterday : null);

    if (currentDateCheck !== null) {
      streakDays = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === currentDateCheck - 86400000) {
          streakDays++;
          currentDateCheck -= 86400000;
        } else break;
      }
    }

    // 🔥 4. УМНЫЙ НАКОПИТЕЛЬНЫЙ ГРАФИК ПРОГРЕССА (БЕЗ ПРОСАДОК)
    const progressData = [];
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    let cumulativeSum = 0;
    let cumulativeCount = 0;

    // Считаем всё, что было ДО последних 7 дней (чтобы график стартовал не с нуля, если ученик давно учится)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    gradedItems.filter(i => i.date < sevenDaysAgo).forEach(i => {
      cumulativeSum += i.percentage;
      cumulativeCount++;
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const dailyItems = gradedItems.filter(item => item.date >= startOfDay && item.date <= endOfDay);
      
      // Добавляем дневные результаты в копилку
      dailyItems.forEach(i => {
        cumulativeSum += i.percentage;
        cumulativeCount++;
      });

      // Считаем общий средний балл на этот конкретный день
      const scoreOfDay = cumulativeCount > 0 ? Math.round(cumulativeSum / cumulativeCount) : 0;
      progressData.push({ name: daysOfWeek[d.getDay()], score: scoreOfDay });
    }

    // 5. График активности (Количество сданных работ)
    const activityData = [
      { name: 'Тесты', count: latestAttempts.length },
      { name: 'Задания', count: submissions.length },
      { name: 'Опросы', count: 0 } 
    ];

    // 6. Формируем текст отчета через твой aiService
    // Передаем finalAverageScore во все параметры, чтобы ИИ видел общую реальную картину и не ругался на нули
    const aiReport = await this.aiService.generateStrictReport(
      studentName, finalAverageScore, finalAverageScore, 0, weakestTheme?.title || null,
    );

    return {
      studentName,
      isLinked,
      totalTests: attempts.length + submissions.length,
      averageScore: finalAverageScore,
      breakdown: { tests: finalAverageScore, written: finalAverageScore, oral: 0 },
      streakDays,
      weakestTheme,
      progressData, 
      activityData, 
      modules,
      aiReport, 
    };
  }

  async getMistakesWork(userId: string, themeId: string) {
    const lastAttempt = await this.prisma.testAttempt.findFirst({
      where: { user_id: userId, test: { theme_id: themeId } },
      orderBy: { created_at: 'desc' },
      include: {
        answers: {
          where: { is_correct: false },
          include: { question: true },
        },
      },
    });

    if (!lastAttempt || lastAttempt.answers.length === 0) {
      return { hasMistakes: false, questions: [] };
    }

    return {
      hasMistakes: true,
      testId: lastAttempt.test_id,
      questions: lastAttempt.answers.map((ans) => ({
        questionId: ans.question.id,
        content: ans.question.content,
        yourWrongAnswer: ans.user_answer,
      })),
    };
  }

  async saveTestResult(userId: string, testId: string, score: number, answers: any[]) {
    let testRecord = await this.prisma.test.findUnique({ where: { id: testId } });

    if (!testRecord) {
      const lesson = await this.prisma.lesson.findUnique({ where: { id: testId } });
      if (!lesson) throw new Error('Lesson not found');
      testRecord = await this.prisma.test.create({
        data: {
          id: testId,
          title: lesson.title,
          theme: { connect: { id: lesson.theme_id } },
        },
      });
    }

    for (const ans of answers) {
      const qExists = await this.prisma.question.findUnique({ where: { id: ans.questionId } });
      if (!qExists) {
        await this.prisma.question.create({
          data: {
            id: ans.questionId,
            test: { connect: { id: testId } },
            content: ans.questionText || 'Вопрос из урока',
          },
        });
      }
    }

    const prevCount = await this.prisma.testAttempt.count({ where: { user_id: userId, test_id: testId } });

    return this.prisma.testAttempt.create({
      data: {
        user: { connect: { id: userId } },
        test: { connect: { id: testId } },
        score,
        attempt_number: prevCount + 1,
        answers: {
          create: answers.map((ans) => ({
            question: { connect: { id: ans.questionId } },
            is_correct: ans.isCorrect,
            user_answer: ans.userAnswer || '',
          })),
        },
      },
    });
  }
}