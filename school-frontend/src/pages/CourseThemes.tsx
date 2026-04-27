import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, PlayCircle, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3000';

export default function CourseThemes() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    const fetchCourseAndProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        // 1. БЕЗОПАСНАЯ ЗАГРУЗКА КУРСА
        // Пробуем получить конкретный курс. Если такого роута нет, ищем его в общем списке
        let courseData = null;
        try {
          const res = await axios.get(`${API_URL}/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          courseData = res.data;
        } catch (err) {
          const resAll = await axios.get(`${API_URL}/courses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          courseData = resAll.data.find((c: any) => c.id === courseId);
        }

        if (!courseData) {
          setIsLoading(false);
          return;
        }

        // 2. ЗАГРУЖАЕМ СДАННЫЕ РАБОТЫ (ДЛЯ ПРОГРЕССА)
        const subsRes = await axios.get(`${API_URL}/submissions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }));
        const mySubs = subsRes.data;

        // 3. 🔥 СЧИТАЕМ ПРОГРЕСС ДЛЯ КАЖДОГО МОДУЛЯ (ТЕМЫ) ОТДЕЛЬНО
        const themesWithProgress = courseData.themes?.map((theme: any) => {
          let totalTasks = 0;
          let completedTasks = 0;

          theme.lessons?.forEach((lesson: any) => {
            // ИИ-поиск практических заданий внутри модуля
            const isPracticalTask = 
              lesson.is_homework === true || 
              lesson.is_test === true || 
              (typeof lesson.type === 'string' && ['test', 'quiz', 'practice'].includes(lesson.type.toLowerCase())) ||
              (lesson.content && lesson.content.includes('"type":"written"')) ||
              (lesson.content && lesson.content.includes('"type":"test"'));

            if (isPracticalTask) {
              totalTasks++;
              const submission = mySubs.find((s: any) => s.lessonId === lesson.id || s.lesson_id === lesson.id);
              
              const isPassed = 
                (submission && (submission.status === 'GRADED' || !lesson.is_homework)) || 
                lesson.is_completed === true;

              if (isPassed) completedTasks++;
            }
          });

          // Процент для конкретного модуля
          const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

          return {
            ...theme,
            progress,
            totalTasks,
            completedTasks,
            lessonsCount: theme.lessons?.length || 0 // Оставляем общее число для верхней плашки
          };
        });

        setCourse({ ...courseData, themes: themesWithProgress });
      } catch (error) {
        console.error('Ошибка загрузки модулей:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseAndProgress();
  }, [courseId, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Курс не найден</h2>
        <button onClick={() => navigate(-1)} className="text-[#A855F7] font-bold hover:underline">Вернуться назад</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 pt-4 px-4 sm:px-6">
      
      {/* ШАПКА */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <button 
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-xs tracking-widest transition-colors mb-6 uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> К каталогу курсов
        </button>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3">
          {course.title}
        </h1>
        <p className="text-gray-500 font-medium text-lg">
          {course.description || 'Выбери модуль, чтобы начать обучение и прокачать свои навыки.'}
        </p>
      </motion.div>

      {/* СЕТКА МОДУЛЕЙ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {course.themes?.map((theme: any, index: number) => {
            const isCompleted = theme.progress === 100 && theme.totalTasks > 0;

            return (
              <motion.div 
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[300px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  {/* ПЛАШКИ ИЗ ТВОЕГО ДИЗАЙНА */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="bg-[#EEF2FF] text-[#5A4BFF] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      Модуль {index + 1}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 text-gray-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      <Layers className="w-3.5 h-3.5" />
                      {theme.lessonsCount} уроков
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight line-clamp-2">
                    {theme.title}
                  </h3>
                </div>

                <div className="mt-auto">
                  
                  {/* 🔥 БЛОК ПРОГРЕССА (ВСТРОИЛИ НАД КНОПКОЙ) */}
                  <div className="mb-6 pt-5 border-t border-gray-50">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {theme.totalTasks > 0 ? `Заданий: ${theme.completedTasks} из ${theme.totalTasks}` : 'Только теория'}
                      </span>
                      {theme.totalTasks > 0 && (
                        <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-600' : 'text-[#5A4BFF]'}`}>
                          {theme.progress}%
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-[#5A4BFF]'}`} 
                        style={{ width: `${theme.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* КНОПКА ОТКРЫТЬ ИЗ ТВОЕГО ДИЗАЙНА */}
                  <button 
                    onClick={() => navigate(`/course/${course.id}/theme/${theme.id}`)}
                    className="w-full bg-[#111827] hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20"
                  >
                    <PlayCircle className="w-5 h-5" /> Открыть модуль
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ЕСЛИ МОДУЛЕЙ НЕТ */}
      {(!course.themes || course.themes.length === 0) && (
         <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
              <Layers className="w-12 h-12 text-[#5A4BFF]" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Модули в разработке</h2>
            <p className="text-gray-500 font-medium">Преподаватель скоро добавит материалы для этого курса.</p>
         </div>
      )}
    </div>
  );
}