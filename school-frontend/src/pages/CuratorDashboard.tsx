import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Clock, Search, User, PenTool, MessageSquare, Send, ShieldCheck, Inbox, Loader2, X, ChevronDown, ChevronRight, FolderOpen, BookOpen, CheckSquare, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import 'react-quill-new/dist/quill.snow.css';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) finalUrl = finalUrl.replace('http://', 'https://');
  if (finalUrl.startsWith('http')) return finalUrl;
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (cleanPath.startsWith('uploads/')) return `https://prepodmgy.ru/${cleanPath}`;
  return `${API_URL}/${cleanPath}`;
};

export default function CuratorDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'PENDING' | 'GRADED'>('PENDING');

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      
      const res = await axios.get(`${API_URL}/submissions`, { 
        headers: { Authorization: `Bearer ${token}` },
        params: { status: activeTab } 
      });

      if (!res.data || res.data.length === 0) {
        setSubmissions([]);
      } else {
        setSubmissions(res.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки работ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    setActiveStudentId(null);
    setSelectedLesson(null);
  }, [activeTab]);

  const groupedData = useMemo(() => {
    const courses: Record<string, Record<string, Record<string, { studentName: string, submissions: any[] }>>> = {};
    
    submissions.forEach(sub => {
      if (searchQuery && !sub.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return;

      if (!courses[sub.courseName]) courses[sub.courseName] = {};
      if (!courses[sub.courseName][sub.lessonTitle]) courses[sub.courseName][sub.lessonTitle] = {};
      if (!courses[sub.courseName][sub.lessonTitle][sub.studentId]) {
        courses[sub.courseName][sub.lessonTitle][sub.studentId] = {
          studentName: sub.studentName,
          submissions: []
        };
      }
      
      courses[sub.courseName][sub.lessonTitle][sub.studentId].submissions.push(sub);
    });
    return courses;
  }, [submissions, searchQuery]);

  const activeStudentData = useMemo(() => {
    if (!selectedCourse || !selectedLesson || !activeStudentId) return null;
    return groupedData[selectedCourse]?.[selectedLesson]?.[activeStudentId];
  }, [groupedData, selectedCourse, selectedLesson, activeStudentId]);

  useEffect(() => {
    if (activeStudentData) {
      const initialScores: Record<string, number | ''> = {};
      const initialComments: Record<string, string> = {};
      activeStudentData.submissions.forEach(sub => {
        initialScores[sub.id] = sub.score !== null && sub.score !== undefined ? sub.score : '';
        initialComments[sub.id] = sub.comment || '';
      });
      setScores(initialScores);
      setComments(initialComments);
    }
  }, [activeStudentData]);

  const handleGradeSingle = async (subId: string, maxScore: number) => {
    const currentScore = scores[subId];
    if (currentScore === '' || currentScore < 0 || currentScore > maxScore) {
      showToast(`Балл должен быть от 0 до ${maxScore}`, 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!String(subId).startsWith('demo-')) {
        await axios.patch(`${API_URL}/submissions/${subId}/grade`, {
          score: Number(currentScore), comment: comments[subId] || ''
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      showToast('Оценка сохранена!');
      
      if (activeTab === 'PENDING') {
        const newSubs = submissions.filter(s => s.id !== subId);
        setSubmissions(newSubs);
        
        const remainingForStudent = newSubs.filter(s => s.studentId === activeStudentId && s.lessonTitle === selectedLesson);
        if (remainingForStudent.length === 0) setActiveStudentId(null);
      }
    } catch (err) {
      showToast('Ошибка при сохранении оценки', 'error');
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-purple-600" /></div>;

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden">
      <style>{`.ql-editor { min-height: auto; font-family: inherit; font-size: 16px; padding: 0; }`}</style>

      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <aside className={`w-full md:w-[400px] bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-xl ${activeStudentId || selectedLesson ? 'hidden md:flex' : 'flex'}`}>
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

          <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-6">
            <button 
              onClick={() => setActiveTab('PENDING')} 
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'PENDING' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Ожидают
            </button>
            <button 
              onClick={() => setActiveTab('GRADED')} 
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'GRADED' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              История
            </button>
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
               <p className="font-bold text-sm">{activeTab === 'PENDING' ? 'Нет новых работ' : 'История пуста'}</p>
             </div>
          ) : (
            Object.entries(groupedData).map(([courseName, lessons]) => {
              const isExpanded = expandedCourse === courseName;
              let totalStudentsInCourse = 0;
              Object.values(lessons).forEach(students => {
                totalStudentsInCourse += Object.keys(students).length;
              });

              return (
                <div key={courseName} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{totalStudentsInCourse} учеников</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/30"
                      >
                        {Object.entries(lessons).map(([lessonTitle, studentsObj]) => {
                          const studentsCount = Object.keys(studentsObj).length;
                          const isSelected = selectedCourse === courseName && selectedLesson === lessonTitle;
                          return (
                            <button
                              key={lessonTitle}
                              onClick={() => { setSelectedCourse(courseName); setSelectedLesson(lessonTitle); setActiveStudentId(null); }}
                              className={`w-full text-left px-5 py-4 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-white'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                                <span className={`text-sm font-bold truncate pr-4 ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>{lessonTitle}</span>
                              </div>
                              <span className={`text-xs font-black px-2 py-1 rounded-lg ${isSelected ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-500'}`}>
                                {studentsCount}
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

      {/* ЦЕНТРАЛЬНАЯ ПАНЕЛЬ */}
      <main className={`flex-1 flex flex-col bg-[#F4F7FE] overflow-y-auto ${!activeStudentId && !selectedLesson ? 'hidden md:flex' : 'flex'}`}>
        
        {/* ЭКРАН 1: СПИСОК УЧЕНИКОВ ВНУТРИ УРОКА */}
        {!activeStudentId && selectedLesson && selectedCourse ? (
          <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
            <div className="mb-8">
              <button onClick={() => setSelectedLesson(null)} className="md:hidden flex items-center gap-2 text-gray-500 font-bold mb-6">
                <ArrowLeft className="w-5 h-5" /> Назад
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-md bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                <FolderOpen className="w-3 h-3" /> {selectedCourse}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{selectedLesson}</h1>
              <p className="text-gray-500 font-medium mt-2">Выберите ученика для проверки его заданий</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(groupedData[selectedCourse]?.[selectedLesson] || {}).map(([studentId, data]) => (
                <motion.button
                  key={studentId}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setActiveStudentId(studentId)}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-gray-900 group-hover:text-purple-700 transition-colors">{data.studentName}</h3>
                      <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mt-1">
                        <CheckSquare className="w-3 h-3"/> Заданий: {data.submissions.length}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : activeStudentData ? (
          
          /* ЭКРАН 2: ЛЕНТА ЗАДАНИЙ ВЫБРАННОГО УЧЕНИКА */
          <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6 pb-20">
            <button onClick={() => setActiveStudentId(null)} className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors font-bold mb-4">
              <ArrowLeft className="w-5 h-5" /> К списку учеников
            </button>

            <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-sm border border-gray-100 flex items-center justify-between gap-8 mb-8">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-lg text-[10px] font-black uppercase tracking-widest ${activeTab === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {activeTab === 'PENDING' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {activeTab === 'PENDING' ? 'Ожидает проверки' : 'Уже проверено'}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">{activeStudentData.studentName}</h1>
                <p className="text-gray-500 font-bold text-sm">{selectedLesson}</p>
              </div>
              
              {/* 🔥 ЖЕЛЕЗОБЕТОННЫЙ ПУТЬ ДЛЯ ПЕРЕХОДА В ЧАТ */}
              <button 
                onClick={() => navigate(`/curator/messages?student=${activeStudentId}`)}
                className="w-14 h-14 bg-purple-50 hover:bg-purple-600 rounded-[1.5rem] transition-all duration-300 flex items-center justify-center group shrink-0"
                title="Написать в чат"
              >
                <MessageSquare className="w-6 h-6 text-purple-600 group-hover:text-white" />
              </button>
            </div>

            {/* ВЫВОДИМ ВСЕ ЗАДАНИЯ УЧЕНИКА СПИСКОМ */}
            {activeStudentData.submissions.map((sub, index) => {
               let qText = sub.question?.split('|||IMG|||')[0] || '';
               let qImage = sub.question?.split('|||IMG|||')[1] || '';

               return (
                 <div key={sub.id} className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
                    {/* ВОПРОС И ОТВЕТ */}
                    <div className="p-8 md:p-10 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-purple-500" /> Задание {index + 1}
                          </span>
                          {sub.isAutoGraded && (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                              🤖 Автопроверка
                            </span>
                          )}
                        </div>
                        <div className="bg-white px-4 py-2 rounded-xl text-xs font-black text-gray-400 shadow-sm border border-gray-100">
                          Макс. балл: <span className="text-purple-600 text-base">{sub.maxScore}</span>
                        </div>
                      </div>
                      <div className="text-lg text-gray-900 font-black leading-snug mb-6 ql-editor" dangerouslySetInnerHTML={{ __html: qText.includes('<') ? qText : qText.replace(/\n/g, '<br/>') }} />
                      {qImage && <img src={getFullUrl(qImage)} alt="Схема" className="max-h-80 rounded-3xl border border-gray-200 shadow-sm mb-6" />}
                      
                      <div className="mt-8 bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                        <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <User className="w-3 h-3" /> Ответ студента:
                        </div>
                        <div className="text-gray-800 font-medium ql-editor" dangerouslySetInnerHTML={{ __html: sub.answer }} />
                      </div>
                    </div>

                    {/* БЛОК ВЫСТАВЛЕНИЯ ОЦЕНКИ */}
                    <div className="p-8 md:p-10 bg-gray-900 text-white relative">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Балл</label>
                          <input 
                            type="number" min="0" max={sub.maxScore} 
                            value={scores[sub.id] !== undefined ? scores[sub.id] : ''}
                            onChange={(e) => setScores({...scores, [sub.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                            placeholder="0"
                            className="w-full bg-white/5 border-2 border-white/10 rounded-3xl p-4 text-3xl font-black outline-none focus:border-purple-500 transition-all text-center text-white placeholder:text-gray-700"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Комментарий (необязательно)</label>
                          <textarea 
                            value={comments[sub.id] || ''} 
                            onChange={(e) => setComments({...comments, [sub.id]: e.target.value})}
                            placeholder="Напишите фидбек..."
                            className="w-full bg-white/5 border-2 border-white/10 rounded-3xl p-4 text-sm outline-none focus:border-purple-500 transition-all custom-scrollbar text-white font-medium resize-none min-h-[90px]"
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button 
                          onClick={() => handleGradeSingle(sub.id, sub.maxScore)} 
                          disabled={scores[sub.id] === ''}
                          className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                          {activeTab === 'GRADED' ? <><Edit3 className="w-4 h-4"/> ИЗМЕНИТЬ ОЦЕНКУ</> : <><Send className="w-4 h-4"/> СОХРАНИТЬ</>}
                        </button>
                      </div>
                    </div>
                 </div>
               );
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-12">
            <div className="max-w-sm">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-gray-100 rotate-12 hover:rotate-0 transition-all duration-500">
                <BookOpen className="w-14 h-14 text-purple-200" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Выберите курс</h3>
              <p className="text-lg font-medium text-gray-500 leading-relaxed">Слева выберите курс и нужный урок, чтобы начать проверку.</p>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
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