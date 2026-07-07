import { useState, useEffect, useMemo } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, Loader2, FolderOpen, ChevronRight, Search, Book, Calendar, XCircle } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cachedGet } from '../lib/api';
import { getHomeworkBlocksFromLesson, lessonHasHomework } from '../utils/lessonHomework';
import { parseSafeDate, parseSafeDateMs } from '../lib/parseDate';
import RonWork from './RonWork';

type TabType = 'TODO' | 'OVERDUE' | 'REVISION' | 'REVIEW' | 'GRADED' | 'RON';

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
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  useEffect(() => {
    const fetchRealHomeworks = async () => {
      try {
        // 🚀 Общий кеш: переходы между ДЗ/курсами/дашбордом не дёргают бэкенд заново
        const [coursesData, subsData, schedData] = await Promise.all([
          cachedGet('/courses').catch(() => []),
          cachedGet('/submissions/my/summary').catch(() => []),
          cachedGet('/schedule').catch(() => []),
        ]);
        const coursesRes = { data: Array.isArray(coursesData) ? coursesData : [] };
        const subsRes = { data: Array.isArray(subsData) ? subsData : [] };
        const schedRes = { data: Array.isArray(schedData) ? schedData : [] };

        // Собираем дедлайны из расписания — матчим по названию урока
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
                const submission = mySubs.find((s: any) => s.lesson_id === lesson.id || s.lessonId === lesson.id);
                
                let status = 'TODO';
                let score = null;
                let maxScore = hwMaxScore || lesson.max_score || 100;

                const deadline = findDeadline(lesson.title);
                const isOverdue = status === 'TODO' && deadline && parseSafeDateMs(deadline) < Date.now();

                let comment: string | null = null;
                if (submission) {
                  if (submission.status === 'GRADED') status = 'GRADED';
                  else if (submission.status === 'REVISION') status = 'REVISION';
                  else status = 'REVIEW';
                  score = submission.score;
                  maxScore = submission.max_score || maxScore;
                  comment = submission.comment || null;
                } else if (isOverdue) {
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

  const homeworksForCourse =
    selectedCourseFilter === 'all'
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

  // 🔥 ГРУППИРОВКА ЗАДАНИЙ (Курс -> Модуль -> Массив заданий)
  const groupedHomeworks = filteredHomeworks.reduce((acc, hw) => {
    if (!acc[hw.courseName]) acc[hw.courseName] = {};
    if (!acc[hw.courseName][hw.themeName]) acc[hw.courseName][hw.themeName] = [];
    acc[hw.courseName][hw.themeName].push(hw);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 pt-4 px-4 sm:px-0">
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3 flex items-center gap-4">
          Мои задания <FileText className="w-10 h-10 text-[#5A4BFF]" />
        </h1>
        <p className="text-gray-500 font-medium text-lg mb-4">Отслеживай свои домашние работы и оценки куратора.</p>

        {courseNames.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setSelectedCourseFilter('all')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedCourseFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              Все предметы
            </button>
            {courseNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCourseFilter(name)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedCourseFilter === name ? 'bg-[#5A4BFF] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-200'}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 flex-wrap">
            {([
              { key: 'TODO', label: 'К выполнению', activeClass: 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' },
              { key: 'OVERDUE', label: '🚨 Просрочено', activeClass: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' },
              { key: 'REVISION', label: '📝 На доработку', activeClass: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' },
              { key: 'REVIEW', label: '⏳ На проверке', activeClass: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' },
              { key: 'GRADED', label: '✅ Оценено', activeClass: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
              { key: 'RON', label: '↩ Работа над ошибками', activeClass: 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' },
            ] as const).map(({ key, label, activeClass }) => (
              <button key={key} onClick={() => { setActiveTab(key); setSearchParams(key === 'RON' ? { tab: 'ron' } : {}); }}
                className={`px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === key ? activeClass : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
                {label}
                {key !== 'RON' && counts[key as keyof typeof counts] > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                    {counts[key as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Поиск заданий..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-[#5A4BFF] focus:ring-4 focus:ring-[#5A4BFF]/10 transition-all font-medium text-gray-700 shadow-sm"
            />
          </div>
        </div>
      </motion.div>

      {activeTab === 'RON' ? (
        <RonWork embedded />
      ) : (
      <>
      {/* 🔥 РЕНДЕР С ГРУППИРОВКОЙ ПО КУРСАМ И МОДУЛЯМ */}
      {Object.entries(groupedHomeworks).map(([courseName, themes]) => (
        <motion.div key={courseName} variants={containerVariants} initial="hidden" animate="show" className="mb-12">
          
          {/* ЗАГОЛОВОК КУРСА */}
          <div className="flex items-center gap-3 mb-6 pb-2 border-b-2 border-gray-100">
            <Book className="w-8 h-8 text-gray-800" />
            <h2 className="text-3xl font-black text-gray-900">{courseName}</h2>
          </div>

          <div className="space-y-10 pl-2 md:pl-6">
            {Object.entries(themes).map(([themeName, hws]) => (
              <div key={themeName}>
                {/* ЗАГОЛОВОК МОДУЛЯ */}
                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#5A4BFF]"></div>
                  <h3 className="text-sm font-black text-[#5A4BFF] uppercase tracking-widest">{themeName}</h3>
                </div>

                {/* КАРТОЧКИ ЗАДАНИЙ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {hws.map((hw) => {
                      let badgeBg = '', badgeText = '', Icon = AlertCircle, iconColor = '', statusText = '', buttonStyle = '', buttonText = '';

                      if (hw.status === 'TODO') {
                        badgeBg = 'bg-orange-100'; badgeText = 'text-orange-600'; iconColor = 'text-orange-500'; statusText = 'К ВЫПОЛНЕНИЮ';
                        buttonStyle = 'bg-gray-900 hover:bg-black text-white shadow-xl shadow-gray-900/20'; buttonText = 'НАЧАТЬ ВЫПОЛНЕНИЕ';
                      } else if (hw.status === 'OVERDUE') {
                        badgeBg = 'bg-rose-100'; badgeText = 'text-rose-600'; Icon = XCircle; iconColor = 'text-rose-500'; statusText = 'ПРОСРОЧЕНО';
                        buttonStyle = 'bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20'; buttonText = 'СДАТЬ СЕЙЧАС';
                      } else if (hw.status === 'REVISION') {
                        badgeBg = 'bg-orange-100'; badgeText = 'text-orange-600'; Icon = AlertCircle; iconColor = 'text-orange-500'; statusText = 'НА ДОРАБОТКУ';
                        buttonStyle = 'bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20'; buttonText = 'ДОРАБОТАТЬ';
                      } else if (hw.status === 'REVIEW') {
                        badgeBg = 'bg-indigo-100'; badgeText = 'text-[#5A4BFF]'; Icon = Clock; iconColor = 'text-[#5A4BFF]'; statusText = 'НА ПРОВЕРКЕ';
                        buttonStyle = 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'; buttonText = 'СМОТРЕТЬ ДЕТАЛИ';
                      } else if (hw.status === 'GRADED') {
                        badgeBg = 'bg-emerald-100'; badgeText = 'text-emerald-600'; Icon = CheckCircle2; iconColor = 'text-emerald-500'; statusText = `ОЦЕНЕНО: ${hw.score}/${hw.maxScore}`;
                        buttonStyle = 'bg-gray-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100'; buttonText = 'ПОСМОТРЕТЬ ОЦЕНКУ';
                      }

                      const deadlineDate = hw.deadline ? parseSafeDate(hw.deadline) : null;
                      const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000) : null;

                      return (
                        <motion.div key={hw.id} variants={itemVariants}
                          className={`bg-white rounded-[2.5rem] p-8 shadow-sm border flex flex-col justify-between min-h-[300px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${hw.status === 'OVERDUE' ? 'border-rose-200' : 'border-gray-100'}`}>
                          <div>
                            <div className="flex justify-between items-start mb-8">
                              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${badgeBg} ${badgeText}`}>{statusText}</div>
                              <div className="p-2 rounded-full bg-gray-50"><Icon className={`w-6 h-6 ${iconColor}`} /></div>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight line-clamp-3">{hw.title}</h3>
                            {deadlineDate && hw.status !== 'GRADED' && (
                              <div className={`flex items-center gap-1.5 mt-3 text-xs font-bold ${daysLeft !== null && daysLeft <= 1 ? 'text-rose-500' : 'text-gray-400'}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {hw.status === 'OVERDUE'
                                  ? `Просрочено: ${deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
                                  : `Сдать до: ${deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}${daysLeft !== null && daysLeft <= 2 ? ` (осталось ${daysLeft} д.)` : ''}`
                                }
                              </div>
                            )}
                          </div>
                          <div className="mt-8 pt-6 border-t border-gray-50">
                            <button onClick={() => navigate(`/homework/${hw.id}`)} className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${buttonStyle}`}>
                              {buttonText}
                              {(hw.status === 'TODO' || hw.status === 'OVERDUE') && <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* ПУСТОЕ СОСТОЯНИЕ */}
      {filteredHomeworks.length === 0 && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm mt-8">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <FolderOpen className="w-12 h-12 text-[#5A4BFF]" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">
            {searchQuery ? 'Ничего не найдено' : 'Пусто'}
          </h2>
          <p className="text-gray-500 font-medium text-lg max-w-md">
            {searchQuery ? 'Попробуйте изменить запрос поиска.' : 'Здесь пока нет заданий.'}
          </p>
        </motion.div>
      )}
      </>
      )}
    </div>
  );
}