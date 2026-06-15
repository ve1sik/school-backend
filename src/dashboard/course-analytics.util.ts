type Bucket = { e: number; m: number; count: number };

export type CourseAnalytics = {
  id: string;
  title: string;
  averageScore: number;
  totalSubmissions: number;
  gradedCount: number;
  breakdown: { tests: number; written: number; oral: number };
  buckets: { tests: Bucket; written: Bucket; oral: Bucket };
  modules: Array<{
    id: string;
    title: string;
    averageScore: number;
    totalTests: number;
    breakdown: { tests: number; written: number; oral: number };
  }>;
};

const safePercent = (earned: number, max: number) =>
  max > 0 ? Math.round((earned / max) * 100) : 0;

const averageOfThree = (tests: number, written: number, oral: number) =>
  Math.round((tests + written + oral) / 3);

function emptyBucket(): Bucket {
  return { e: 0, m: 0, count: 0 };
}

function mergeBuckets(target: Bucket, source: Bucket) {
  target.e += source.e;
  target.m += source.m;
  target.count += source.count;
}

function bucketPct(b: Bucket) {
  return safePercent(b.e, b.m);
}

export function buildCourseAnalytics(course: any, submissions: any[]): CourseAnalytics | null {
  const gTests = emptyBucket();
  const gWritten = emptyBucket();
  const gOral = emptyBucket();
  const modulesList: CourseAnalytics['modules'] = [];
  let courseMax = 0;

  const courseLessonIds = new Set<string>();
  course.themes?.forEach((theme: any) => {
    theme.lessons?.forEach((lesson: any) => {
      if (lesson.include_in_analytics !== false) courseLessonIds.add(lesson.id);
    });
  });

  const courseSubs = submissions.filter((s) => courseLessonIds.has(s.lesson_id));
  const gradedSubs = [...courseSubs]
    .filter((s) => s.status === 'GRADED')
    .sort((a, b) => {
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      return bTime - aTime;
    });

  const latestForBlock = (lessonId: string, blockId: string) =>
    gradedSubs.find((s) => s.lesson_id === lessonId && s.block_id === blockId);

  const oralSubsForLesson = (lessonId: string) =>
    gradedSubs.filter(
      (s) => s.lesson_id === lessonId && String(s.block_id || '').startsWith('oral-'),
    );

  course.themes?.forEach((theme: any) => {
    const tTests = emptyBucket();
    const tWritten = emptyBucket();
    const tOral = emptyBucket();

    theme.lessons?.forEach((lesson: any) => {
      if (lesson.include_in_analytics === false) return;

      let blocks: any[] = [];
      try {
        const parsed = JSON.parse(lesson.content || '[]');
        if (Array.isArray(parsed)) blocks = parsed;
      } catch { /* ignore */ }

      const lTests = emptyBucket();
      const lWritten = emptyBucket();
      const lOral = emptyBucket();
      const usedSubIds = new Set<string>();

      const applyScore = (sub: any, type: 'tests' | 'written' | 'oral', maxScore: number) => {
        const earned = Number(sub.score) || 0;
        const max = Number(maxScore) || Number(sub.max_score) || 100;
        const bucket = type === 'tests' ? lTests : type === 'written' ? lWritten : lOral;
        mergeBuckets(bucket, { e: earned, m: max, count: 1 });
        courseMax += max;
      };

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
        applyScore(
          sub,
          blockType,
          Number(block.maxScore) || Number(sub.max_score) || (blockType === 'oral' ? 100 : 10),
        );
      });

      oralSubsForLesson(lesson.id).forEach((sub) => {
        if (usedSubIds.has(sub.id)) return;
        usedSubIds.add(sub.id);
        applyScore(sub, 'oral', 100);
      });

      mergeBuckets(tTests, lTests);
      mergeBuckets(tWritten, lWritten);
      mergeBuckets(tOral, lOral);
    });

    const themeTaskCount = tTests.count + tWritten.count + tOral.count;
    if (themeTaskCount === 0) return;

    const themeBreakdown = {
      tests: bucketPct(tTests),
      written: bucketPct(tWritten),
      oral: bucketPct(tOral),
    };

    modulesList.push({
      id: theme.id,
      title: theme.title,
      averageScore: averageOfThree(themeBreakdown.tests, themeBreakdown.written, themeBreakdown.oral),
      totalTests: themeTaskCount,
      breakdown: themeBreakdown,
    });

    mergeBuckets(gTests, tTests);
    mergeBuckets(gWritten, tWritten);
    mergeBuckets(gOral, tOral);
  });

  if (courseMax === 0) return null;

  const breakdown = {
    tests: bucketPct(gTests),
    written: bucketPct(gWritten),
    oral: bucketPct(gOral),
  };

  return {
    id: course.id,
    title: course.title,
    averageScore: averageOfThree(breakdown.tests, breakdown.written, breakdown.oral),
    totalSubmissions: courseSubs.length,
    gradedCount: gTests.count + gWritten.count + gOral.count,
    breakdown,
    buckets: { tests: gTests, written: gWritten, oral: gOral },
    modules: modulesList,
  };
}

export function mergeCourseAnalytics(courses: CourseAnalytics[]) {
  const merged = {
    tests: emptyBucket(),
    written: emptyBucket(),
    oral: emptyBucket(),
  };

  let totalSubmissions = 0;
  const modules: CourseAnalytics['modules'] = [];

  for (const course of courses) {
    totalSubmissions += course.totalSubmissions;
    modules.push(...course.modules);
    mergeBuckets(merged.tests, course.buckets.tests);
    mergeBuckets(merged.written, course.buckets.written);
    mergeBuckets(merged.oral, course.buckets.oral);
  }

  const breakdown = {
    tests: bucketPct(merged.tests),
    written: bucketPct(merged.written),
    oral: bucketPct(merged.oral),
  };

  let weakestTheme: { id: string; title: string; score: number } | null = null;
  for (const m of modules) {
    if (m.averageScore <= 75 && (!weakestTheme || m.averageScore < weakestTheme.score)) {
      weakestTheme = { id: m.id, title: m.title, score: m.averageScore };
    }
  }

  return {
    averageScore: averageOfThree(breakdown.tests, breakdown.written, breakdown.oral),
    gradedCount: merged.tests.count + merged.written.count + merged.oral.count,
    totalSubmissions,
    breakdown,
    modules,
    weakestTheme,
  };
}
