import { useState, useEffect, useMemo } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, Loader2, FolderOpen, Search, XCircle } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cachedGet } from '../lib/api';
import { getHomeworkBlocksFromLesson, lessonHasHomework } from '../utils/lessonHomework';
import { parseSafeDateMs } from '../lib/parseDate';
import { design } from '../lib/designTokens';
import RonWork from './RonWork';

type TabType = 'TODO' | 'OVERDUE' | 'REVISION' | 'REVIEW' | 'GRADED' | 'RON';

/** Figma Inspect — course pills: h=36, radius 17, history #D3412E */
const getCoursePillTheme = (name: string, active: boolean) => {
  const isHistory = /истор/.test(name.toLowerCase());
  if (active) {
    if (isHistory) return 'bg-[#D3412E] text-white border-[#D3412E]';
    return 'bg-[#6C63FF] text-white border-[#5C38A3]';
  }
  if (isHistory) return 'bg-white text-[#D3412E] border-[#D3412E] hover:bg-[#FFF5F3]';
  return 'bg-white text-[#6C63FF] border-[#5C38A3]/60 hover:border-[#5C38A3]';
};

/** Figma pdf-page-02 status chips: 16px count square + label; active = filled */
const STATUS_FILTERS: {
  key: TabType;
  label: string;
  /** inactive count box */
  countClass: string;
  /** active chip shell */
  activeClass: string;
  /** count box when chip is active */
  activeCountClass: string;
}[] = [
  {
    key: 'TODO',
    label: 'К выполнению',
    countClass: 'bg-[#0D1728] text-white',
    activeClass: 'bg-[#0D1728] text-white border-[#0D1728]',
    activeCountClass: 'bg-[#5C49FE] text-white',
  },
  {
    key: 'OVERDUE',
    label: 'Просрочено',
    countClass: 'bg-[#FC2504] text-white',
    activeClass: 'bg-[#FC2504] text-white border-[#FC2504]',
    activeCountClass: 'bg-white/25 text-white',
  },
  {
    key: 'REVISION',
    label: 'На доработку',
    countClass: 'bg-[#F3F210] text-[#0D1728]',
    activeClass: 'bg-[#F3F210] text-[#0D1728] border-[#F3F210]',
    activeCountClass: 'bg-[#0D1728]/15 text-[#0D1728]',
  },
  {
    key: 'REVIEW',
    label: 'На проверке',
    countClass: 'bg-[#3433B0] text-white',
    activeClass: 'bg-[#3433B0] text-white border-[#3433B0]',
    activeCountClass: 'bg-white/25 text-white',
  },
  {
    key: 'GRADED',
    label: 'Оценено',
    countClass: 'bg-[#31D430] text-white',
    activeClass: 'bg-[#31D430] text-white border-[#31D430]',
    activeCountClass: 'bg-white/25 text-white',
  },
  {
    key: 'RON',
    label: 'Работа над ошибками',
    countClass: 'bg-[#DCDEE6] text-[#3433B0]',
    activeClass: 'bg-[#DCDEE6] text-[#3433B0] border-[#DCDEE6]',
    activeCountClass: 'bg-white text-[#3433B0]',
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
    if (selectedCourseFilter && !courseNames.includes(selectedCourseFilter)) {
      setSelectedCourseFilter('');
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
      className="w-full h-full min-h-0 flex flex-col gap-3.5 px-0 overflow-y-auto md:overflow-hidden pb-4 md:pb-0 font-[Golos_Text,system-ui,sans-serif] scrollbar-hide"
      style={{ color: design.textPrimary }}
    >
      {/* Course pills — mobile: horizontal scroll; desktop: wrap */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 custom-scrollbar flex-nowrap lg:flex-wrap lg:overflow-visible">
          {courseNames.length === 0 ? (
            <span className="text-sm font-medium text-gray-400">Пока нет курсов с заданиями</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedCourseFilter('')}
                className={`h-9 px-4 rounded-[17px] border-[0.5px] text-[11px] font-semibold uppercase tracking-[0.04em] outline-none shrink-0 transition-colors ${
                  !selectedCourseFilter
                    ? 'bg-[#0E1829] text-white border-[#0E1829]'
                    : 'bg-white text-[#6B7280] border-[#C0C6DD] hover:bg-gray-50'
                }`}
              >
                Все предметы
              </button>
              {courseNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedCourseFilter(name)}
                  className={`h-9 px-4 rounded-[17px] border-[0.5px] text-[11px] font-semibold uppercase tracking-[0.04em] outline-none focus:outline-none focus-visible:ring-0 transition-colors shrink-0 ${getCoursePillTheme(
                    name,
                    selectedCourseFilter === name,
                  )}`}
                >
                  {name}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="relative w-full lg:w-[223px] shrink-0">
          <Search className="w-4 h-4 text-[#98A1B0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="ПОИСК ЗАДАНИЙ"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-white border-[0.5px] border-[#98A1B0] rounded-full pl-9 pr-3 outline-none focus:border-[#6C63FF] transition-all text-[12px] font-medium text-[#374151] placeholder:text-[#98A1B0] placeholder:uppercase placeholder:tracking-[0.04em] placeholder:font-medium"
          />
        </div>
      </div>

      {/* Status chips — mobile: single-row scroll */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 custom-scrollbar shrink-0 flex-nowrap">
        {STATUS_FILTERS.map(({ key, label, countClass, activeClass, activeCountClass }) => {
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
              className={`inline-flex items-center gap-[6px] h-7 md:h-6 pl-1 pr-2.5 rounded-full border-[0.5px] text-[12px] font-medium leading-none outline-none focus:outline-none transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? activeClass
                  : 'bg-white text-[#1A1D26] border-[#C0C6DD] hover:bg-[#F9FAFB]'
              }`}
            >
              <span
                className={`hw-chip-num w-4 h-4 rounded-[3px] flex items-center justify-center shrink-0 ${
                  isActive ? activeCountClass : countClass
                }`}
              >
                {key === 'RON' ? (count || '·') : count}
              </span>
              <span className="leading-none font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
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
                <h2 className="hw-course-title">{courseName}</h2>
                {Object.entries(themes).map(([themeName, hws]) => (
                  <div key={themeName}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" strokeWidth={1.75} />
                      <h3 className="hw-theme-title">{themeName}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                      <AnimatePresence mode="popLayout">
                        {hws.map((hw) => {
                          let statusText = '';
                          let badgeClass = '';
                          let Icon: typeof AlertCircle | typeof XCircle | typeof Clock | typeof CheckCircle2 = AlertCircle;
                          let iconWrap = 'border-[#F07171] text-[#F07171]';
                          let buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                          let buttonClass = 'bg-[#1A1D26] hover:bg-black text-white';
                          let useBang = true;

                          if (hw.status === 'TODO') {
                            statusText = 'К выполнению';
                            badgeClass = 'border border-[#D3412E] text-[#D3412E] bg-white';
                            Icon = AlertCircle;
                            iconWrap = 'border-[#D3412E] text-[#D3412E]';
                            useBang = true;
                            buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                            buttonClass = 'bg-[#0E1829] text-white';
                          } else if (hw.status === 'OVERDUE') {
                            statusText = 'Просрочено';
                            badgeClass = 'border border-[#FC2504] text-[#FC2504] bg-white';
                            Icon = XCircle;
                            iconWrap = 'border-[#FC2504] text-[#FC2504]';
                            useBang = false;
                            buttonText = 'СДАТЬ СЕЙЧАС';
                            buttonClass = 'bg-[#FC2504] hover:bg-rose-600 text-white';
                          } else if (hw.status === 'REVISION') {
                            statusText = 'На доработку';
                            badgeClass = 'border border-[#E8B80E] text-[#B45309] bg-white';
                            Icon = AlertCircle;
                            iconWrap = 'border-[#E8B80E] text-[#E8B80E]';
                            useBang = true;
                            buttonText = 'ДОРАБОТАТЬ';
                            buttonClass = 'bg-[#F3F210] hover:bg-yellow-300 text-[#0D1728]';
                          } else if (hw.status === 'REVIEW') {
                            statusText = 'На проверке';
                            badgeClass = 'border border-[#3433B0] text-[#3433B0] bg-white';
                            Icon = Clock;
                            iconWrap = 'border-[#3433B0] text-[#3433B0]';
                            useBang = false;
                            buttonText = 'СМОТРЕТЬ ДЕТАЛИ';
                            buttonClass = 'bg-[#F3F4F6] hover:bg-gray-200 text-[#4B5563]';
                          } else if (hw.status === 'GRADED') {
                            statusText = `Оценено ${hw.score ?? '—'}/${hw.maxScore ?? '—'}`;
                            badgeClass = 'border border-[#31D430] text-[#1FA01F] bg-white';
                            Icon = CheckCircle2;
                            iconWrap = 'border-[#31D430] text-[#31D430]';
                            useBang = false;
                            buttonText = 'ПОСМОТРЕТЬ ОЦЕНКУ';
                            buttonClass =
                              'bg-white hover:bg-emerald-50 text-[#1FA01F] border border-[#31D430]';
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
                              className="bg-white rounded-[18px] border border-[#E5E7EB] w-full max-w-none md:max-w-[324px] min-h-[149px] h-auto md:h-[149px] px-3 md:px-2 pt-4 pb-4 flex flex-col hover:shadow-[0_6px_18px_rgba(17,24,39,0.05)] transition-shadow cursor-pointer group"
                            >
                              <div className="flex justify-between items-start gap-2 shrink-0">
                                <span
                                  className={`px-2 py-[3px] rounded-full text-[10px] font-medium leading-none ${badgeClass}`}
                                >
                                  {statusText}
                                </span>
                                <span
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${iconWrap}`}
                                >
                                  {useBang ? (
                                    <span className="text-[11px] font-semibold leading-none">!</span>
                                  ) : (
                                    <Icon className="w-2.5 h-2.5" strokeWidth={2.25} />
                                  )}
                                </span>
                              </div>

                              {/* Figma: title just above button */}
                              <div className="mt-auto shrink-0">
                                <h3 className="hw-card-title line-clamp-2 pr-1 mb-2">{hw.title}</h3>
                                <div
                                  className={`w-full h-9 rounded-[10px] font-bold text-[10px] uppercase tracking-[0.04em] flex items-center justify-center gap-1 pointer-events-none ${buttonClass}`}
                                >
                                  {buttonText}
                                  {(hw.status === 'TODO' ||
                                    hw.status === 'OVERDUE' ||
                                    hw.status === 'REVISION') && (
                                    <span className="text-[11px] font-bold leading-none" aria-hidden>
                                      &gt;
                                    </span>
                                  )}
                                </div>
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
