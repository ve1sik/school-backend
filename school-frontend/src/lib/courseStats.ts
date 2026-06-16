import { parseSafeDate, parseSafeDateMs } from './parseDate';

export const PASS_SCORE = 70;

export const safePercent = (earned: number, max: number) =>
  max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;

export const averageOfThreeSections = (tests: number, written: number, oral: number) =>
  Math.round((tests + written + oral) / 3);

type ScoreBucket = { e: number; m: number; count: number };
type ScoreBuckets = { tests: ScoreBucket; written: ScoreBucket; oral: ScoreBucket };

export type CourseStats = {
  id: string;
  title: string;
  averageScore: number;
  totalEarned: number;
  totalMax: number;
  breakdown: { tests: number; written: number; oral: number };
  earnedByType: { tests: number; written: number; oral: number };
  maxByType: { tests: number; written: number; oral: number };
  modules: Array<{
    id: string;
    title: string;
    averageScore: number;
    progressData: Array<{ taskCount?: number }>;
  }>;
  counts: { tests: number; written: number; oral: number };
  totalSubmissions: number;
};

export function buildCourseStats(course: any, mySubs: any[]): CourseStats | null {
  const g_tests = { e: 0, m: 0, count: 0 };
  const g_written = { e: 0, m: 0, count: 0 };
  const g_oral = { e: 0, m: 0, count: 0 };

  const modulesList: CourseStats['modules'] = [];
  let courseEarned = 0;
  let courseMax = 0;

  const courseLessonIds = new Set<string>();
  course.themes?.forEach((theme: any) => {
    theme.lessons?.forEach((lesson: any) => {
      if (lesson.include_in_analytics !== false) courseLessonIds.add(lesson.id);
    });
  });

  const courseSubs = mySubs.filter((s: any) => courseLessonIds.has(s.lesson_id || s.lessonId));

  const gradedSubs = [...courseSubs]
    .filter((s: any) => s.status === 'GRADED')
    .sort((a: any, b: any) => {
      const bTime = parseSafeDateMs(b.updated_at || b.created_at || 0);
      const aTime = parseSafeDateMs(a.updated_at || a.created_at || 0);
      return bTime - aTime;
    });

  const latestForBlock = (lessonId: string, blockId: string) =>
    gradedSubs.find((s: any) => {
      const subLessonId = s.lesson_id || s.lessonId;
      const subBlockId = s.block_id || s.blockId;
      return subLessonId === lessonId && subBlockId === blockId;
    });

  const oralSubsForLesson = (lessonId: string) =>
    gradedSubs.filter((s: any) => {
      const subLessonId = s.lesson_id || s.lessonId;
      const subBlockId = String(s.block_id || s.blockId || '');
      return subLessonId === lessonId && subBlockId.startsWith('oral-');
    });

  const addScore = (
    sub: any,
    type: 'tests' | 'written' | 'oral',
    maxScore: number,
    target: { earned: number; max: number; taskCount: number; byType: ScoreBuckets },
  ) => {
    const earnedScore = Number(sub.score) || 0;
    const finalMax = Number(maxScore) || Number(sub.max_score) || 100;
    target.earned += earnedScore;
    target.max += finalMax;
    target.taskCount += 1;
    target.byType[type].e += earnedScore;
    target.byType[type].m += finalMax;
    target.byType[type].count += 1;
    courseEarned += earnedScore;
    courseMax += finalMax;
  };

  course.themes?.forEach((theme: any, themeIdx: number) => {
    const t_tests = { e: 0, m: 0, count: 0 };
    const t_written = { e: 0, m: 0, count: 0 };
    const t_oral = { e: 0, m: 0, count: 0 };
    let themeTaskCount = 0;
    const themeLessonsProgress: Array<{ taskCount?: number }> = [];

    theme.lessons?.forEach((lesson: any) => {
      if (lesson.include_in_analytics === false) return;

      let blocks: any[] = [];
      try {
        const parsed = JSON.parse(lesson.content || '[]');
        if (Array.isArray(parsed)) blocks = parsed;
      } catch { /* ignore */ }

      const l_tests = { e: 0, m: 0, count: 0 };
      const l_written = { e: 0, m: 0, count: 0 };
      const l_oral = { e: 0, m: 0, count: 0 };
      const lessonTarget = {
        earned: 0,
        max: 0,
        taskCount: 0,
        byType: { tests: l_tests, written: l_written, oral: l_oral },
      };
      const usedSubIds = new Set<string>();

      blocks.forEach((block: any) => {
        const sub = latestForBlock(lesson.id, block.id);
        if (!sub) return;
        const blockType =
          block.type === 'test' || block.type === 'test_short' || block.type === 'matching'
            ? 'tests'
            : block.type === 'written' || block.type === 'homework' || block.isHomework
              ? 'written'
              : block.type === 'oral'
                ? 'oral'
                : null;
        if (!blockType) return;
        usedSubIds.add(sub.id);
        addScore(
          sub,
          blockType,
          Number(block.maxScore) || Number(sub.max_score) || (blockType === 'oral' ? 100 : 10),
          lessonTarget,
        );
      });

      oralSubsForLesson(lesson.id).forEach((sub: any) => {
        if (usedSubIds.has(sub.id)) return;
        usedSubIds.add(sub.id);
        addScore(sub, 'oral', 100, lessonTarget);
      });

      if (lessonTarget.taskCount > 0) {
        themeTaskCount += lessonTarget.taskCount;
        t_tests.e += l_tests.e; t_tests.m += l_tests.m; t_tests.count += l_tests.count;
        t_written.e += l_written.e; t_written.m += l_written.m; t_written.count += l_written.count;
        t_oral.e += l_oral.e; t_oral.m += l_oral.m; t_oral.count += l_oral.count;
        themeLessonsProgress.push({ taskCount: lessonTarget.taskCount });
      }
    });

    if (themeTaskCount === 0) return;

    const themeTestsScore = safePercent(t_tests.e, t_tests.m);
    const themeWrittenScore = safePercent(t_written.e, t_written.m);
    const themeOralScore = safePercent(t_oral.e, t_oral.m);

    g_tests.e += t_tests.e; g_tests.m += t_tests.m; g_tests.count += t_tests.count;
    g_written.e += t_written.e; g_written.m += t_written.m; g_written.count += t_written.count;
    g_oral.e += t_oral.e; g_oral.m += t_oral.m; g_oral.count += t_oral.count;

    modulesList.push({
      id: theme.id,
      title: theme.title,
      averageScore: averageOfThreeSections(themeTestsScore, themeWrittenScore, themeOralScore),
      progressData: themeLessonsProgress,
    });
  });

  if (courseMax === 0) return null;

  const breakdown = {
    tests: safePercent(g_tests.e, g_tests.m),
    written: safePercent(g_written.e, g_written.m),
    oral: safePercent(g_oral.e, g_oral.m),
  };

  return {
    id: course.id,
    title: course.title,
    averageScore: averageOfThreeSections(breakdown.tests, breakdown.written, breakdown.oral),
    totalEarned: courseEarned,
    totalMax: courseMax,
    totalSubmissions: courseSubs.length,
    counts: { tests: g_tests.count, written: g_written.count, oral: g_oral.count },
    breakdown,
    earnedByType: { tests: g_tests.e, written: g_written.e, oral: g_oral.e },
    maxByType: { tests: g_tests.m, written: g_written.m, oral: g_oral.m },
    modules: modulesList,
  };
}

