import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Loader2, FolderOpen, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const API_URL = 'https://prepodmgy.ru/api';

export default function StudentCourses() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCoursesAndProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // 🔥 СТАВИМ БРОНЮ: Теперь если бэкенд ругнется (например, токен протух), 
        // код не упадет, а просто вернет пустой массив { data: [] }
        const [coursesRes, subsRes] = await Promise.all([
          axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/submissions/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        // 🔥 ЖЕЛЕЗОБЕТОННАЯ ПРОВЕРКА ДАННЫХ
        // Проверяем, точно ли пришел массив. Если бэкенд завернул ответ в { data: [...] }, достаем оттуда.
        const rawCourses = Array.isArray(coursesRes.data) ? coursesRes.data : (Array.isArray(coursesRes.data?.data) ? coursesRes.data.data : []);
        const mySubs = Array.isArray(subsRes.data) ? subsRes.data : (Array.isArray(subsRes.data?.data) ? subsRes.data.data : []);

        // УМНЫЙ СЧЕТЧИК ПРАКТИКИ
        const coursesWithRealProgress = rawCourses.map((course: any) => {
          let totalTasks = 0;
          let completedTasks = 0;

          course.themes?.forEach((theme: any) => {
            theme.lessons?.forEach((lesson: any) => {
              
              // 1. КАК МЫ ИЩЕМ ТЕСТЫ И ДЗ? (Максимально бронебойная проверка)
              const isPracticalTask = 
                lesson.is_homework === true || 
                lesson.is_test === true || 
                (typeof lesson.type === 'string' && ['test', 'quiz', 'practice'].includes(lesson.type.toLowerCase())) ||
                // Если забыли поставить галочку, но внутри контента есть блок теста:
                (lesson.content && lesson.content.includes('"type":"written"')) ||
                (lesson.content && lesson.content.includes('"type":"test"'));

              if (isPracticalTask) {
                totalTasks++; // Нашли тест/ДЗ! Плюсуем в общее количество
                
                // 2. СДАВАЛ ЛИ УЧЕНИК ЭТО ЗАДАНИЕ?
                const submission = mySubs.find((s: any) => s.lessonId === lesson.id || s.lesson_id === lesson.id);
                
                // 3. ЗАСЧИТЫВАЕМ ПРОГРЕСС, ЕСЛИ:
                // - Это ДЗ и его проверил куратор (GRADED)
                // - ИЛИ это авто-тест и он просто есть в базе сданных (submission)
                // - ИЛИ бэкенд прислал готовый флаг is_completed
                const isPassed = 
                  (submission && (submission.status === 'GRADED' || !lesson.is_homework)) || 
                  lesson.is_completed === true;

                if (isPassed) {
                  completedTasks++;
                }
              }
            });
          });

          // Считаем % (защита от деления на ноль, если тестов в курсе вообще нет)
          const calculatedProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

          return {
            ...course,
            progress: calculatedProgress,
            totalTasks,
            completedTasks
          };
        });

        setCourses(coursesWithRealProgress);
      } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
        // Если вообще всё сломалось, ставим пустой массив, чтобы не ронять интерфейс
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoursesAndProgress();
  }, []);

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
    <div className="max-w-7xl mx-auto space-y-8 pb-10 pt-4">
      
      {/* ШАПКА БЕЗ ВКЛАДОК */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3 flex items-center gap-4">
          Чему научимся сегодня? <GraduationCap className="w-10 h-10 text-[#5A4BFF]" />
        </h1>
        <p className="text-gray-500 font-medium text-lg mb-8">Выбирай направление и начинай путь к знаниям.</p>
      </motion.div>

      {/* СЕТКА КУРСОВ */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {courses.map((course) => {
            const progress = course.progress || 0;
            // Считаем курс полностью завершенным только если в нём есть тесты и все они сданы
            const isCompleted = progress === 100 && course.totalTasks > 0;
            
            return (
              <motion.div 
                key={course.id} 
                variants={itemVariants} 
                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[320px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl transition-colors ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F3E8FF] text-[#5A4BFF] group-hover:bg-[#5A4BFF] group-hover:text-white'}`}>
                      <BookOpen className="w-8 h-8" />
                    </div>
                    
                    {/* Плашки статуса сверху */}
                    {isCompleted ? (
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Завершен</div>
                    ) : progress > 0 ? (
                      <div className="px-3 py-1 bg-indigo-50 text-[#5A4BFF] text-[10px] font-black uppercase tracking-widest rounded-lg">В процессе</div>
                    ) : null}
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight group-hover:text-[#5A4BFF] transition-colors line-clamp-2">{course.title}</h3>
                  <p className="text-sm font-medium text-gray-400 line-clamp-2 mb-6">{course.description || 'Описание курса появится позже'}</p>
                </div>

                {/* БЛОК ПРОГРЕССА ВНИЗУ */}
                <div className="mt-auto pt-6 border-t border-gray-50">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {course.totalTasks > 0 ? `Пройдено ${course.completedTasks} из ${course.totalTasks}` : 'Нет тестов'}
                    </span>
                    {/* Показываем проценты только если в курсе есть хотя бы один тест */}
                    {course.totalTasks > 0 && (
                      <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-600' : 'text-[#5A4BFF]'}`}>{progress}%</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-[#5A4BFF]'}`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {courses.length === 0 && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <FolderOpen className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Здесь пока пусто</h2>
          <p className="text-gray-500 font-medium text-lg max-w-md">Доступные курсы появятся позже.</p>
        </motion.div>
      )}
    </div>
  );
}