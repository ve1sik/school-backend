import { useState, useEffect, useMemo } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, Loader2, FolderOpen, ChevronRight, Search, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cachedGet } from '../lib/api';
import { getHomeworkBlocksFromLesson, lessonHasHomework } from '../utils/lessonHomework';
import { parseSafeDateMs } from '../lib/parseDate';
import { design } from '../lib/designTokens';
import RonWork from './RonWork';

type TabType = 'TODO' | 'OVERDUE' | 'REVISION' | 'REVIEW' | 'GRADED' | 'RON';

/** Figma pdf-page-02 — course subject pills */
const getCoursePillTheme = (name: string, active: boolean) => {
  const isHistory = /истор/.test(name.toLowerCase());
  if (active) {
    if (isHistory) return 'bg-[#EF6C35] text-white border-[#EF6C35] shadow-sm';
    return 'bg-[#6C63FF] text-white border-[#6C63FF] shadow-sm';
  }
  if (isHistory) return 'bg-white text-[#EF6C35] border-[#EF6C35] hover:bg-orange-50';
  return 'bg-white text-[#6C63FF] border-[#6C63FF]/35 hover:border-[#6C63FF]';
};

/** Figma status chips: colored count box + label; active = filled ink */
const STATUS_FILTERS: {
  key: TabType;
  label: string;
  countClass: string;
  activeClass: string;
}[] = [
  {
    key: 'TODO',
    label: 'К выполнению',
    countClass: 'bg-[#1A1D26] text-white',
    activeClass: 'bg-[#1A1D26] text-white border-[#1A1D26]',
  },
  {
    key: 'OVERDUE',
    label: 'Просрочено',
    countClass: 'bg-[#EF4444] text-white',
    activeClass: 'bg-[#EF4444] text-white border-[#EF4444]',
  },
  {
    key: 'REVISION',
    label: 'На доработку',
    countClass: 'bg-[#FBBF24] text-[#1A1D26]',
    activeClass: 'bg-[#FBBF24] text-[#1A1D26] border-[#FBBF24]',
  },
  {
    key: 'REVIEW',
    label: 'На проверке',
    countClass: 'bg-[#1E3A8A] text-white',
    activeClass: 'bg-[#1E3A8A] text-white border-[#1E3A8A]',
  },
  {
    key: 'GRADED',
    label: 'Оценено',
    countClass: 'bg-[#10B981] text-white',
    activeClass: 'bg-[#10B981] text-white border-[#10B981]',
  },
  {
    key: 'RON',
    label: 'Работа над ошибками',
    countClass: 'bg-[#C4B5FD] text-white',
    activeClass: 'bg-[#A78BFA] text-white border-[#A78BFA]',
  },
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
          const match = deadlineEvents.find(
            (d) =>
              d.title.toLowerCase().includes(title.toLowerCase()) ||
              title.toLowerCase().includes(d.title.toLowerCase()),
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
                  score =
                    gradedSubs.reduce((acc: number, s: any) => acc + (Number(s.score) || 0), 0) ||
                    submission?.score;
                  maxScore =
                    gradedSubs.reduce((acc: number, s: any) => acc + (Number(s.max_score) || 0), 0) ||
                    maxScore;
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

  const homeworksForCourse = !selectedCourseFilter
    ? homeworks
    : homeworks.filter((h) => h.courseName === selectedCourseFilter);

  const filteredHomeworks = homeworksForCourse.filter((hw) => {
    const matchesTab = hw.status === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      hw.title.toLowerCase().includes(searchLower) ||
      hw.courseName.toLowerCase().includes(searchLower) ||
      hw.themeName.toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const counts = {
    TODO: homeworksForCourse.filter((h) => h.status === 'TODO').length,
    OVERDUE: homeworksForCourse.filter((h) => h.status === 'OVERDUE').length,
    REVISION: homeworksForCourse.filter((h) => h.status === 'REVISION').length,
    REVIEW: homeworksForCourse.filter((h) => h.status === 'REVIEW').length,
    GRADED: homeworksForCourse.filter((h) => h.status === 'GRADED').length,
  };

  const groupedHomeworks = filteredHomeworks.reduce(
    (acc, hw) => {
      if (!acc[hw.courseName]) acc[hw.courseName] = {};
      if (!acc[hw.courseName][hw.themeName]) acc[hw.courseName][hw.themeName] = [];
      acc[hw.courseName][hw.themeName].push(hw);
      return acc;
    },
    {} as Record<string, Record<string, any[]>>,
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
  };

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col gap-3.5 md:gap-4 px-0 overflow-y-auto md:overflow-hidden pb-4 md:pb-0 font-[Golos_Text,system-ui,sans-serif]"
      style={{ color: design.textPrimary }}
    >
      {/* Course pills + search — Figma: flush to content edge, search right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap gap-2">
          {courseNames.length === 0 ? (
            <span className="text-sm font-medium text-gray-400">Пока нет курсов с заданиями</span>
          ) : (
            courseNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCourseFilter(name)}
                className={`px-5 py-2.5 rounded-full border text-[12px] font-bold uppercase tracking-[0.03em] transition-all ${getCoursePillTheme(
                  name,
                  selectedCourseFilter === name,
                )}`}
              >
                {name}
              </button>
            ))
          )}
        </div>

        <div className="relative w-full lg:w-[300px] shrink-0">
          <Search className="w-[18px] h-[18px] text-[#B0B5C3] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="поиск заданий"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E6E8EF] rounded-full pl-11 pr-4 py-[11px] outline-none focus:border-[#6C63FF] transition-all text-[14px] font-medium text-[#374151] placeholder:text-[#B0B5C3] placeholder:normal-case placeholder:tracking-normal placeholder:font-medium"
          />
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {STATUS_FILTERS.map(({ key, label, countClass, activeClass }) => {
          const count = key === 'RON' ? 0 : counts[key as keyof typeof counts];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key);
                setSearchParams(key === 'RON' ? { tab: 'ron' } : {});
              }}
              className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border text-[12px] font-bold transition-all whitespace-nowrap ${
                isActive
                  ? activeClass
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              <span
                className={`min-w-[22px] h-[22px] px-1 rounded-[6px] text-[11px] font-black flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : countClass
                }`}
              >
                {key === 'RON' ? '·' : count}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 custom-scrollbar">
        {activeTab === 'RON' ? (
          <RonWork embedded />
        ) : (
          <>
            {Object.entries(groupedHomeworks).map(([courseName, themes]) => (
              <motion.div
                key={courseName}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-5 mb-7"
              >
                <h2 className="text-[20px] md:text-[22px] font-black text-[#111827] tracking-tight">
                  {courseName}
                </h2>
                {Object.entries(themes).map(([themeName, hws]) => (
                  <div key={themeName}>
                    <div className="flex items-center gap-2 mb-3.5">
                      <FileText className="w-[15px] h-[15px] text-[#9CA3AF] shrink-0" strokeWidth={2} />
                      <h3 className="text-[14px] md:text-[15px] font-bold text-[#1F2937]">{themeName}</h3>
                    </div>

                    {/* Figma: ~4 wide cards across full content width (not centered 1200px column) */}
                    <div
                      className="grid gap-4"
                      style={{
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                      }}
                    >
                      <AnimatePresence mode="popLayout">
                        {hws.map((hw) => {
                          let statusText = '';
                          let badgeClass = '';
                          let Icon = Info;
                          let iconWrap = 'border-[#FECACA] text-[#F87171]';
                          let buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                          let buttonClass = 'bg-[#1A1D26] hover:bg-black text-white';

                          if (hw.status === 'TODO') {
                            statusText = 'К выполнению';
                            badgeClass = 'border border-[#FECACA] text-[#F87171] bg-white';
                            Icon = Info;
                            iconWrap = 'border-[#FECACA] text-[#F87171]';
                            buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                            buttonClass = 'bg-[#1A1D26] hover:bg-black text-white';
                          } else if (hw.status === 'OVERDUE') {
                            statusText = 'Просрочено';
                            badgeClass = 'border border-[#FECACA] text-[#DC2626] bg-[#FEF2F2]';
                            Icon = XCircle;
                            iconWrap = 'border-[#FECACA] text-[#EF4444]';
                            buttonText = 'СДАТЬ СЕЙЧАС';
                            buttonClass = 'bg-[#EF4444] hover:bg-rose-600 text-white';
                          } else if (hw.status === 'REVISION') {
                            statusText = 'На доработку';
                            badgeClass = 'border border-[#FDE68A] text-[#B45309] bg-[#FFFBEB]';
                            Icon = AlertCircle;
                            iconWrap = 'border-[#FDE68A] text-[#F59E0B]';
                            buttonText = 'ДОРАБОТАТЬ';
                            buttonClass = 'bg-[#F59E0B] hover:bg-amber-600 text-white';
                          } else if (hw.status === 'REVIEW') {
                            statusText = 'На проверке';
                            badgeClass = 'border border-[#BFDBFE] text-[#1D4ED8] bg-[#EFF6FF]';
                            Icon = Clock;
                            iconWrap = 'border-[#BFDBFE] text-[#3B82F6]';
                            buttonText = 'СМОТРЕТЬ ДЕТАЛИ';
                            buttonClass = 'bg-[#F3F4F6] hover:bg-gray-200 text-[#4B5563]';
                          } else if (hw.status === 'GRADED') {
                            statusText = `Оценено ${hw.score ?? '—'}/${hw.maxScore ?? '—'}`;
                            badgeClass = 'border border-[#A7F3D0] text-[#047857] bg-[#ECFDF5]';
                            Icon = CheckCircle2;
                            iconWrap = 'border-[#A7F3D0] text-[#10B981]';
                            buttonText = 'ПОСМОТРЕТЬ ОЦЕНКУ';
                            buttonClass =
                              'bg-[#ECFDF5] hover:bg-emerald-100 text-[#047857] border border-[#A7F3D0]';
                          }

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
                              className="bg-white rounded-[12px] border border-[#E5E7EB] px-5 pt-4 pb-4 flex flex-col min-h-[200px] hover:shadow-[0_8px_24px_rgba(17,24,39,0.06)] transition-shadow cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-5 gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold leading-none ${badgeClass}`}
                                >
                                  {statusText}
                                </span>
                                <span
                                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${iconWrap}`}
                                >
                                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </span>
                              </div>

                              <h3 className="text-[18px] md:text-[20px] font-bold text-[#111827] leading-snug line-clamp-3 mb-auto pr-1 tracking-tight">
                                {hw.title}
                              </h3>

                              <div
                                className={`mt-6 w-full py-[14px] rounded-[10px] font-bold text-[12px] uppercase tracking-[0.03em] flex items-center justify-center gap-1 pointer-events-none ${buttonClass}`}
                              >
                                {buttonText}
                                {(hw.status === 'TODO' ||
                                  hw.status === 'OVERDUE' ||
                                  hw.status === 'REVISION') && (
                                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
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
                className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-[14px] border border-[#E5E7EB]"
              >
                <div className="w-16 h-16 bg-[#F3F4F6] rounded-full flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">
                  {searchQuery ? 'Ничего не найдено' : 'Пусто'}
                </h2>
                <p className="text-gray-500 font-medium text-sm max-w-md">
                  {searchQuery
                    ? 'Попробуйте изменить запрос поиска.'
                    : 'В этом статусе пока нет заданий.'}
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
