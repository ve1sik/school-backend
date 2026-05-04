import { useState, useEffect } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, Loader2, FolderOpen, ChevronRight, Search, Book, ListTodo } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

export default function Homework() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'TODO' | 'COMPLETED'>('TODO');
  
  // 🔥 ДОБАВИЛИ СОСТОЯНИЕ ДЛЯ ПОИСКА
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRealHomeworks = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const [coursesRes, subsRes] = await Promise.all([
          axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/submissions/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        const mySubs = subsRes.data;
        const extractedHomeworks: any[] = [];

        coursesRes.data.forEach((course: any) => {
          course.themes?.forEach((theme: any) => {
            theme.lessons?.forEach((lesson: any) => {
              let isHw = false;
              let hwMaxScore = 0;

              if (lesson.content) {
                try {
                  const parsed = JSON.parse(lesson.content.trim());
                  if (Array.isArray(parsed)) {
                    // 🔥 ФИКС: Теперь мы проверяем, есть ли В ПРИНЦИПЕ блоки с пометкой isHomework!
                    const hwBlocks = parsed.filter(b => b.isHomework);
                    
                    if (hwBlocks.length > 0) {
                      isHw = true;
                      hwMaxScore = hwBlocks.reduce((acc, b) => acc + (Number(b.maxScore) || 10), 0);
                    }
                  }
                } catch(e) {}
              }

              if (isHw || lesson.is_homework) {
                const submission = mySubs.find((s: any) => s.lesson_id === lesson.id || s.lessonId === lesson.id);
                
                let status = 'TODO';
                let score = null;
                let maxScore = hwMaxScore || lesson.max_score || 100;

                if (submission) {
                  status = submission.status === 'GRADED' ? 'GRADED' : 'REVIEW';
                  score = submission.score;
                  maxScore = submission.max_score || maxScore;
                }

                extractedHomeworks.push({
                  id: lesson.id,
                  title: lesson.title,
                  courseName: course.title,
                  themeName: theme.title,
                  status, 
                  score,
                  maxScore
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

  // 🔥 УМНАЯ ФИЛЬТРАЦИЯ (Вкладки + Поиск)
  const filteredHomeworks = homeworks.filter(hw => {
    // Проверка вкладки
    const matchesTab = activeTab === 'TODO' ? hw.status === 'TODO' : hw.status !== 'TODO';
    
    // Проверка поиска
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = hw.title.toLowerCase().includes(searchLower) || 
                          hw.courseName.toLowerCase().includes(searchLower) || 
                          hw.themeName.toLowerCase().includes(searchLower);
                          
    return matchesTab && matchesSearch;
  });

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
        <p className="text-gray-500 font-medium text-lg mb-8">Отслеживай свои домашние работы и оценки куратора.</p>

        {/* 🔥 ПАНЕЛЬ УПРАВЛЕНИЯ: Вкладки + Поиск */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => setActiveTab('TODO')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'TODO' ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
            >
              К выполнению
            </button>
            <button 
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
            >
              Сданные работы
            </button>
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
                      } else if (hw.status === 'REVIEW') {
                        badgeBg = 'bg-indigo-100'; badgeText = 'text-[#5A4BFF]'; Icon = Clock; iconColor = 'text-[#5A4BFF]'; statusText = 'НА ПРОВЕРКЕ';
                        buttonStyle = 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'; buttonText = 'СМОТРЕТЬ ДЕТАЛИ';
                      } else if (hw.status === 'GRADED') {
                        badgeBg = 'bg-emerald-100'; badgeText = 'text-emerald-600'; Icon = CheckCircle2; iconColor = 'text-emerald-500'; statusText = `ОЦЕНЕНО: ${hw.score}/${hw.maxScore}`;
                        buttonStyle = 'bg-gray-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100'; buttonText = 'ПОСМОТРЕТЬ ОЦЕНКУ';
                      }

                      return (
                        <motion.div key={hw.id} variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[300px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                          <div>
                            <div className="flex justify-between items-start mb-8">
                              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${badgeBg} ${badgeText}`}>{statusText}</div>
                              <div className="p-2 rounded-full bg-gray-50"><Icon className={`w-6 h-6 ${iconColor}`} /></div>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight line-clamp-3">{hw.title}</h3>
                          </div>
                          <div className="mt-8 pt-6 border-t border-gray-50">
                            <button onClick={() => navigate(`/homework/${hw.id}`)} className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${buttonStyle}`}>
                              {buttonText}
                              {hw.status === 'TODO' && <ChevronRight className="w-4 h-4" />}
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
    </div>
  );
}