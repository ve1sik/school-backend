import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Loader2, PenTool, AlertCircle, CheckSquare, Mic,
  Target, X, BookOpen, ChevronRight, TrendingDown, Layers, List, BarChart2,
  PanelRightOpen, Star, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cachedGet } from '../lib/api';

const COURSE_INLINE_LIMIT = 3;
const PASS_SCORE = 70;

const safePercent = (earned: number, max: number) =>
  max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;

const scoreOutOf100 = (earned: number, max: number) => safePercent(earned, max);

const stripHtml = (html: string) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const blockTypeLabel = (type: string, isHomework?: boolean) => {
  if (isHomework) return 'Домашнее задание';
  if (type === 'test' || type === 'test_short') return 'Тест';
  if (type === 'written') return 'Развёрнутый ответ';
  if (type === 'matching') return 'Таблица';
  if (type === 'oral') return 'Устный опрос';
  return 'Задание';
};

const scoreBarColor = (score: number) => {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#f43f5e';
};


type ScoreChartRow = {
  name: string;
  fullName: string;
  moduleTitle?: string;
  orderIndex?: number;
  lessonId?: string;
  score: number;
  earned: number;
  max: number;
  taskCount: number;
  earnedByType?: { tests: number; written: number; oral: number };
  maxByType?: { tests: number; written: number; oral: number };
  breakdown?: { tests: number; written: number; oral: number };
};

type ScoreBucket = { e: number; m: number; count: number };
type ScoreBuckets = { tests: ScoreBucket; written: ScoreBucket; oral: ScoreBucket };


