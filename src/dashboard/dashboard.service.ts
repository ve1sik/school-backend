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

    const attempts = await this.prisma.testAttempt.findMany({
      where: { user_id: targetUserId },
      orderBy: { created_at: 'desc' },
      include: { test: { include: { theme: true } } },
    });

    // 🔥 ВАЖНО: Теперь мы подтягиваем информацию о модуле (theme) из урока, чтобы сгруппировать ДЗ!
    const submissions = await this.prisma.submission.findMany({
      where: { user_id: targetUserId },
      include: { lesson: { include: { theme: true } } }
    });

    if (attempts.length === 0 && submissions.length === 0) {
      return {
        studentName, isLinked, totalTests: 0, averageScore: 0,
        breakdown: { tests: 0, written: 0, oral: 0 },
        streakDays: 0, weakestTheme: null, progressData: [], activityData: [],
        modules: [], // 🔥 Пустые модули, если нет данных
        aiReport: 'Данные для анализа отсутствуют. Начните выполнение тестов или домашних заданий.',
      };
    }

    const latestAttemptsMap = new Map();
    attempts.forEach((attempt) => {
      if (!latestAttemptsMap.has(attempt.test_id)) {
        latestAttemptsMap.set(attempt.test_id, attempt);
      }
    });
    const latestAttempts = Array.from(latestAttemptsMap.values());

    let totalScore = 0;
    const themeStats: Record<string, { title: string; sum: number; count: number }> = {};

    latestAttempts.forEach((attempt: any) => {
      totalScore += attempt.score;
      const theme = attempt.test.theme;
      if (!themeStats[theme.id]) {
        themeStats[theme.id] = { title: theme.title, sum: 0, count: 0 };
      }
      themeStats[theme.id].sum += attempt.score;
      themeStats[theme.id].count += 1;
    });

    let weakestTheme = null;
    let lowestAvg = 101;
    for (const [id, data] of Object.entries(themeStats)) {
      const avg = Math.round(data.sum / data.count);
      if (avg < lowestAvg && avg <= 75) {
        lowestAvg = avg;
        weakestTheme = { id, title: data.title, score: avg };
      }
    }

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

    const progressData = [];
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const dailyAttempts = attempts.filter(a => new Date(a.created_at) >= startOfDay && new Date(a.created_at) <= endOfDay);
      let dailyScore = 0;
      
      if (dailyAttempts.length > 0) {
        dailyScore = Math.round(dailyAttempts.reduce((sum, a) => sum + a.score, 0) / dailyAttempts.length);
      } else if (progressData.length > 0) {
        dailyScore = progressData[progressData.length - 1].score;
      }
      progressData.push({ name: daysOfWeek[d.getDay()], score: dailyScore });
    }

    let writtenScore = 0;
    const gradedSubmissions = submissions.filter(s => s.status === 'GRADED' && s.score !== null);
    
    if (gradedSubmissions.length > 0) {
      let totalPercentage = 0;
      gradedSubmissions.forEach(sub => {
         const percentage = (sub.score! / sub.max_score) * 100;
         totalPercentage += percentage;
      });
      writtenScore = Math.round(totalPercentage / gradedSubmissions.length);
    }

    // 🔥 ГРУППИРУЕМ МОДУЛИ (ЧТОБЫ НА ФРОНТЕ ПОЯВИЛИСЬ ТАБЫ)
    const modulesObj: Record<string, any> = {};

    latestAttempts.forEach((a: any) => {
      const theme = a.test.theme;
      if (!modulesObj[theme.id]) {
        modulesObj[theme.id] = { id: theme.id, title: theme.title, tSum: 0, tCount: 0, wSum: 0, wCount: 0 };
      }
      modulesObj[theme.id].tSum += a.score;
      modulesObj[theme.id].tCount += 1;
    });

    gradedSubmissions.forEach((s: any) => {
      const theme = s.lesson?.theme;
      if (theme) {
        if (!modulesObj[theme.id]) {
          modulesObj[theme.id] = { id: theme.id, title: theme.title, tSum: 0, tCount: 0, wSum: 0, wCount: 0 };
        }
        modulesObj[theme.id].wSum += (s.score / s.max_score) * 100;
        modulesObj[theme.id].wCount += 1;
      }
    });

    const modules = Object.values(modulesObj).map((m: any) => {
      const tScore = m.tCount > 0 ? Math.round(m.tSum / m.tCount) : 0;
      const wScore = m.wCount > 0 ? Math.round(m.wSum / m.wCount) : 0;
      let activeTypes = 0;
      let totalModScore = 0;
      if (m.tCount > 0) { activeTypes++; totalModScore += tScore; }
      if (m.wCount > 0) { activeTypes++; totalModScore += wScore; }
      
      return {
        id: m.id,
        title: m.title,
        averageScore: activeTypes > 0 ? Math.round(totalModScore / activeTypes) : 0,
        totalTests: m.tCount + m.wCount,
        breakdown: { tests: tScore, written: wScore, oral: 0 },
        activityData: [
          { name: 'Тесты', count: m.tCount },
          { name: 'Эссе', count: m.wCount },
          { name: 'Опросы', count: 0 }
        ],
        progressData // Используем общий график для наглядности
      };
    });

    const activityData = [
      { name: 'Тесты', count: attempts.length },
      { name: 'Эссе', count: submissions.length },
      { name: 'Опросы', count: 0 } 
    ];

    const testsScore = latestAttempts.length > 0 ? Math.round(totalScore / latestAttempts.length) : 0;
    const oralScore = 0;    

    const safeTests = Math.min(100, Math.max(0, testsScore));
    const safeWritten = Math.min(100, Math.max(0, writtenScore));
    const safeOral = Math.min(100, Math.max(0, oralScore));
    
    let activeSections = 0;
    let totalActiveScore = 0;
    
    if (latestAttempts.length > 0) { activeSections++; totalActiveScore += safeTests; }
    if (gradedSubmissions.length > 0) { activeSections++; totalActiveScore += safeWritten; }
    
    const finalAverageScore = activeSections > 0 ? Math.round(totalActiveScore / activeSections) : 0;

    const aiReport = await this.aiService.generateStrictReport(
      studentName, safeTests, safeWritten, safeOral, weakestTheme?.title || null,
    );

    return {
      studentName,
      isLinked,
      totalTests: attempts.length + submissions.length,
      averageScore: finalAverageScore,
      breakdown: { tests: safeTests, written: safeWritten, oral: safeOral },
      streakDays,
      weakestTheme,
      progressData, 
      activityData, 
      modules, // 🔥 ВОТ ОНИ! Теперь бэкенд отдает их на фронтенд!
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