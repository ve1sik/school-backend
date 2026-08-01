import { useState, useEffect, useMemo } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, Loader2, FolderOpen, ChevronRight, Search, Calendar, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cachedGet } from '../lib/api';
import { getHomeworkBlocksFromLesson, lessonHasHomework } from '../utils/lessonHomework';
import { parseSafeDate, parseSafeDateMs } from '../lib/parseDate';
import RonWork from './RonWork';

type TabType = 'TODO' | 'OVERDUE' | 'REVISION' | 'REVIEW' | 'GRADED' | 'RON';

const getCoursePillTheme = (name: string, active: boolean) => {
  const hay = name.toLowerCase();
  const isHistory = /истор/.test(hay);
  if (active) {
    if (isHistory) return 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm';
    return 'bg-[#6C63FF] text-white border-[#6C63FF] shadow-sm';
  }
  if (isHistory) return 'bg-white text-[#EF4444] border-[#EF4444] hover:bg-red-50';
  return 'bg-white text-[#6C63FF] border-[#6C63FF]/40 hover:border-[#6C63FF] hover:bg-indigo-50/40';
};

const STATUS_FILTERS: {
  key: TabType;
  label: string;
  dot: string;
  active: string;
}[] = [
  { key: 'TODO', label: 'К выполнению', dot: 'bg-[#1A1D26]', active: 'bg-[#1A1D26] text-white border-[#1A1D26]' },
  { key: 'OVERDUE', label: 'Просрочено', dot: 'bg-rose-500', active: 'bg-rose-500 text-white border-rose-500' },
  { key: 'REVISION', label: 'На доработку', dot: 'bg-amber-400', active: 'bg-amber-400 text-white border-amber-400' },
  { key: 'REVIEW', label: 'На проверке', dot: 'bg-sky-500', active: 'bg-sky-500 text-white border-sky-500' },
  { key: 'GRADED', label: 'Оценено', dot: 'bg-emerald-500', active: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'RON', label: 'Работа над ошибками', dot: 'bg-[#A78BFA]', active: 'bg-[#8B5CF6] text-white border-[#8B5CF6]' },
];

