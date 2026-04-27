import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Clock, Search, User, PenTool, MessageSquare, Send, ShieldCheck, Inbox, Loader2, X, ChevronDown, ChevronRight, FolderOpen, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://85.193.89.154:3000';

export default function CuratorDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Навигация куратора
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<any>(null); // Конкретная работа для проверки
  
  // Состояния для проверки
  const [score, setScore] = useState<number | ''>('');
  const [comment, setComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchPendingSubmissions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        
        const res = await axios.get(`${API_URL}/submissions/pending`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        if (res.data.length === 0) {
          // 🔥 Улучшенные демо-данные для демонстрации группировки
          setSubmissions([
            {
              id: 'demo-1', studentId: 's1', studentName: 'Михаил Романов',
              courseName: 'История ЕГЭ', lessonTitle: 'Эпоха дворцовых переворотов',
              question: 'Опишите причины начала эпохи дворцовых переворотов.',
              answer: 'Главной причиной стал Указ о престолонаследии 1722 года...', maxScore: 4, date: '12:30'
            },
            {
              id: 'demo-3', studentId: 's3', studentName: 'Иван Иванов',
              courseName: 'История ЕГЭ', lessonTitle: 'Эпоха дворцовых переворотов',
              question: 'Опишите причины начала эпохи дворцовых переворотов.',
              answer: 'Отсутствие законного наследника после смерти Петра I.', maxScore: 4, date: '14:00'
            },
            {
              id: 'demo-2', studentId: 's2', studentName: 'Анна Смирнова',
              courseName: 'Обществознание ЕГЭ', lessonTitle: 'Макроэкономика',
              question: 'Приведите 3 примера основных макроэкономических показателей государства.',
              answer: '1. ВВП\n2. Инфляция\n3. Безработица', maxScore: 3, date: '10:15'
            }
          ]);
        } else {
          setSubmissions(res.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки работ:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPendingSubmissions();
  }, [navigate]);

  // 🔥 ГЕНИАЛЬНАЯ ГРУППИРОВКА ДАННЫХ ДЛЯ САЙДБАРА
  const groupedData = useMemo(() => {
    const courses: Record<string, Record<string, any[]>> = {};
    
    submissions.forEach(sub => {
      // Учитываем поиск по имени ученика
      if (searchQuery && !sub.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return;

      if (!courses[sub.courseName]) courses[sub.courseName] = {};
      if (!courses[sub.courseName][sub.lessonTitle]) courses[sub.courseName][sub.lessonTitle] = [];
      
      courses[sub.courseName][sub.lessonTitle].push(sub);
    });
    return courses;
  }, [submissions, searchQuery]);

  const handleGrade = async () => {
    if (score === '' || score < 0 || score > activeSub.maxScore) {
      showToast(`Балл должен быть от 0 до ${activeSub.maxScore}`, 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!String(activeSub.id).startsWith('demo-')) {
        await axios.patch(`${API_URL}/submissions/${activeSub.id}/grade`, {
          score: Number(score), comment: comment
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      // Удаляем проверенную работу из списка
      const newSubs = submissions.filter(s => s.id !== activeSub.id);
      setSubmissions(newSubs);
      
      // Если это была последняя работа в уроке, закрываем урок
      const remainingInLesson = newSubs.filter(s => s.courseName === selectedCourse && s.lessonTitle === selectedLesson);
      if (remainingInLesson.length === 0) {
        setSelectedLesson(null);
      }

      setActiveSub(null);
      setScore('');
      setComment('');
      showToast('Работа успешно оценена!');
    } catch (err) {
      showToast('Ошибка при сохранении оценки', 'error');
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-purple-600" /></div>;

  let questionText = activeSub?.question?.split('|||IMG|||')[0] || '';
  let questionImage = activeSub?.question?.split('|||IMG|||')[1] || '';

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden">
      
      {/* 🔥 ЛЕВАЯ ПАНЕЛЬ: ИЕРАРХИЯ (КУРСЫ -> УРОКИ) */}
      <aside className={`w-full md:w-[400px] bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-xl ${activeSub || selectedLesson ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-50 bg-white shrink-0">
          <button onClick={() => navigate('/')} className="text-[10px] font-black text-gray-400 hover:text-purple-600 flex items-center gap-2 mb-6 transition-colors uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> На портал
          </button>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-purple-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight text-gray-900">Проверка ДЗ</h2>
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Кабинет куратора</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Поиск ученика..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm text-gray-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/50">
          {Object.keys(groupedData).length === 0 ? (
             <div className="text-center py-12 text-gray-400">
               <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
               <p className="font-bold text-sm">Нет заданий для проверки</p>
             </div>
          ) : (
            Object.entries(groupedData).map(([courseName, lessons]) => {
              const isExpanded = expandedCourse === courseName;
              const totalSubsInCourse = Object.values(lessons).flat().length;

              return (
                <div key={courseName} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                  {/* КНОПКА КУРСА */}
                  <button 
                    onClick={() => setExpandedCourse(isExpanded ? null : courseName)}
                    className="w-full p-5 flex items-center justify-between bg-white hover:bg-purple-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-black text-sm text-gray-900">{courseName}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{totalSubsInCourse} работ ожидают</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </button>

                  {/* СПИСОК УРОКОВ В КУРСЕ */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/30"
                      >
                        {Object.entries(lessons).map(([lessonTitle, subs]) => {
                          const isSelected = selectedCourse === courseName && selectedLesson === lessonTitle;
                          return (
                            <button
                              key={lessonTitle}
                              onClick={() => {
                                setSelectedCourse(courseName);
                                setSelectedLesson(lessonTitle);
                                setActiveSub(null); // Сбрасываем активную работу при смене урока
                              }}
                              className={`w-full text-left px-5 py-4 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-white'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                                <span className={`text-sm font-bold truncate pr-4 ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>{lessonTitle}</span>
                              </div>
                              <span className={`text-xs font-black px-2 py-1 rounded-lg ${isSelected ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-500'}`}>
                                {subs.length}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 🔥 ЦЕНТРАЛЬНАЯ/ПРАВАЯ ПАНЕЛЬ */}
      <main className={`flex-1 flex flex-col bg-[#F4F7FE] overflow-y-auto ${!activeSub && !selectedLesson ? 'hidden md:flex' : 'flex'}`}>
        
        {/* ЕСЛИ УРОК ВЫБРАН, НО РАБОТА ЕЩЕ НЕ ОТКРЫТА -> ПОКАЗЫВАЕМ СПИСОК УЧЕНИКОВ */}
        {!activeSub && selectedLesson && selectedCourse ? (
          <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
            <div className="mb-8">
              <button onClick={() => setSelectedLesson(null)} className="md:hidden flex items-center gap-2 text-gray-500 font-bold mb-6">
                <ArrowLeft className="w-5 h-5" /> К курсам
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-md bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                <FolderOpen className="w-3 h-3" /> {selectedCourse}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{selectedLesson}</h1>
              <p className="text-gray-500 font-medium mt-2">Выберите ученика для проверки задания</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groupedData[selectedCourse]?.[selectedLesson]?.map((sub) => (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setActiveSub(sub); setScore(''); setComment(''); }}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-gray-900 group-hover:text-purple-700 transition-colors">{sub.studentName}</h3>
                      <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> Сдано: {sub.date}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : activeSub ? (
          // 🔥 ИНТЕРФЕЙС ПРОВЕРКИ КОНКРЕТНОЙ РАБОТЫ (ТОТ ЖЕ САМЫЙ, КРАСИВЫЙ)
          <motion.div key={activeSub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6 pb-20">
            
            <button onClick={() => setActiveSub(null)} className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors font-bold mb-4">
              <ArrowLeft className="w-5 h-5" /> К списку студентов
            </button>

            <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                  <Clock className="w-3 h-3" /> Ожидает проверки
                </div>
                <div className="flex items-center justify-between">
                   <div>
                      <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">{activeSub.studentName}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-gray-500 font-bold text-sm">
                        <span className="bg-gray-100 px-3 py-1 rounded-xl text-gray-700">{activeSub.courseName}</span>
                        <span className="text-gray-300">•</span>
                        <span>{activeSub.lessonTitle}</span>
                      </div>
                   </div>
                   
                   {/* КНОПКА ЧАТА */}
                   <button 
                      onClick={() => navigate(`/curator/messages?student=${activeSub.studentId}`)}
                      className="group flex flex-col items-center justify-center w-16 h-16 bg-purple-50 hover:bg-purple-600 rounded-[1.5rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-500/20 active:scale-95 shrink-0 ml-4"
                      title="Написать ученику"
                   >
                      <MessageSquare className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                   </button>
                </div>
              </div>

              <div className="bg-gray-50 px-10 py-6 rounded-[2.5rem] border border-gray-100 text-center shrink-0 shadow-inner">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Макс. балл</p>
                <p className="text-5xl font-black text-purple-600">{activeSub.maxScore}</p>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 md:p-12 bg-gray-50 border-b border-gray-100 relative">
                <div className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest mb-6 relative z-10">
                  <PenTool className="w-4 h-4 text-purple-500" /> Текст задания:
                </div>
                <p className="text-xl md:text-2xl text-gray-900 font-black leading-snug relative z-10">{questionText}</p>
                {questionImage && (<div className="mt-8 relative z-10"><img src={questionImage} alt="Схема" className="max-h-96 rounded-[2rem] border border-gray-200 shadow-sm" /></div>)}
              </div>
              
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-widest mb-6">
                  <User className="w-4 h-4" /> Ответ студента:
                </div>
                <div className="bg-[#F8FAFC] p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-inner">
                  <p className="text-lg text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{activeSub.answer}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-[3rem] p-8 md:p-12 shadow-2xl text-white relative overflow-hidden border border-gray-800">
              <h3 className="text-2xl md:text-3xl font-black mb-10 relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 className="w-6 h-6 text-purple-400" /> 
                </div>
                Вердикт куратора
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                <div className="lg:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Оценка (из {activeSub.maxScore})</label>
                  <input 
                    type="number" min="0" max={activeSub.maxScore} value={score}
                    onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-[2rem] px-6 py-6 text-5xl font-black outline-none focus:border-purple-500 focus:bg-white/10 transition-all text-center placeholder:text-gray-700 text-white"
                  />
                </div>
                
                <div className="lg:col-span-3 flex flex-col">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Комментарий (по желанию)
                  </label>
                  <textarea 
                    value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="Напишите фидбек для студента..."
                    className="flex-1 w-full bg-white/5 border-2 border-white/10 rounded-[2rem] p-8 text-lg outline-none focus:border-purple-500 focus:bg-white/10 transition-all custom-scrollbar placeholder:text-gray-600 text-white font-medium resize-none min-h-[160px]"
                  />
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-white/10 relative z-10 flex justify-end">
                <button 
                  onClick={handleGrade} disabled={score === ''}
                  className="w-full md:w-auto px-12 py-6 bg-purple-600 hover:bg-purple-500 text-white rounded-[2rem] font-black text-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-purple-600/30"
                >
                  ОЦЕНИТЬ И ОТПРАВИТЬ <Send className="w-6 h-6 ml-1" />
                </button>
              </div>
            </div>

          </motion.div>
        ) : (
          // ДЕФОЛТНЫЙ ЭКРАН (НИЧЕГО НЕ ВЫБРАНО)
          <div className="h-full flex items-center justify-center text-center p-12">
            <div className="max-w-sm">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-gray-100 rotate-12 hover:rotate-0 transition-all duration-500">
                <BookOpen className="w-14 h-14 text-purple-200" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Выберите курс</h3>
              <p className="text-lg font-medium text-gray-500 leading-relaxed">Слева выберите курс и нужный урок, чтобы увидеть список студентов, сдавших работу.</p>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-8 py-5 rounded-[2rem] shadow-2xl font-black text-white text-lg flex items-center gap-4 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-7 h-7" /> : <X className="w-7 h-7" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}