function ScoreTable({ data }: { data: ScoreChartRow[] }) {
  const sorted = [...data].sort((a, b) => a.orderIndex - b.orderIndex);
  if (!sorted.length) return (
    <div className="flex items-center justify-center h-24 text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
      Нет данных
    </div>
  );
  return (
    <div className="space-y-2">
      {sorted.map((row) => {
        const color = scoreBarColor(row.score);
        const emoji = row.score >= 70 ? '✅' : row.score >= 50 ? '🟡' : '🔴';
    return (
          <div key={row.fullName} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-black w-8 text-center shrink-0">{emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-snug truncate">{row.moduleTitle || row.fullName}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${row.score}%`, backgroundColor: color }} />
                </div>
                <span className="text-xs font-black shrink-0" style={{ color }}>{row.score}%</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-black text-gray-900">{row.earned}</p>
              <p className="text-xs text-gray-400">из {row.max}</p>
            </div>
          </div>
        );
      })}
      </div>
    );
  }

type WeakSpot = {
  id: string;
  blockTitle: string;
  lessonTitle: string;
  themeTitle: string;
  themeId: string;
  courseId: string;
  lessonId: string;
  isHomework: boolean;
  percent: number;
  score: number;
  maxScore: number;
  type: string;
};

type ModuleStats = {
  id: string;
  title: string;
  orderIndex: number;
  averageScore: number;
  earned: number;
  max: number;
  breakdown: { tests: number; written: number; oral: number };
  earnedByType: { tests: number; written: number; oral: number };
  maxByType: { tests: number; written: number; oral: number };
  progressData: ScoreChartRow[];
  weakSpots: WeakSpot[];
};

type CourseStats = {
  id: string;
  title: string;
  averageScore: number;
  totalEarned: number;
  totalMax: number;
  breakdown: { tests: number; written: number; oral: number };
  earnedByType: { tests: number; written: number; oral: number };
  maxByType: { tests: number; written: number; oral: number };
  modules: ModuleStats[];
  progressData: ScoreChartRow[];
  weakSpots: WeakSpot[];
  totalSubmissions: number;
  counts: { tests: number; written: number; oral: number };
  aiReport: string;
};

function buildCourseStats(course: any, mySubs: any[]): CourseStats | null {
  const g_tests = { e: 0, m: 0, count: 0 };
  const g_written = { e: 0, m: 0, count: 0 };
  const g_oral = { e: 0, m: 0, count: 0 };

  const modulesList: ModuleStats[] = [];
  const globalProgressData: ScoreChartRow[] = [];
  const courseWeakSpots: WeakSpot[] = [];
  let courseEarned = 0;
  let courseMax = 0;

  const courseLessonIds = new Set<string>();
  course.themes?.forEach((theme: any) => {
    theme.lessons?.forEach((lesson: any) => courseLessonIds.add(lesson.id));
  });

  const courseSubs = mySubs.filter((s: any) => {
    const lessonId = s.lesson_id || s.lessonId;
    return courseLessonIds.has(lessonId);
  });

  const gradedSubs = [...courseSubs]
    .filter((s: any) => s.status === 'GRADED')
    .sort((a: any, b: any) => {
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
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

  const addScore = ({
    sub,
    type,
    maxScore,
    title,
    lesson,
    theme,
    target,
  }: {
    sub: any;
    type: 'tests' | 'written' | 'oral';
    maxScore: number;
    title: string;
    lesson: any;
    theme: any;
    target: { earned: number; max: number; taskCount: number; byType: ScoreBuckets; weakSpots: WeakSpot[] };
  }) => {
    const earnedScore = Number(sub.score) || 0;
    const finalMax = Number(maxScore) || Number(sub.max_score) || 100;
    const percent = safePercent(earnedScore, finalMax);

    target.earned += earnedScore;
    target.max += finalMax;
    target.taskCount += 1;
    target.byType[type].e += earnedScore;
    target.byType[type].m += finalMax;
    target.byType[type].count += 1;

    courseEarned += earnedScore;
    courseMax += finalMax;

    if (percent < PASS_SCORE) {
      const spot: WeakSpot = {
        id: `${lesson.id}-${sub.id}`,
        blockTitle: title,
        lessonTitle: lesson.title,
        themeTitle: theme.title,
        themeId: theme.id,
        courseId: course.id,
        lessonId: lesson.id,
        isHomework: !!lesson.is_homework,
        percent,
        score: earnedScore,
        maxScore: finalMax,
        type: type === 'tests' ? 'test' : type === 'written' ? 'written' : 'oral',
      };
      target.weakSpots.push(spot);
      courseWeakSpots.push(spot);
    }
  };

  course.themes?.forEach((theme: any, themeIdx: number) => {
    const t_tests = { e: 0, m: 0, count: 0 };
    const t_written = { e: 0, m: 0, count: 0 };
    const t_oral = { e: 0, m: 0, count: 0 };

    let themeEarned = 0;
    let themeMax = 0;
    let themeTaskCount = 0;
    const themeLessonsProgress: ScoreChartRow[] = [];
    const themeWeakSpots: WeakSpot[] = [];

    theme.lessons?.forEach((lesson: any) => {
      let blocks: any[] = [];
      try {
        const parsed = JSON.parse(lesson.content || '[]');
        if (Array.isArray(parsed)) blocks = parsed;
      } catch {
        /* ignore */
      }

      const l_tests = { e: 0, m: 0, count: 0 };
      const l_written = { e: 0, m: 0, count: 0 };
      const l_oral = { e: 0, m: 0, count: 0 };
      const lessonTarget = {
        earned: 0,
        max: 0,
        taskCount: 0,
        byType: { tests: l_tests, written: l_written, oral: l_oral },
        weakSpots: themeWeakSpots,
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
        addScore({
          sub,
          type: blockType,
          maxScore: Number(block.maxScore) || Number(sub.max_score) || (blockType === 'oral' ? 100 : 10),
          title: stripHtml(block.title || block.question || '') || blockTypeLabel(block.type, block.isHomework),
          lesson,
          theme,
          target: lessonTarget,
        });
      });

      // Устная оценка может быть выставлена куратором на урок целиком, даже если в контенте нет oral-блока.
      oralSubsForLesson(lesson.id).forEach((sub: any) => {
        if (usedSubIds.has(sub.id)) return;
        usedSubIds.add(sub.id);
        addScore({
          sub,
          type: 'oral',
          maxScore: 100,
          title: 'Устный ответ',
          lesson,
          theme,
          target: lessonTarget,
        });
      });

      if (lessonTarget.taskCount > 0) {
        const lessonScore = safePercent(lessonTarget.earned, lessonTarget.max);
        themeEarned += lessonTarget.earned;
        themeMax += lessonTarget.max;
        themeTaskCount += lessonTarget.taskCount;

        t_tests.e += l_tests.e; t_tests.m += l_tests.m; t_tests.count += l_tests.count;
        t_written.e += l_written.e; t_written.m += l_written.m; t_written.count += l_written.count;
        t_oral.e += l_oral.e; t_oral.m += l_oral.m; t_oral.count += l_oral.count;

        themeLessonsProgress.push({
          name: lesson.title.length > 22 ? `${lesson.title.slice(0, 22)}…` : lesson.title,
          fullName: lesson.title,
          score: lessonScore,
          earned: lessonTarget.earned,
          max: lessonTarget.max,
          taskCount: lessonTarget.taskCount,
          lessonId: lesson.id,
          earnedByType: { tests: l_tests.e, written: l_written.e, oral: l_oral.e },
          maxByType: { tests: l_tests.m, written: l_written.m, oral: l_oral.m },
          breakdown: {
            tests: safePercent(l_tests.e, l_tests.m),
            written: safePercent(l_written.e, l_written.m),
            oral: safePercent(l_oral.e, l_oral.m),
          },
        });
      }
    });

    if (themeTaskCount > 0) {
      const orderIndex = theme.order_index ?? themeIdx + 1;
      const themeTotalScore = safePercent(themeEarned, themeMax);

      g_tests.e += t_tests.e; g_tests.m += t_tests.m; g_tests.count += t_tests.count;
      g_written.e += t_written.e; g_written.m += t_written.m; g_written.count += t_written.count;
      g_oral.e += t_oral.e; g_oral.m += t_oral.m; g_oral.count += t_oral.count;

      themeWeakSpots.sort((a, b) => a.percent - b.percent);

      modulesList.push({
        id: theme.id,
        title: theme.title,
        orderIndex,
        averageScore: themeTotalScore,
        earned: themeEarned,
        max: themeMax,
        breakdown: {
          tests: safePercent(t_tests.e, t_tests.m),
          written: safePercent(t_written.e, t_written.m),
          oral: safePercent(t_oral.e, t_oral.m),
        },
        earnedByType: { tests: t_tests.e, written: t_written.e, oral: t_oral.e },
        maxByType: { tests: t_tests.m, written: t_written.m, oral: t_oral.m },
        progressData: themeLessonsProgress,
        weakSpots: themeWeakSpots,
      });

      globalProgressData.push({
        name: `М${orderIndex}`,
        fullName: `Модуль ${orderIndex}. ${theme.title}`,
        moduleTitle: theme.title,
        orderIndex,
        score: themeTotalScore,
        earned: themeEarned,
        max: themeMax,
        taskCount: themeTaskCount,
        earnedByType: { tests: t_tests.e, written: t_written.e, oral: t_oral.e },
        maxByType: { tests: t_tests.m, written: t_written.m, oral: t_oral.m },
        breakdown: {
          tests: safePercent(t_tests.e, t_tests.m),
          written: safePercent(t_written.e, t_written.m),
          oral: safePercent(t_oral.e, t_oral.m),
        },
      });
    }
  });

  if (courseMax === 0) return null;

  const globalPTests = safePercent(g_tests.e, g_tests.m);
  const globalPWritten = safePercent(g_written.e, g_written.m);
  const globalPOral = safePercent(g_oral.e, g_oral.m);
  const coursePercent = safePercent(courseEarned, courseMax);

  courseWeakSpots.sort((a, b) => a.percent - b.percent);

  const existingCategories = [
    g_tests.m > 0 ? { label: 'тесты', value: globalPTests } : null,
    g_written.m > 0 ? { label: 'развёрнутые ответы', value: globalPWritten } : null,
    g_oral.m > 0 ? { label: 'устные опросы', value: globalPOral } : null,
  ].filter(Boolean) as { label: string; value: number }[];
  const weakest = existingCategories.sort((a, b) => a.value - b.value)[0];

  const aiReport =
    `По курсу «${course.title}» набрано ${courseEarned} из ${courseMax} возможных баллов (${coursePercent}/100).\n\n` +
    (weakest
      ? `Слабее всего: ${weakest.label} (${weakest.value}/100).`
      : 'Пока мало данных для детальной рекомендации.');

  return {
    id: course.id,
    title: course.title,
    averageScore: coursePercent,
    totalEarned: courseEarned,
    totalMax: courseMax,
    totalSubmissions: courseSubs.length,
    counts: { tests: g_tests.count, written: g_written.count, oral: g_oral.count },
    breakdown: { tests: globalPTests, written: globalPWritten, oral: globalPOral },
    earnedByType: { tests: g_tests.e, written: g_written.e, oral: g_oral.e },
    maxByType: { tests: g_tests.m, written: g_written.m, oral: g_oral.m },
    modules: modulesList,
    progressData: globalProgressData,
    weakSpots: courseWeakSpots.slice(0, 12),
    aiReport,
  };
}

function WeakSpotsList({
  spots,
  onOpen,
  limit = 6,
}: {
  spots: WeakSpot[];
  onOpen: (s: WeakSpot) => void;
  limit?: number;
}) {
  const list = spots.slice(0, limit);
  if (list.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
        <p className="font-bold text-emerald-700">Отлично! Слабых мест ниже 70% не найдено.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((spot) => (
        <button
          key={spot.id}
          type="button"
          onClick={() => onOpen(spot)}
          className="w-full text-left p-4 md:p-5 rounded-2xl border-2 border-rose-100 bg-white hover:border-rose-300 hover:shadow-md transition-all group flex items-center gap-4"
        >
          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 font-black ${
            spot.percent === 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <span className="text-lg leading-none">{spot.percent}%</span>
            <span className="text-[9px] uppercase tracking-wider opacity-70 mt-0.5">балл</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              {spot.themeTitle} · {blockTypeLabel(spot.type, spot.isHomework)}
            </p>
            <p className="font-black text-gray-900 truncate">{spot.blockTitle}</p>
            <p className="text-sm font-medium text-gray-500 truncate mt-0.5">{spot.lessonTitle}</p>
            <p className="text-xs text-gray-400 mt-1">
              {spot.score} из {spot.maxScore} баллов
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#5A4BFF] shrink-0 transition-colors" />
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseStatsMap, setCourseStatsMap] = useState<Record<string, CourseStats>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCourseDrawer, setShowCourseDrawer] = useState(false);
  const [modulesExpanded, setModulesExpanded] = useState(false);
  // drill-down: выбранный урок внутри модуля
  const [selectedLessonRow, setSelectedLessonRow] = useState<ScoreChartRow | null>(null);

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // 🚀 Общий кеш курсов/работ — навигация между страницами не дёргает бэкенд заново
        const [coursesData, subsData] = await Promise.all([
          cachedGet('/courses').catch(() => []),
          cachedGet('/submissions/my', 0).catch(() => []),
        ]);
        const coursesRes = { data: coursesData };
        const subsRes = { data: subsData };

        const rawCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
        const mySubs = Array.isArray(subsRes.data) ? subsRes.data : [];

        setCourses(rawCourses);

        const map: Record<string, CourseStats> = {};
        rawCourses.forEach((course: any) => {
          const stats = buildCourseStats(course, mySubs);
          if (stats) map[course.id] = stats;
        });

        setCourseStatsMap(map);

        const withStats = rawCourses.filter((c: any) => map[c.id]);
        if (withStats.length > 0) {
          setSelectedCourseId(withStats[0].id);
        } else if (rawCourses.length > 0) {
          setSelectedCourseId(rawCourses[0].id);
        }
      } catch (error) { 
        console.error('Ошибка загрузки дашборда', error); 
      } finally { 
        setIsLoading(false); 
      }
    };
    
    fetchRealStats();
  }, [navigate]);

  const selectedStats = courseStatsMap[selectedCourseId];
  const availableModules = selectedStats?.modules ?? [];
  const activeModule = activeTab !== 'all' ? availableModules.find((m) => m.id === activeTab) ?? null : null;

  // Если выбран конкретный урок в модуле, формируем синтетические данные для него
  const currentData = (() => {
    if (selectedLessonRow && activeModule) {
      return {
        averageScore: selectedLessonRow.score,
        totalEarned: selectedLessonRow.earned,
        totalMax: selectedLessonRow.max,
        earned: selectedLessonRow.earned,
        max: selectedLessonRow.max,
        breakdown: selectedLessonRow.breakdown ?? { tests: 0, written: 0, oral: 0 },
        earnedByType: selectedLessonRow.earnedByType ?? { tests: 0, written: 0, oral: 0 },
        maxByType: selectedLessonRow.maxByType ?? { tests: 0, written: 0, oral: 0 },
        progressData: [],
      } as any;
    }
    if (activeTab === 'all') return selectedStats;
    return activeModule ?? selectedStats;
  })();

  const currentWeakSpots =
    activeTab === 'all'
      ? selectedStats?.weakSpots ?? []
      : activeModule?.weakSpots ?? [];

  const handleOpenWeakSpot = (spot: WeakSpot) => {
    if (spot.isHomework) {
      navigate(`/homework/${spot.lessonId}`);
      return;
    }
    navigate(`/course/${spot.courseId}/theme/${spot.themeId}`);
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveTab('all');
    setSelectedLessonRow(null);
    setModulesExpanded(false);
    setShowCourseDrawer(false);
  };

  const coursesWithAnalytics = useMemo(
    () => courses.filter((c) => courseStatsMap[c.id]),
    [courses, courseStatsMap],
  );

  // Модули для повторения (<50% по всем курсам)
  const weakModules = useMemo(() => {
    const result: { courseTitle: string; courseId: string; module: ModuleStats }[] = [];
    Object.values(courseStatsMap).forEach(cs => {
      cs.modules.forEach(m => {
        if (m.averageScore < 50) {
          result.push({ courseTitle: cs.title, courseId: cs.id, module: m });
        }
      });
    });
    return result.sort((a, b) => a.module.averageScore - b.module.averageScore);
  }, [courseStatsMap]);

  const isCourseView = activeTab === 'all';
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const useCourseDrawer = courses.length > COURSE_INLINE_LIMIT;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  const testsScore = Math.round(currentData?.earnedByType?.tests ?? 0);
  const writtenScore = Math.round(currentData?.earnedByType?.written ?? 0);
  const oralScore = Math.round(currentData?.earnedByType?.oral ?? 0);
  const totalSectionScore = testsScore + writtenScore + oralScore;
  const totalSectionMax = 300;
  const totalSectionProgress = safePercent(totalSectionScore, totalSectionMax);
  const currentTaskCount = selectedLessonRow
    ? selectedLessonRow.taskCount
    : isCourseView
      ? (selectedStats?.counts.tests ?? 0) + (selectedStats?.counts.written ?? 0) + (selectedStats?.counts.oral ?? 0)
      : ((currentData as any)?.progressData ?? []).reduce((sum: number, row: ScoreChartRow) => sum + row.taskCount, 0);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F4F7FE]">
        <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
    <div className="h-screen flex flex-col items-center justify-center text-center p-8 bg-[#F4F7FE]">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">У вас пока нет курсов</h2>
        <p className="text-gray-500 font-medium mb-6">Запишитесь на курс в магазине, чтобы открыть аналитику.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-[#5A4BFF] text-white rounded-xl font-black text-sm"
        >
          Перейти в магазин
        </button>
      </div>
    );
  }

  if (!selectedStats) {
    return (
      <div className="max-w-7xl mx-auto p-8 bg-[#F4F7FE] min-h-screen">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4 mx-auto" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Аналитика по курсу формируется…</h2>
          <p className="text-gray-500 font-medium max-w-md mx-auto">
            По курсу «{selectedCourse?.title || ''}» статистика появится, когда куратор проверит первые задания.
          </p>
          {coursesWithAnalytics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 justify-center">
              {coursesWithAnalytics.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCourseChange(c.id)}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:border-[#5A4BFF]"
                >
                  {c.title} ({courseStatsMap[c.id]?.averageScore}/100)
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 pt-4 px-4 sm:px-6 lg:px-8 bg-[#F4F7FE] min-h-screen relative">
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">Аналитика</h1>
            <p className="text-gray-500 font-medium mt-2">Сначала общая картина — затем детали по курсу</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowDetailsModal(true)}
            className="px-6 py-3 bg-white text-[#5A4BFF] hover:bg-indigo-50 border border-indigo-100 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm w-fit"
          >
            <List className="w-4 h-4" /> Подробная сводка
          </button>
        </div>

        {/* ВЫБОР КУРСА */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Аналитика по курсу
            </p>
            {useCourseDrawer && (
              <button
                type="button"
                onClick={() => setShowCourseDrawer(true)}
                className="shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:border-[#5A4BFF] hover:text-[#5A4BFF] flex items-center gap-2 shadow-sm transition-all"
              >
                <PanelRightOpen className="w-4 h-4" />
                Все курсы ({courses.length})
              </button>
            )}
          </div>

          {useCourseDrawer ? (
            <button
              type="button"
              onClick={() => setShowCourseDrawer(true)}
              className="w-full p-5 rounded-2xl border-2 border-[#5A4BFF] bg-white shadow-lg shadow-indigo-500/10 text-left flex items-center justify-between gap-4 hover:bg-indigo-50/30 transition-all"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#5A4BFF] mb-1">Выбранный курс</p>
                <p className="font-black text-lg text-gray-900 truncate">{selectedCourse?.title}</p>
                {selectedStats && (
                  <p className="mt-1 text-2xl font-black text-[#5A4BFF]">
                    {selectedStats.averageScore}<span className="text-sm text-gray-400">/100</span>
                  </p>
                )}
              </div>
              <ChevronRight className="w-6 h-6 text-[#5A4BFF] shrink-0" />
            </button>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {courses.map((course) => {
                const stats = courseStatsMap[course.id];
                const isActive = selectedCourseId === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleCourseChange(course.id)}
                    className={`shrink-0 min-w-[200px] max-w-[280px] p-4 rounded-2xl border-2 text-left transition-all ${
                      isActive
                        ? 'border-[#5A4BFF] bg-white shadow-lg shadow-indigo-500/15'
                        : 'border-gray-200 bg-white/80 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-black text-sm leading-snug line-clamp-2 ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {course.title}
                    </p>
                    {stats ? (
                      <p className="mt-2 text-2xl font-black text-[#5A4BFF]">
                        {stats.averageScore}
                        <span className="text-sm font-bold text-gray-400">/100</span>
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-bold text-gray-400">Нет оценок</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* МОДУЛИ КУРСА */}
        {availableModules.length > 0 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-3 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => { setActiveTab('all'); setSelectedLessonRow(null); }}
                  className={`flex-1 px-5 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-between gap-3 ${
                    activeTab === 'all'
                      ? 'bg-[#0B1120] text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Весь курс</span>
                  <span className="text-xs opacity-70">{selectedStats.averageScore}/100</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModulesExpanded(v => !v)}
                  className="px-5 py-4 rounded-2xl font-black text-sm bg-indigo-50 text-[#5A4BFF] hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  Все модули ({availableModules.length})
                  <ChevronDown className={`w-4 h-4 transition-transform ${modulesExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {modulesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableModules.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setActiveTab(m.id); setSelectedLessonRow(null); setModulesExpanded(true); }}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            activeTab === m.id
                              ? 'border-[#5A4BFF] bg-indigo-50 shadow-md'
                              : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                          }`}
                          title={`Модуль ${m.orderIndex}. ${m.title}`}
                        >
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Модуль {m.orderIndex}</p>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black text-gray-900 truncate">{m.title}</p>
                            <span className="text-sm font-black text-[#5A4BFF] shrink-0">{m.averageScore}/100</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SLIDE-DOWN УРОКИ ВНУТРИ МОДУЛЯ */}
            <AnimatePresence>
              {activeModule && activeModule.progressData.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">
                      Уроки модуля «{activeModule.title}» — выберите для детального просмотра
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLessonRow(null)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                          !selectedLessonRow
                            ? 'bg-[#5A4BFF] text-white shadow-md'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        Весь модуль
                      </button>
                      {activeModule.progressData.map((row) => {
                        const isActive = selectedLessonRow?.lessonId === row.lessonId;
                        const emoji = row.score >= 70 ? '✅' : row.score >= 50 ? '🟡' : '🔴';
                        return (
                          <button
                            key={row.lessonId || row.fullName}
                            type="button"
                            onClick={() => setSelectedLessonRow(isActive ? null : row)}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 max-w-[200px] truncate ${
                              isActive
                                ? 'bg-[#5A4BFF] text-white shadow-md'
                                : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'
                            }`}
                            title={row.fullName}
                          >
                            <span>{emoji}</span>
                            <span className="truncate">{row.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={`${selectedCourseId}-${activeTab}`}
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.98 }} 
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        >
          {/* ── ИТОГ КУРСА / МОДУЛЯ / УРОКА ── */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="xl:col-span-3">
            {/* Breadcrumb когда выбран урок */}
            {selectedLessonRow && activeModule && (
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-500">
                <button type="button" onClick={() => setSelectedLessonRow(null)} className="text-[#5A4BFF] hover:underline">{activeModule.title}</button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-800">{selectedLessonRow.fullName}</span>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5">
              {/* Общий результат — главный большой прямоугольник */}
              <div className="bg-[#0F172A] rounded-[2.5rem] p-7 md:p-9 text-white relative overflow-hidden min-h-[260px] flex flex-col justify-between shadow-xl shadow-slate-900/10">
                <div className="absolute -top-16 -right-12 w-56 h-56 bg-[#00FFCC]/15 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-72 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                      <Target className="w-7 h-7 text-[#00FFCC]" />
                    </div>
                    <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
                      {selectedLessonRow ? 'Урок' : isCourseView ? 'Курс' : 'Модуль'}
                    </span>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 mb-3">Общая аналитика</p>
                  <div className="flex items-end gap-3">
                    <p className="text-7xl md:text-8xl font-black tracking-tight text-[#00FFCC] leading-none">{totalSectionScore}</p>
                    <span className="text-3xl md:text-4xl font-black text-white/30 mb-2">/{totalSectionMax}</span>
                  </div>
                  <p className="mt-4 text-sm md:text-base font-bold text-white/60">
                    Сумма трёх разделов: тесты + письменные + устные
                  </p>
                </div>
                <div className="relative z-10 mt-8">
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, totalSectionProgress)}%` }}
                      className="h-full bg-[#00FFCC] rounded-full"
                    />
                  </div>
                  <p className="text-xs font-bold text-white/40 mt-3">
                    {totalSectionProgress >= 70 ? 'Отлично держим темп' : totalSectionProgress >= 50 ? 'Есть база, надо дожать' : 'Нужно подтянуть этот раздел'}
                  </p>
                </div>
              </div>

              {/* Маленькие квадраты 2×2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-[2rem] p-5 border border-indigo-100 min-h-[122px]">
                  <CheckSquare className="w-6 h-6 text-indigo-500 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Тесты</p>
                  <p className="text-3xl font-black text-indigo-700">{testsScore}<span className="text-sm text-indigo-300">/100</span></p>
                  <p className="text-[11px] text-indigo-300 font-bold mt-1">заработано баллов</p>
                </div>
                <div className="bg-orange-50 rounded-[2rem] p-5 border border-orange-100 min-h-[122px]">
                  <PenTool className="w-6 h-6 text-orange-500 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Письменные</p>
                  <p className="text-3xl font-black text-orange-700">{writtenScore}<span className="text-sm text-orange-300">/100</span></p>
                  <p className="text-[11px] text-orange-300 font-bold mt-1">заработано баллов</p>
                </div>
                <div className="bg-teal-50 rounded-[2rem] p-5 border border-teal-100 min-h-[122px]">
                  <Mic className="w-6 h-6 text-teal-500 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-1">Устные</p>
                  <p className="text-3xl font-black text-teal-700">{oralScore}<span className="text-sm text-teal-300">/100</span></p>
                  <p className="text-[11px] text-teal-300 font-bold mt-1">заработано баллов</p>
                </div>
                <div className="bg-white rounded-[2rem] p-5 border border-gray-100 min-h-[122px] shadow-sm">
                  <Star className="w-6 h-6 text-amber-400 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Оценено</p>
                  <p className="text-3xl font-black text-gray-900">{currentTaskCount}</p>
                  <p className="text-[11px] text-gray-400 font-bold mt-1">заданий учтено</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── ТАБЛИЦА МОДУЛЕЙ / УРОКОВ (скрывается при drill-down на урок) ── */}
          {!selectedLessonRow && (
            <motion.div variants={itemVariants} initial="hidden" animate="show"
              className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 xl:col-span-3">
              <h3 className="text-xl font-black text-gray-900 mb-2">
                {isCourseView ? '📚 Баллы по модулям' : '📖 Баллы по урокам'}
              </h3>
              <p className="text-sm text-gray-400 font-medium mb-6">
                ✅ ≥70% · 🟡 50–69% · 🔴 &lt;50%
              </p>
              <ScoreTable data={(currentData?.progressData ?? []) as ScoreChartRow[]} />
            </motion.div>
          )}

          {/* ГДЕ ОШИБСЯ — показываем только если на курсе включена проверка орфографии */}
          {selectedCourse?.spell_check && currentWeakSpots.length > 0 && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="show"
              className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 xl:col-span-3"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Где стоит подтянуть</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">
                    Показываем этот блок только для курсов, где включена проверка орфографии.
                  </p>
                </div>
              </div>
              <WeakSpotsList spots={currentWeakSpots} onOpen={handleOpenWeakSpot} />
            </motion.div>
          )}

          {/* НУЖНО ПОВТОРИТЬ — модули <50% по всем курсам */}
          {weakModules.length > 0 && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="show"
              className="bg-amber-50 border-2 border-amber-200 p-8 md:p-10 rounded-[2.5rem] shadow-sm xl:col-span-3"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-amber-900">Нужно повторить</h3>
                  <p className="text-sm font-medium text-amber-700 mt-1">
                    Модули, где набрано менее 50% — вернись и подтяни результат.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {weakModules.map(({ courseTitle, courseId, module }) => (
                  <button
                    key={`${courseId}-${module.id}`}
                    type="button"
                    onClick={() => { handleCourseChange(courseId); setActiveTab(module.id); }}
                    className="w-full text-left p-4 bg-white rounded-2xl border-2 border-amber-100 hover:border-amber-300 hover:shadow-md transition-all flex items-center gap-4"
                  >
                    <div className="text-2xl font-black text-rose-500 w-14 text-center shrink-0">
                      {module.averageScore}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">{courseTitle}</p>
                      <p className="font-black text-gray-900 truncate">{module.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{module.earned} / {module.max} баллов</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ЗАКЛЮЧЕНИЕ */}
          {isCourseView && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="show"
              className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 xl:col-span-3"
            >
              <div className="w-16 h-16 bg-[#0F172A] rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <Activity className="w-8 h-8 text-[#00FFCC]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4">Рекомендации по курсу</h3>
                <div className="p-6 md:p-8 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-gray-800 font-medium text-[15px] leading-relaxed whitespace-pre-line">
                    {selectedStats.aiReport}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ВЫДВИЖНАЯ ПАНЕЛЬ КУРСОВ */}
      <AnimatePresence>
        {showCourseDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCourseDrawer(false)}
              className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Ваши курсы</h3>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">{courses.length} в записи</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCourseDrawer(false)}
                  className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {courses.map((course) => {
                  const stats = courseStatsMap[course.id];
                  const isActive = selectedCourseId === course.id;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleCourseChange(course.id)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                        isActive
                          ? 'border-[#5A4BFF] bg-indigo-50/50 shadow-md'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <p className="font-black text-gray-900 leading-snug">{course.title}</p>
                      {stats ? (
                        <div className="mt-3 flex items-end justify-between">
                          <p className="text-3xl font-black text-[#5A4BFF]">{stats.averageScore}</p>
                          <span className="text-xs font-bold text-gray-400 mb-1">/100 · {stats.modules.length} мод.</span>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-bold text-gray-400">Оценок пока нет</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailsModal && selectedStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-gray-100"
            >
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-black text-gray-900 mb-2">{selectedStats.title}</h3>
              <p className="text-sm text-gray-500 font-medium mb-6">Подробная сводка по курсу</p>
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-2xl flex justify-between items-center border border-gray-100">
                  <span className="font-bold text-gray-600">Оценено работ:</span>
                  <span className="text-xl font-black">{selectedStats.totalSubmissions}</span>
                </div>
                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 flex justify-between items-center">
                  <span className="font-bold text-indigo-900 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Тестов:</span>
                  <span className="text-lg font-black text-indigo-700">{selectedStats.counts.tests} шт.</span>
                </div>
                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50 flex justify-between items-center">
                  <span className="font-bold text-orange-900 flex items-center gap-2"><PenTool className="w-4 h-4" /> Письменных:</span>
                  <span className="text-lg font-black text-orange-700">{selectedStats.counts.written} шт.</span>
                </div>
                <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100/50 flex justify-between items-center">
                  <span className="font-bold text-teal-900 flex items-center gap-2"><Mic className="w-4 h-4" /> Устных:</span>
                  <span className="text-lg font-black text-teal-700">{selectedStats.counts.oral} шт.</span>
                </div>
                <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100/50 flex justify-between items-center">
                  <span className="font-bold text-purple-900">Модулей с оценками:</span>
                  <span className="text-lg font-black text-purple-700">{selectedStats.modules.length}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-8 py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-sm transition-all active:scale-95"
              >
                Закрыть
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  ); 
}
