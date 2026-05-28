import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Loader2, PenTool, AlertCircle, CheckSquare, Mic,
  Target, X, BookOpen, ChevronRight, TrendingDown, Layers, List, BarChart2,
  PanelRightOpen, GraduationCap, ChevronDown, ChevronUp, Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const COURSE_INLINE_LIMIT = 3;
const PASS_SCORE = 70;

const API_URL = 'https://prepodmgy.ru/api';

const safePercent = (earned: number, max: number) =>
  max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;

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
};

type GlobalOverview = {
  averageScore: number;
  coursesWithStats: number;
  totalCourses: number;
  totalModules: number;
  totalSubmissions: number;
  weakSpotsCount: number;
  totalEarned: number;
  totalMax: number;
  breakdown: { tests: number; written: number; oral: number };
};

function buildGlobalOverview(
  map: Record<string, CourseStats>,
  courses: any[],
): GlobalOverview | null {
  const list = Object.values(map);
  if (list.length === 0) return null;

  let weightedSum = 0;
  let moduleCount = 0;
  let totalSubs = 0;
  let weakCount = 0;
  let totalEarned = 0;
  let totalMax = 0;
  let bTests = 0;
  let bWritten = 0;
  let bOral = 0;

  list.forEach((s) => {
    const n = s.modules.length || 1;
    weightedSum += s.averageScore * n;
    moduleCount += s.modules.length;
    totalSubs += s.totalSubmissions;
    weakCount += s.weakSpots.length;
    totalEarned += s.totalEarned;
    totalMax += s.totalMax;
    bTests += s.breakdown.tests * n;
    bWritten += s.breakdown.written * n;
    bOral += s.breakdown.oral * n;
  });

  const denom = moduleCount || list.length;

  return {
    averageScore: totalMax > 0 ? safePercent(totalEarned, totalMax) : Math.round(weightedSum / denom),
    coursesWithStats: list.length,
    totalCourses: courses.length,
    totalModules: moduleCount,
    totalSubmissions: totalSubs,
    weakSpotsCount: weakCount,
    totalEarned,
    totalMax,
    breakdown: {
      tests: Math.round(bTests / denom),
      written: Math.round(bWritten / denom),
      oral: Math.round(bOral / denom),
    },
  };
}

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
  modules: ModuleStats[];
  progressData: ScoreChartRow[];
  weakSpots: WeakSpot[];
  totalSubmissions: number;
  counts: { tests: number; written: number; oral: number };
  aiReport: string;
};

