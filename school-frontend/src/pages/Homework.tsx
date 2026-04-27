import { useState, useEffect } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, Loader2, FolderOpen, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://85.193.89.154:3000';

export default function Homework() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  // 🔥 Наш новый стейт для вкладок
  const [activeTab, setActiveTab] = useState<'TODO' | 'COMPLETED'>('TODO');

  useEffect(() => {
    const fetchRealHomeworks = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // 🔥 Запрашиваем ОДНОВРЕМЕННО и курсы, и сданные работы ученика
        const [coursesRes, subsRes] = await Promise.all([
          axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/submissions/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        const mySubs = subsRes.data;
        const extractedHomeworks: any[] = [];

        coursesRes.data.forEach((course: any) => {
          course.themes?.forEach((theme: any) => {
            theme.lessons?.forEach((lesson: any) => {
              if (lesson.is_homework) {
                // Ищем, сдавал ли юзер это задание
                const submission = mySubs.find((s: any) => s.lesson_id === lesson.id || s.lessonId === lesson.id);
                
                let status = 'TODO';
                let score = null;
                let maxScore = lesson.max_score || 100;

                if (submission) {
                  status = submission.status === 'GRADED' ? 'GRADED' : 'REVIEW';
                  score = submission.score;
                  maxScore = submission.max_score || maxScore;
                }

                extractedHomeworks.push({
                  id: lesson.id,
                  title: lesson.title,
                  moduleName: `${course.title} • ${theme.title}`,
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
        console.error('Ошибка загрузки реальных ДЗ:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealHomeworks();
  }, []);

  // Фильтруем задания по активной вкладке
  const filteredHomeworks = homeworks.filter(hw => {
    if (activeTab === 'TODO') return hw.status === 'TODO';
    if (activeTab === 'COMPLETED') return hw.status !== 'TODO'; // REVIEW или GRADED
    return true;
  });

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
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3 flex items-center gap-4">
          Мои задания <FileText className="w-10 h-10 text-[#5A4BFF]" />
        </h1>
        <p className="text-gray-500 font-medium text-lg mb-8">Отслеживай свои домашние работы и оценки куратора.</p>

        {/* 🔥 ВКЛАДКИ */}
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('TODO')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'TODO' ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
          >
            К выполнению
          </button>
          <button 
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
          >
            Сданные работы
          </button>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredHomeworks.map((hw) => {
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
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{hw.moduleName}</p>
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
      </motion.div>

      {filteredHomeworks.length === 0 && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <FolderOpen className="w-12 h-12 text-[#5A4BFF]" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Пусто</h2>
          <p className="text-gray-500 font-medium text-lg max-w-md">Здесь пока нет заданий.</p>
        </motion.div>
      )}
    </div>
  );
}