function calcStreak(submissions: any[]) {
  const dates = submissions.map((s) => {
    const d = parseSafeDate(s.created_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const unique = [...new Set(dates)].sort((a, b) => b - a);
  if (!unique.length) return 0;
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  let check = unique[0] === today ? today : unique[0] === yesterday ? yesterday : null;
  if (check === null) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === check - 86400000) { streak++; check -= 86400000; } else break;
  }
  return streak;
}

/** Те же цифры, что на дашборде ученика — считаем на клиенте из courses + submissions. */
export function buildParentView(courses: any[], submissions: any[]) {
  const statsList = courses
    .map((c) => buildCourseStats(c, submissions))
    .filter((s): s is CourseStats => !!s);

  if (!statsList.length) {
    return {
      averageScore: 0,
      breakdown: { tests: 0, written: 0, oral: 0 },
      gradedCount: 0,
      totalTests: submissions.length,
      streakDays: calcStreak(submissions),
      modules: [] as any[],
      weakestTheme: null as { id: string; title: string; score: number } | null,
    };
  }

  let tE = 0; let tM = 0; let tC = 0;
  let wE = 0; let wM = 0; let wC = 0;
  let oE = 0; let oM = 0; let oC = 0;
  const modules: any[] = [];

  for (const s of statsList) {
    tE += s.earnedByType.tests; tM += s.maxByType.tests; tC += s.counts.tests;
    wE += s.earnedByType.written; wM += s.maxByType.written; wC += s.counts.written;
    oE += s.earnedByType.oral; oM += s.maxByType.oral; oC += s.counts.oral;
    s.modules.forEach((m) => {
      modules.push({
        id: m.id,
        title: m.title,
        averageScore: m.averageScore,
        totalTests: m.progressData.reduce((sum, row) => sum + (row.taskCount || 0), 0),
      });
    });
  }

  const breakdown = {
    tests: safePercent(tE, tM),
    written: safePercent(wE, wM),
    oral: safePercent(oE, oM),
  };

  let weakestTheme: { id: string; title: string; score: number } | null = null;
  for (const m of modules) {
    if (m.averageScore <= 75 && (!weakestTheme || m.averageScore < weakestTheme.score)) {
      weakestTheme = { id: m.id, title: m.title, score: m.averageScore };
    }
  }

  return {
    averageScore: averageOfThreeSections(breakdown.tests, breakdown.written, breakdown.oral),
    breakdown,
    gradedCount: tC + wC + oC,
    totalTests: submissions.length,
    streakDays: calcStreak(submissions),
    modules,
    weakestTheme,
  };
}