function buildCourseStats(course: any, mySubs: any[]): CourseStats | null {
        let totalThemesCount = 0;
        let globalTotalScore = 0;
        let g_tests = { e: 0, m: 0, count: 0 };
        let g_written = { e: 0, m: 0, count: 0 };
        let g_oral = { e: 0, m: 0, count: 0 }; 

  const modulesList: ModuleStats[] = [];
  const globalProgressData: ScoreChartRow[] = [];
  const courseWeakSpots: WeakSpot[] = [];
  let courseEarned = 0;
  let courseMax = 0;

  const courseSubs = mySubs.filter((s: any) => {
    const lessonId = s.lesson_id || s.lessonId;
    return course.themes?.some((t: any) =>
      t.lessons?.some((l: any) => l.id === lessonId),
    );
  });

  course.themes?.forEach((theme: any, themeIdx: number) => {
            let t_tests = { e: 0, m: 0 };
            let t_written = { e: 0, m: 0 };
    let t_oral = { e: 0, m: 0 };

            let hasSubmissionsInTheme = false;
    let themeEarned = 0;
    let themeMax = 0;
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

              let l_earned = 0;
              let l_max = 0;
      let l_taskCount = 0;
              let hasSubmissionsInLesson = false;

              blocks.forEach((block: any) => {
        const sub = mySubs.find(
          (s: any) => s.blockId === block.id || s.block_id === block.id,
        );
        if (!sub || sub.status !== 'GRADED') return;

                  hasSubmissionsInTheme = true;
                  hasSubmissionsInLesson = true;
                  
                  const maxScore = Number(block.maxScore) || Number(sub.max_score) || 10;
                  const earnedScore = Number(sub.score) || 0;
        const percent = safePercent(earnedScore, maxScore);

                  l_earned += earnedScore;
                  l_max += maxScore;
        l_taskCount += 1;
        themeEarned += earnedScore;
        themeMax += maxScore;
        courseEarned += earnedScore;
        courseMax += maxScore;

        if (block.type === 'test' || block.type === 'test_short' || block.type === 'matching') {
          t_tests.e += earnedScore;
          t_tests.m += maxScore;
          g_tests.count++;
                  } else if (block.type === 'written' || block.type === 'homework' || block.isHomework) {
          t_written.e += earnedScore;
          t_written.m += maxScore;
          g_written.count++;
                  } else if (block.type === 'oral') {
          t_oral.e += earnedScore;
          t_oral.m += maxScore;
          g_oral.count++;
        }

        if (percent < 70) {
          const spot: WeakSpot = {
            id: `${block.id}-${sub.id}`,
            blockTitle: stripHtml(block.title || block.question || '') || blockTypeLabel(block.type, block.isHomework),
            lessonTitle: lesson.title,
            themeTitle: theme.title,
            themeId: theme.id,
            courseId: course.id,
            lessonId: lesson.id,
            isHomework: !!lesson.is_homework || !!block.isHomework,
            percent,
            score: earnedScore,
            maxScore,
            type: block.type,
          };
          themeWeakSpots.push(spot);
          courseWeakSpots.push(spot);
        }
      });

              if (hasSubmissionsInLesson) {
                themeLessonsProgress.push({
          name: lesson.title.length > 22 ? `${lesson.title.slice(0, 22)}…` : lesson.title,
          fullName: lesson.title,
          score: safePercent(l_earned, l_max),
          earned: l_earned,
          max: l_max,
          taskCount: l_taskCount,
          lessonId: lesson.id,
                });
              }
            });

            if (hasSubmissionsInTheme) {
              const pTests = t_tests.m > 0 ? (t_tests.e / t_tests.m) * 100 : 0;
              const pWritten = t_written.m > 0 ? (t_written.e / t_written.m) * 100 : 0;
      const pOral = t_oral.m > 0 ? (t_oral.e / t_oral.m) * 100 : 0;
              const themeTotalScore = Math.round((pTests + pWritten + pOral) / 3);

              totalThemesCount++;
              globalTotalScore += themeTotalScore;

      g_tests.e += t_tests.e;
      g_tests.m += t_tests.m;
      g_written.e += t_written.e;
      g_written.m += t_written.m;
      g_oral.e += t_oral.e;
      g_oral.m += t_oral.m;

      themeWeakSpots.sort((a, b) => a.percent - b.percent);

      const orderIndex = theme.order_index ?? themeIdx + 1;

              modulesList.push({
                id: theme.id,
                title: theme.title,
        orderIndex,
                averageScore: themeTotalScore,
        earned: themeEarned,
        max: themeMax,
                breakdown: {
                  tests: Math.round(pTests),
                  written: Math.round(pWritten),
          oral: Math.round(pOral),
                },
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
        taskCount: themeLessonsProgress.reduce((s, l) => s + l.taskCount, 0),
              });
            }
          });

  if (totalThemesCount === 0) return null;

  const globalAvg = Math.round(globalTotalScore / totalThemesCount);
        const globalPTests = g_tests.m > 0 ? Math.round((g_tests.e / g_tests.m) * 100) : 0;
        const globalPWritten = g_written.m > 0 ? Math.round((g_written.e / g_written.m) * 100) : 0;
        const globalPOral = g_oral.m > 0 ? Math.round((g_oral.e / g_oral.m) * 100) : 0;
  const coursePercent = safePercent(courseEarned, courseMax);

  courseWeakSpots.sort((a, b) => a.percent - b.percent);

  const weakest = [
    { label: 'тесты', value: globalPTests },
    { label: 'развёрнутые ответы', value: globalPWritten },
    { label: 'устные опросы', value: globalPOral },
  ].sort((a, b) => a.value - b.value)[0];

  const aiReport =
    `По курсу «${course.title}» набрано ${courseEarned} из ${courseMax} возможных баллов (${coursePercent}%).\n\n` +
    `Слабее всего: ${weakest.label} (${weakest.value}/100). ` +
    `Смотри блок «Где стоит подтянуть» — там уроки с ошибками.`;

  return {
    id: course.id,
    title: course.title,
    averageScore: coursePercent || globalAvg,
    totalEarned: courseEarned,
    totalMax: courseMax,
    totalSubmissions: courseSubs.length,
          counts: { tests: g_tests.count, written: g_written.count, oral: g_oral.count },
    breakdown: { tests: globalPTests, written: globalPWritten, oral: globalPOral },
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
  const [globalOverviewOpen, setGlobalOverviewOpen] = useState(false);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const [coursesRes, subsRes, accessRes] = await Promise.all([
          axios.get(`${API_URL}/courses`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/submissions/my`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/groups/my-theme-access`, { headers }).catch(() => ({ data: [] })),
        ]);

        const accessArr = Array.isArray(accessRes.data) ? accessRes.data : [];
        const now = Date.now();
        const deadlines = accessArr
          .filter((item: any) => item.deadline)
          .map((item: any) => ({
            ...item,
            daysLeft: Math.ceil((new Date(item.deadline).getTime() - now) / 86400000),
          }))
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
          .slice(0, 5);
        setUpcomingDeadlines(deadlines);

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
  const currentData =
    activeTab === 'all'
      ? selectedStats
      : availableModules.find((m) => m.id === activeTab) ?? selectedStats;

  const currentWeakSpots =
    activeTab === 'all'
      ? selectedStats?.weakSpots ?? []
      : availableModules.find((m) => m.id === activeTab)?.weakSpots ?? [];

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
    setShowCourseDrawer(false);
  };

  const coursesWithAnalytics = useMemo(
    () => courses.filter((c) => courseStatsMap[c.id]),
    [courses, courseStatsMap],
  );

  const globalOverview = useMemo(
    () => buildGlobalOverview(courseStatsMap, courses),
    [courseStatsMap, courses],
  );

  const isCourseView = activeTab === 'all';
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const useCourseDrawer = courses.length > COURSE_INLINE_LIMIT;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

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
        {globalOverview && (
          <div className="mb-8 p-6 rounded-[2rem] bg-white border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Общая статистика</p>
            <p className="text-5xl font-black text-[#5A4BFF]">{globalOverview.averageScore}<span className="text-xl text-gray-400">/100</span></p>
            <p className="text-sm text-gray-500 mt-2">{globalOverview.coursesWithStats} курсов с оценками</p>
          </div>
        )}
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

        {/* БЛИЖАЙШИЕ ДЕДЛАЙНЫ */}
        {upcomingDeadlines.length > 0 && (
          <div className="rounded-[2rem] bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 md:p-6 border-b border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Дедлайны</p>
              <p className="font-black text-lg text-gray-900">Ближайшие сроки сдачи</p>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingDeadlines.map((item: any) => {
                const dlDate = new Date(item.deadline);
                const overdue = item.daysLeft < 0;
                const urgent = item.daysLeft >= 0 && item.daysLeft <= 3;
                return (
                  <div key={`${item.group_id}-${item.theme_id}`} className="px-5 md:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 truncate">{item.theme_title || 'Модуль'}</p>
                      <p className="text-xs font-medium text-gray-400 truncate">{item.group_title || ''}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{dlDate.toLocaleDateString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-black whitespace-nowrap ${
                      overdue ? 'bg-red-100 text-red-600' : urgent ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {overdue ? '⚠ Просрочено' : item.daysLeft === 0 ? '🔥 Сегодня!' : `${item.daysLeft} дн.`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ОБЩАЯ СТАТИСТИКА — сворачиваемая */}
        {globalOverview && (
          <div className="rounded-[2rem] border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setGlobalOverviewOpen((v) => !v)}
              className="w-full p-5 md:p-6 flex items-center justify-between gap-4 text-left hover:bg-gray-50/80 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#0F172A] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6 text-[#00FFCC]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Общая статистика</p>
                  <p className="font-black text-lg text-gray-900 truncate">По всем вашим курсам</p>
                  {!globalOverviewOpen && (
                    <p className="text-sm font-bold text-[#5A4BFF] mt-1">
                      {globalOverview.totalEarned} / {globalOverview.totalMax} баллов · {globalOverview.averageScore}%
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!globalOverviewOpen && (
                  <span className="hidden sm:inline text-xs font-bold text-gray-400">{globalOverview.coursesWithStats} курсов</span>
                )}
                {globalOverviewOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {globalOverviewOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-100"
                >
                  <div className="p-5 md:p-6 pt-4 bg-gradient-to-b from-indigo-50/40 to-white space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="bg-[#0F172A] text-white p-4 rounded-2xl shadow-lg col-span-2 lg:col-span-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Всего баллов</p>
                        <p className="text-3xl font-black text-[#00FFCC]">{globalOverview.totalEarned}<span className="text-base text-gray-500">/{globalOverview.totalMax}</span></p>
                        <p className="text-xs text-gray-400 mt-1">{globalOverview.averageScore}% в среднем</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Курсы</p>
                        <p className="text-2xl font-black">{globalOverview.coursesWithStats}<span className="text-sm text-gray-400">/{globalOverview.totalCourses}</span></p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Модулей</p>
                        <p className="text-2xl font-black text-[#5A4BFF]">{globalOverview.totalModules}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Работ</p>
                        <p className="text-2xl font-black">{globalOverview.totalSubmissions}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Слабых мест</p>
                        <p className="text-2xl font-black text-rose-500">{globalOverview.weakSpotsCount}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-indigo-50 px-3 py-3 rounded-xl border border-indigo-100 text-center">
                        <p className="text-[9px] font-black uppercase text-indigo-400">Тесты (авто)</p>
                        <p className="font-black text-indigo-700 text-lg">{globalOverview.breakdown.tests}%</p>
                      </div>
                      <div className="bg-orange-50 px-3 py-3 rounded-xl border border-orange-100 text-center">
                        <p className="text-[9px] font-black uppercase text-orange-400">Письменные</p>
                        <p className="font-black text-orange-700 text-lg">{globalOverview.breakdown.written}%</p>
                      </div>
                      <div className="bg-teal-50 px-3 py-3 rounded-xl border border-teal-100 text-center">
                        <p className="text-[9px] font-black uppercase text-teal-400">Устные</p>
                        <p className="font-black text-teal-700 text-lg">{globalOverview.breakdown.oral}%</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

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
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2 custom-scrollbar">
            <button 
              type="button"
              onClick={() => setActiveTab('all')} 
              className={`px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-[#0B1120] text-white shadow-lg'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" /> Весь курс
            </button>
            {availableModules.map((m) => (
              <button 
                key={m.id} 
                type="button"
                onClick={() => setActiveTab(m.id)} 
                className={`px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all max-w-[240px] truncate ${
                  activeTab === m.id
                    ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                }`}
                title={`Модуль ${m.orderIndex}. ${m.title}`}
              >
                Модуль {m.orderIndex}. {m.title}
              </button>
            ))}
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
          {/* ── ИТОГ КУРСА / МОДУЛЯ ── */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="xl:col-span-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Средний балл */}
              <div className="bg-[#0F172A] rounded-[2rem] p-6 text-white relative overflow-hidden col-span-2 sm:col-span-1">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#00FFCC]/15 rounded-full blur-2xl" />
                <Target className="w-6 h-6 text-[#00FFCC] mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Средний балл</p>
                <p className="text-4xl font-black text-[#00FFCC]">{currentData?.averageScore ?? 0}<span className="text-base text-gray-500">%</span></p>
                <p className="text-xs text-gray-500 mt-1">{(currentData?.averageScore ?? 0) >= 70 ? '✅ Отлично' : (currentData?.averageScore ?? 0) >= 50 ? '🟡 Средне' : '🔴 Нужно подтянуть'}</p>
            </div>

              {/* Баллы */}
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                <Star className="w-6 h-6 text-indigo-400 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Набрано</p>
                <p className="text-3xl font-black text-gray-900">
                  {isCourseView ? selectedStats?.totalEarned : (currentData as ModuleStats)?.earned ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  из {isCourseView ? selectedStats?.totalMax : (currentData as ModuleStats)?.max ?? 0} балл.
              </p>
            </div>

              {/* Тесты */}
              <div className="bg-indigo-50 rounded-[2rem] p-6 border border-indigo-100">
                <CheckSquare className="w-6 h-6 text-indigo-500 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Тесты</p>
                <p className="text-3xl font-black text-indigo-700">{currentData?.breakdown?.tests ?? 0}<span className="text-sm font-bold text-indigo-300">%</span></p>
                <div className="mt-2 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${currentData?.breakdown?.tests ?? 0}%` }} />
                </div>
              </div>

              {/* Письменные */}
              <div className="bg-orange-50 rounded-[2rem] p-6 border border-orange-100">
                <PenTool className="w-6 h-6 text-orange-500 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Письменные</p>
                <p className="text-3xl font-black text-orange-700">{currentData?.breakdown?.written ?? 0}<span className="text-sm font-bold text-orange-300">%</span></p>
                <div className="mt-2 h-1.5 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${currentData?.breakdown?.written ?? 0}%` }} />
                </div>
              </div>

              {/* Устные */}
              <div className="bg-teal-50 rounded-[2rem] p-6 border border-teal-100">
                <Mic className="w-6 h-6 text-teal-500 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-1">Устные</p>
                <p className="text-3xl font-black text-teal-700">{currentData?.breakdown?.oral ?? 0}<span className="text-sm font-bold text-teal-300">%</span></p>
                <div className="mt-2 h-1.5 bg-teal-200 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${currentData?.breakdown?.oral ?? 0}%` }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── ТАБЛИЦА МОДУЛЕЙ / УРОКОВ ── */}
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

          {/* ГДЕ ОШИБСЯ */}
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
                  Задания с результатом ниже 70%. Нажми на карточку — откроется урок, чтобы исправить ошибки.
                </p>
              </div>
            </div>
            <WeakSpotsList spots={currentWeakSpots} onOpen={handleOpenWeakSpot} />
          </motion.div>

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