export default function Homework() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const initialTab = (searchParams.get('tab')?.toUpperCase() || 'TODO') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(
    ['TODO', 'OVERDUE', 'REVISION', 'REVIEW', 'GRADED', 'RON'].includes(initialTab) ? initialTab : 'TODO',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');

  useEffect(() => {
    const fetchRealHomeworks = async () => {
      try {
        const [coursesData, subsData, schedData] = await Promise.all([
          cachedGet('/courses').catch(() => []),
          cachedGet('/submissions/my/summary').catch(() => []),
          cachedGet('/schedule').catch(() => []),
        ]);
        const coursesRes = { data: Array.isArray(coursesData) ? coursesData : [] };
        const subsRes = { data: Array.isArray(subsData) ? subsData : [] };
        const schedRes = { data: Array.isArray(schedData) ? schedData : [] };

        const deadlineEvents: any[] = schedRes.data.filter((e: any) => e.type === 'DEADLINE');
        const findDeadline = (title: string): string | null => {
          const match = deadlineEvents.find(d =>
            d.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(d.title.toLowerCase())
          );
          return match ? match.date : null;
        };

        const mySubs = subsRes.data;
        const extractedHomeworks: any[] = [];

        coursesRes.data.forEach((course: any) => {
          course.themes?.forEach((theme: any) => {
            theme.lessons?.forEach((lesson: any) => {
              let isHw = lessonHasHomework(lesson);
              let hwMaxScore = 0;

              const hwBlocks = getHomeworkBlocksFromLesson(lesson);
              if (hwBlocks.length > 0) {
                isHw = true;
                hwMaxScore = hwBlocks.reduce((acc, b) => acc + (Number(b.maxScore) || 10), 0);
              }

              if (isHw) {
                const lessonSubs = mySubs.filter(
                  (s: any) => (s.lesson_id || s.lessonId) === lesson.id,
                );
                const hwBlockIds = new Set(hwBlocks.map((b: any) => b.id).filter(Boolean));
                const relevantSubs = hwBlockIds.size
                  ? lessonSubs.filter((s: any) => hwBlockIds.has(s.block_id || s.blockId))
                  : lessonSubs;

                const hasPending = relevantSubs.some((s: any) => s.status === 'PENDING' || s.status === 'REVIEW');
                const hasRevision = relevantSubs.some((s: any) => s.status === 'REVISION');
                const gradedSubs = relevantSubs.filter((s: any) => s.status === 'GRADED');
                const allBlocksGraded =
                  hwBlockIds.size > 0 &&
                  [...hwBlockIds].every((id) =>
                    gradedSubs.some((s: any) => (s.block_id || s.blockId) === id),
                  );

                const submission =
                  relevantSubs.find((s: any) => s.status === 'PENDING' || s.status === 'REVIEW') ||
                  relevantSubs.find((s: any) => s.status === 'REVISION') ||
                  (allBlocksGraded ? gradedSubs[0] : null) ||
                  relevantSubs[0];

                let status = 'TODO';
                let score = null;
                let maxScore = hwMaxScore || lesson.max_score || 100;

                const deadline = findDeadline(lesson.title);

                let comment: string | null = null;
                if (hasPending) {
                  status = 'REVIEW';
                  score = submission?.score ?? null;
                  maxScore = submission?.max_score || maxScore;
                  comment = submission?.comment || null;
                } else if (hasRevision) {
                  status = 'REVISION';
                  score = submission?.score ?? null;
                  maxScore = submission?.max_score || maxScore;
                  comment = submission?.comment || null;
                } else if (allBlocksGraded || (hwBlockIds.size === 0 && submission?.status === 'GRADED')) {
                  status = 'GRADED';
                  score = gradedSubs.reduce((acc: number, s: any) => acc + (Number(s.score) || 0), 0) || submission?.score;
                  maxScore = gradedSubs.reduce((acc: number, s: any) => acc + (Number(s.max_score) || 0), 0) || maxScore;
                  comment = submission?.comment || null;
                } else if (deadline && parseSafeDateMs(deadline) < Date.now()) {
                  status = 'OVERDUE';
                }

                extractedHomeworks.push({
                  id: lesson.id,
                  title: lesson.title,
                  courseName: course.title,
                  themeName: theme.title,
                  status,
                  score,
                  maxScore,
                  deadline,
                  comment,
                });
              }
            });
          });
        });

        const lessonIdsInList = new Set(extractedHomeworks.map((h) => h.id));
        mySubs
          .filter((s: any) => s.status === 'REVISION')
          .forEach((submission: any) => {
            const lessonId = submission.lesson_id || submission.lessonId;
            if (!lessonId || lessonIdsInList.has(lessonId)) return;

            for (const course of coursesRes.data) {
              let found = false;
              for (const theme of course.themes || []) {
                const lesson = theme.lessons?.find((l: any) => l.id === lessonId);
                if (!lesson) continue;

                extractedHomeworks.push({
                  id: lesson.id,
                  title: lesson.title,
                  courseName: course.title,
                  themeName: theme.title,
                  status: 'REVISION',
                  score: submission.score,
                  maxScore: submission.max_score || lesson.max_score || 100,
                  deadline: findDeadline(lesson.title),
                  comment: submission.comment || null,
                });
                lessonIdsInList.add(lessonId);
                found = true;
                break;
              }
              if (found) break;
            }
          });

        setHomeworks(extractedHomeworks);
      } catch (error) {
        console.error('Ошибка загрузки ДЗ:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealHomeworks();
  }, []);

  const courseNames = useMemo(
    () => [...new Set(homeworks.map((h) => h.courseName))].sort(),
    [homeworks],
  );

  useEffect(() => {
    if (!courseNames.length) return;
    if (!selectedCourseFilter || !courseNames.includes(selectedCourseFilter)) {
      setSelectedCourseFilter(courseNames[0]);
    }
  }, [courseNames, selectedCourseFilter]);

  const homeworksForCourse =
    !selectedCourseFilter
      ? homeworks
      : homeworks.filter((h) => h.courseName === selectedCourseFilter);

  const filteredHomeworks = homeworksForCourse.filter(hw => {
    const matchesTab = hw.status === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = hw.title.toLowerCase().includes(searchLower) ||
                          hw.courseName.toLowerCase().includes(searchLower) ||
                          hw.themeName.toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const counts = {
    TODO: homeworksForCourse.filter(h => h.status === 'TODO').length,
    OVERDUE: homeworksForCourse.filter(h => h.status === 'OVERDUE').length,
    REVISION: homeworksForCourse.filter(h => h.status === 'REVISION').length,
    REVIEW: homeworksForCourse.filter(h => h.status === 'REVIEW').length,
    GRADED: homeworksForCourse.filter(h => h.status === 'GRADED').length,
  };

  const groupedHomeworks = filteredHomeworks.reduce((acc, hw) => {
    if (!acc[hw.courseName]) acc[hw.courseName] = {};
    if (!acc[hw.courseName][hw.themeName]) acc[hw.courseName][hw.themeName] = [];
    acc[hw.courseName][hw.themeName].push(hw);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } } };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-10 pt-2 px-2 md:px-4">
      <div>
        <h1 className="text-[28px] md:text-[32px] font-black tracking-tight text-gray-900 leading-none mb-2">
          Домашнее задание
        </h1>
        <p className="text-gray-500 font-medium text-sm md:text-base">
          Отслеживайте свои домашние задания и оценки кураторов
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {courseNames.length === 0 ? (
            <span className="text-sm font-medium text-gray-400">Пока нет курсов с заданиями</span>
          ) : (
            courseNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCourseFilter(name)}
                className={`px-4 py-2.5 rounded-full border-2 text-[11px] font-black uppercase tracking-wide transition-all ${getCoursePillTheme(name, selectedCourseFilter === name)}`}
              >
                {name}
              </button>
            ))
          )}
        </div>

        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="поиск заданий"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2.5 outline-none focus:border-[#6C63FF] transition-all text-sm font-medium text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ key, label, dot, active }) => {
          const count = key === 'RON' ? null : counts[key as keyof typeof counts];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key);
                setSearchParams(key === 'RON' ? { tab: 'ron' } : {});
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-bold transition-all whitespace-nowrap ${
                isActive
                  ? active
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
              }`}
            >
              {!isActive && <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />}
              {count !== null && <span className={isActive ? 'opacity-90' : 'text-gray-900'}>{count}</span>}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'RON' ? (
        <RonWork embedded />
      ) : (
        <>
          {Object.entries(groupedHomeworks).map(([courseName, themes]) => (
            <motion.div key={courseName} variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
              {Object.entries(themes).map(([themeName, hws]) => (
                <div key={themeName}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                    <h3 className="text-base md:text-lg font-black text-gray-900">{themeName}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {hws.map((hw) => {
                        let statusText = '';
                        let badgeClass = '';
                        let Icon = AlertCircle;
                        let iconClass = 'text-gray-400';
                        let buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                        let buttonClass = 'bg-[#1A1D26] hover:bg-black text-white';

                        if (hw.status === 'TODO') {
                          statusText = 'К выполнению';
                          badgeClass = 'border border-[#F4A261]/60 text-[#E07A3D] bg-[#FFF7F0]';
                          Icon = Info;
                          iconClass = 'text-gray-400';
                          buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                          buttonClass = 'bg-[#1A1D26] hover:bg-black text-white';
                        } else if (hw.status === 'OVERDUE') {
                          statusText = 'Просрочено';
                          badgeClass = 'border border-rose-200 text-rose-600 bg-rose-50';
                          Icon = XCircle;
                          iconClass = 'text-rose-400';
                          buttonText = 'СДАТЬ СЕЙЧАС';
                          buttonClass = 'bg-rose-500 hover:bg-rose-600 text-white';
                        } else if (hw.status === 'REVISION') {
                          statusText = 'На доработку';
                          badgeClass = 'border border-amber-200 text-amber-700 bg-amber-50';
                          Icon = AlertCircle;
                          iconClass = 'text-amber-500';
                          buttonText = 'ДОРАБОТАТЬ';
                          buttonClass = 'bg-amber-500 hover:bg-amber-600 text-white';
                        } else if (hw.status === 'REVIEW') {
                          statusText = 'На проверке';
                          badgeClass = 'border border-sky-200 text-sky-700 bg-sky-50';
                          Icon = Clock;
                          iconClass = 'text-sky-500';
                          buttonText = 'СМОТРЕТЬ ДЕТАЛИ';
                          buttonClass = 'bg-gray-100 hover:bg-gray-200 text-gray-600';
                        } else if (hw.status === 'GRADED') {
                          statusText = `Оценено ${hw.score ?? '—'}/${hw.maxScore ?? '—'}`;
                          badgeClass = 'border border-emerald-200 text-emerald-700 bg-emerald-50';
                          Icon = CheckCircle2;
                          iconClass = 'text-emerald-500';
                          buttonText = 'ПОСМОТРЕТЬ ОЦЕНКУ';
                          buttonClass = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100';
                        }

                        const deadlineDate = hw.deadline ? parseSafeDate(hw.deadline) : null;
                        const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000) : null;

                        return (
                          <motion.div
                            key={hw.id}
                            variants={itemVariants}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/homework/${hw.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/homework/${hw.id}`);
                              }
                            }}
                            className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col min-h-[220px] hover:shadow-md transition-shadow cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-5">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${badgeClass}`}>
                                {statusText}
                              </span>
                              <Icon className={`w-5 h-5 ${iconClass}`} />
                            </div>

                            <h3 className="text-lg font-black text-gray-900 leading-snug line-clamp-3 mb-auto">
                              {hw.title}
                            </h3>

                            {deadlineDate && hw.status !== 'GRADED' && (
                              <div className={`flex items-center gap-1.5 mt-3 text-[11px] font-bold ${daysLeft !== null && daysLeft <= 1 ? 'text-rose-500' : 'text-gray-400'}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {hw.status === 'OVERDUE'
                                  ? `Просрочено: ${deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
                                  : `До ${deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}
                              </div>
                            )}

                            <div className={`mt-5 w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 pointer-events-none ${buttonClass}`}>
                              {buttonText}
                              {(hw.status === 'TODO' || hw.status === 'OVERDUE' || hw.status === 'REVISION') && (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </motion.div>
          ))}

          {filteredHomeworks.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-200 mt-4"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Пусто'}
              </h2>
              <p className="text-gray-500 font-medium text-sm max-w-md">
                {searchQuery ? 'Попробуйте изменить запрос поиска.' : 'В этом статусе пока нет заданий.'}
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
