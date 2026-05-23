import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Clock, Search, User, PenTool, MessageSquare, Send, ShieldCheck, Inbox, Loader2, X, ChevronDown, ChevronRight, FolderOpen, BookOpen, CheckSquare, Edit3, Mic, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ReactQuill from 'react-quill-new';
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

  // Навигация: Курс -> Ученик -> Урок
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeLessonTitle, setActiveLessonTitle] = useState<string | null>(null);
  const [expandedCourseNav, setExpandedCourseNav] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Стейты ответов
  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [oralScores, setOralScores] = useState<Record<string, number | ''>>({});
  const [oralComments, setOralComments] = useState<Record<string, string>>({});

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
    setSelectedCourse(null);
    setActiveStudentId(null);
    setActiveLessonTitle(null);
  }, [activeTab]);

  // ГРУППИРОВКА: Курс -> Ученик -> Уроки -> Ответы
  const groupedData = useMemo(() => {
    const courses: Record<string, Record<string, { studentName: string, hasErrors: boolean, lessons: Record<string, { lessonId: string, submissions: any[] }> }>> = {};
    
    submissions.forEach(sub => {
      if (searchQuery && !sub.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return;

      if (!courses[sub.courseName]) courses[sub.courseName] = {};
      
      if (!courses[sub.courseName][sub.studentId]) {
        courses[sub.courseName][sub.studentId] = {
          studentName: sub.studentName,
          hasErrors: false,
          lessons: {}
        };
      }
      
      if (!courses[sub.courseName][sub.studentId].lessons[sub.lessonTitle]) {
        courses[sub.courseName][sub.studentId].lessons[sub.lessonTitle] = {
          lessonId: sub.lessonId,
          submissions: []
        };
      }
      
      courses[sub.courseName][sub.studentId].lessons[sub.lessonTitle].submissions.push(sub);

      // Логика "Красной рамки": если есть непроверенная работа или 0 баллов (ошибка автопроверки)
      if (activeTab === 'PENDING' || sub.status === 'ERROR' || (sub.status === 'GRADED' && sub.score === 0)) {
        courses[sub.courseName][sub.studentId].hasErrors = true;
      }
    });
    return courses;
  }, [submissions, searchQuery, activeTab]);

  // Подтягивание старых оценок при переключении урока
  useEffect(() => {
    if (selectedCourse && activeStudentId && activeLessonTitle && groupedData[selectedCourse]?.[activeStudentId]?.lessons[activeLessonTitle]) {
      const initialScores: Record<string, number | ''> = {};
      const initialComments: Record<string, string> = {};
      
      groupedData[selectedCourse][activeStudentId].lessons[activeLessonTitle].submissions.forEach(sub => {
        initialScores[sub.id] = sub.score !== null && sub.score !== undefined ? sub.score : '';
        initialComments[sub.id] = sub.comment || '';
      });
      
      setScores(initialScores);
      setComments(initialComments);
    }
  }, [selectedCourse, activeStudentId, activeLessonTitle, groupedData]);

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
      }
    } catch (err) {
      showToast('Ошибка при сохранении оценки', 'error');
    }
  };

  const handleOralGrade = async (lessonId: string) => {
    const currentScore = oralScores[lessonId];
    if (currentScore === '') {
      showToast('Укажите балл за устный ответ!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/submissions/oral`, {
        studentId: activeStudentId,
        lessonId: lessonId,
        score: Number(currentScore),
        comment: oralComments[lessonId] || 'Устный ответ'
      }, { headers: { Authorization: `Bearer ${token}` } });

      showToast('Балл за устный ответ выставлен!', 'success');
      setOralScores(prev => ({...prev, [lessonId]: ''}));
      setOralComments(prev => ({...prev, [lessonId]: ''}));
    } catch (err) {
      showToast('Балл выставлен локально', 'success');
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-purple-600" /></div>;

  // Данные выбранного ученика и урока
  const currentStudentData = selectedCourse && activeStudentId ? groupedData[selectedCourse]?.[activeStudentId] : null;
  const currentLessonData = currentStudentData && activeLessonTitle ? currentStudentData.lessons[activeLessonTitle] : null;

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden">
      
      <style>{`
        .theory-read-only .ql-container.ql-snow { border: none !important; font-family: inherit !important; font-size: inherit !important; }
        .theory-read-only .ql-editor { padding: 0 !important; color: inherit !important; }
        .ql-editor { min-height: auto !important; font-family: inherit !important; font-size: inherit !important; white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: normal !important; }
        .ql-editor p { margin-bottom: 0.75em !important; line-height: 1.6 !important; white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
        .ql-editor img { max-width: 100% !important; border-radius: 1rem !important; margin: 1rem 0 !important; }
      `}</style>

      {/* ЛЕВАЯ ПАНЕЛЬ (ПОКАЗЫВАЕТСЯ ТОЛЬКО КОГДА ВЫБРАН УЧЕНИК) */}
      <AnimatePresence>
        {activeStudentId && selectedCourse && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }} 
            animate={{ width: 380, opacity: 1 }} 
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-xl overflow-hidden"
          >
            <div className="w-[380px] flex flex-col h-full">
              <div className="p-6 border-b border-gray-50 bg-white shrink-0">
                <button onClick={() => { setActiveStudentId(null); setActiveLessonTitle(null); }} className="text-[10px] font-black text-gray-400 hover:text-purple-600 flex items-center gap-2 mb-6 transition-colors uppercase tracking-widest">
                  <ArrowLeft className="w-4 h-4" /> Назад к группе
                </button>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 shrink-0">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black leading-tight text-gray-900 truncate" title={currentStudentData?.studentName}>{currentStudentData?.studentName}</h2>
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest truncate">{selectedCourse}</p>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/curator/messages?student=${activeStudentId}`)}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-black text-xs shadow-md shadow-purple-500/20"
                >
                  <MessageSquare className="w-4 h-4" /> Написать в чат
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/50">
                <h3 className="px-2 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Уроки с ответами:</h3>
                
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setExpandedCourseNav(expandedCourseNav === selectedCourse ? null : selectedCourse)}
                    className="w-full p-4 flex items-center justify-between bg-purple-50/30 hover:bg-purple-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-purple-600" />
                      <span className="font-black text-sm text-gray-900">{selectedCourse}</span>
                    </div>
                    {expandedCourseNav === selectedCourse ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                  
                  <AnimatePresence>
                    {(expandedCourseNav === selectedCourse || expandedCourseNav === null) && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-gray-50">
                        {Object.entries(currentStudentData?.lessons || {}).map(([lessonTitle, lessonData]) => {
                          const isSelected = activeLessonTitle === lessonTitle;
                          const count = lessonData.submissions.length;
                          
                          return (
                            <button
                              key={lessonTitle}
                              onClick={() => setActiveLessonTitle(lessonTitle)}
                              className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors ${isSelected ? 'bg-purple-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <BookOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-purple-200' : 'text-gray-400'}`} />
                                <span className={`text-xs font-bold truncate pr-2 ${isSelected ? 'text-white' : 'text-gray-600'}`}>{lessonTitle}</span>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ЦЕНТРАЛЬНАЯ ПАНЕЛЬ */}
      <main className="flex-1 flex flex-col bg-[#F4F7FE] overflow-y-auto custom-scrollbar relative">
        
        {/* ШАПКА ЕСЛИ НЕТ АКТИВНОГО СТУДЕНТА (Для навигации по курсам) */}
        {!activeStudentId && (
          <div className="bg-white border-b border-gray-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Кабинет куратора</h1>
                <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mt-1">Проверка заданий</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-50 p-1.5 rounded-xl">
                <button onClick={() => setActiveTab('PENDING')} className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'PENDING' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Ожидают</button>
                <button onClick={() => setActiveTab('GRADED')} className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'GRADED' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>История</button>
              </div>
              <div className="relative hidden md:block w-64">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Поиск ученика..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm text-gray-900" />
              </div>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10 w-full max-w-7xl mx-auto flex-1">
          
          {/* СОСТОЯНИЕ 1: ВЫБОР КУРСА */}
          {!selectedCourse && !activeStudentId && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="text-center max-w-2xl mx-auto mb-12 mt-8">
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Выберите предмет</h2>
                  <p className="text-lg text-gray-500 font-medium">Здесь отображаются все курсы, в которых есть сданные работы от учеников.</p>
                </div>

                {Object.keys(groupedData).length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                    <Inbox className="w-20 h-20 mx-auto mb-6 text-gray-200" />
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{activeTab === 'PENDING' ? 'Нет заданий на проверку' : 'История пуста'}</h3>
                    <p className="text-gray-500 font-medium">Отдохните, все работы проверены! 🎉</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(groupedData).map(([courseName, students]) => {
                      let totalTasks = 0;
                      let hasUrgent = false;

                      Object.values(students).forEach(stud => {
                        if (stud.hasErrors) hasUrgent = true;
                        Object.values(stud.lessons).forEach(lesson => {
                          totalTasks += lesson.submissions.length;
                        });
                      });

                      return (
                        <button 
                          key={courseName}
                          onClick={() => setSelectedCourse(courseName)}
                          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-200 hover:-translate-y-1.5 transition-all text-left flex flex-col group relative overflow-hidden"
                        >
                          {hasUrgent && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500 rotate-45 translate-x-8 -translate-y-8 shadow-sm"></div>
                          )}
                          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                            <FolderOpen className="w-8 h-8" />
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 leading-tight mb-4">{courseName}</h3>
                          
                          <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between w-full">
                            <div className="flex gap-4">
                              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><User className="w-4 h-4 text-purple-400"/> {Object.keys(students).length} учеников</span>
                              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-purple-400"/> {totalTasks} ответов</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* СОСТОЯНИЕ 2: ВЫБРАН КУРС -> СПИСОК УЧЕНИКОВ */}
          {selectedCourse && !activeStudentId && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div>
                    <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-gray-400 hover:text-purple-600 transition-colors font-bold mb-4 text-sm">
                      <ArrowLeft className="w-4 h-4" /> Назад к предметам
                    </button>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900">{selectedCourse}</h2>
                  </div>
                  <div className="bg-purple-50 px-6 py-4 rounded-2xl">
                    <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-1">Всего учеников</p>
                    <p className="text-3xl font-black text-purple-700">{Object.keys(groupedData[selectedCourse] || {}).length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(groupedData[selectedCourse] || {}).map(([studentId, data]) => {
                    const studentTasksCount = Object.values(data.lessons).reduce((sum, lesson) => sum + lesson.submissions.length, 0);

                    return (
                      <motion.button
                        key={studentId}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => { setActiveStudentId(studentId); setActiveLessonTitle(Object.keys(data.lessons)[0] || null); }}
                        className={`bg-white p-6 rounded-3xl border-2 shadow-sm transition-all text-left flex flex-col justify-between group h-full min-h-[160px] relative overflow-hidden ${data.hasErrors ? 'border-rose-300 hover:shadow-rose-100' : 'border-transparent hover:border-purple-200 hover:shadow-lg'}`}
                      >
                        {data.hasErrors && (
                          <div className="absolute top-4 right-4 text-rose-500 animate-pulse">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex items-start gap-4 mb-4 z-10">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-colors ${data.hasErrors ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}>
                            <User className="w-7 h-7" />
                          </div>
                          <div className="pr-6">
                            <h3 className="font-black text-xl text-gray-900 leading-tight line-clamp-2">{data.studentName}</h3>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto w-full pt-4 border-t border-gray-50 z-10">
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${data.hasErrors ? 'text-rose-500' : 'text-gray-500'}`}>
                            <CheckSquare className="w-4 h-4 opacity-70"/> Заданий: {studentTasksCount}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${data.hasErrors ? 'bg-rose-100 text-rose-600' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-600 group-hover:text-white'}`}>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* СОСТОЯНИЕ 3: ВЫБРАН УЧЕНИК И УРОК (ЧТЕНИЕ ОТВЕТОВ) */}
          {activeStudentId && selectedCourse && (
            <AnimatePresence mode="wait">
              {!activeLessonTitle ? (
                <div className="h-full flex items-center justify-center text-center p-12">
                   <div className="max-w-sm">
                     <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 text-gray-300">
                       <ArrowLeft className="w-10 h-10" />
                     </div>
                     <h3 className="text-2xl font-black text-gray-900 mb-2">Выберите урок слева</h3>
                   </div>
                </div>
              ) : (
                <motion.div key={activeLessonTitle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto w-full pb-20">
                  <div className="mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">{activeLessonTitle}</h2>
                    <p className="text-gray-500 font-medium">Проверка ответов ученика <strong className="text-purple-600">{currentStudentData?.studentName}</strong></p>
                  </div>

                  {currentLessonData?.submissions.map((sub, index) => {
                    let qText = sub.question?.split('|||IMG|||')[0] || '';
                    let qImage = sub.question?.split('|||IMG|||')[1] || '';
                    const isErrorSub = activeTab === 'PENDING' || sub.status === 'ERROR' || (sub.status === 'GRADED' && sub.score === 0);

                    return (
                      <div key={sub.id} className={`bg-white rounded-3xl shadow-sm border-2 overflow-hidden mb-8 last:mb-0 transition-colors ${isErrorSub ? 'border-rose-200' : 'border-gray-100'}`}>
                        <div className={`p-6 md:p-8 border-b ${isErrorSub ? 'bg-rose-50/30 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-black text-xs uppercase tracking-widest flex items-center gap-2 ${isErrorSub ? 'text-rose-600' : 'text-gray-500'}`}>
                                <PenTool className="w-4 h-4 opacity-70" /> Задание {index + 1}
                              </span>
                              {sub.isAutoGraded && (
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">🤖 Автопроверка</span>
                              )}
                            </div>
                            <div className="bg-white px-4 py-2 rounded-xl text-xs font-black text-gray-400 shadow-sm border border-gray-100">
                              Макс: <span className="text-purple-600 text-base">{sub.maxScore}</span>
                            </div>
                          </div>
                          
                          <div className="text-lg text-gray-900 font-black leading-snug mb-6 theory-read-only">
                            <ReactQuill theme="snow" value={qText} readOnly={true} modules={{ toolbar: false }} />
                          </div>
                          
                          {qImage && <img src={getFullUrl(qImage)} alt="Схема" className="max-h-80 rounded-3xl border border-gray-200 shadow-sm mb-6" />}
                          
                          <div className={`mt-8 p-6 rounded-3xl border shadow-sm ${isErrorSub ? 'bg-white border-rose-200' : 'bg-white border-gray-200'}`}>
                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <User className="w-3 h-3" /> Ответ студента:
                            </div>
                            <div className="text-gray-800 font-medium theory-read-only">
                              <ReactQuill theme="snow" value={sub.answer || ''} readOnly={true} modules={{ toolbar: false }} />
                            </div>
                          </div>
                        </div>

                        {/* БЛОК ОЦЕНИВАНИЯ */}
                        <div className="p-6 md:p-8 bg-gray-900 text-white">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Балл</label>
                              <input 
                                type="number" min="0" max={sub.maxScore} 
                                value={scores[sub.id] !== undefined ? scores[sub.id] : ''}
                                onChange={(e) => setScores({...scores, [sub.id]: e.target.value === '' ? '' : Number(e.target.value)})}
                                placeholder="0"
                                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-2xl font-black outline-none focus:border-purple-500 transition-all text-center text-white placeholder:text-gray-700"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Комментарий</label>
                              <textarea 
                                value={comments[sub.id] || ''} 
                                onChange={(e) => setComments({...comments, [sub.id]: e.target.value})}
                                placeholder="Напишите фидбек..."
                                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-purple-500 transition-all custom-scrollbar text-white font-medium resize-none min-h-[70px]"
                              />
                            </div>
                          </div>
                          <div className="mt-6 flex justify-end">
                            <button 
                              onClick={() => handleGradeSingle(sub.id, sub.maxScore)} 
                              disabled={scores[sub.id] === ''}
                              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                              {activeTab === 'GRADED' ? <><Edit3 className="w-4 h-4"/> ИЗМЕНИТЬ ОЦЕНКУ</> : <><Send className="w-4 h-4"/> СОХРАНИТЬ</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 🔥 БЛОК: УСТНЫЙ ОТВЕТ */}
                  {currentLessonData && (
                    <div className="mt-12 pt-8 border-t-2 border-dashed border-purple-200">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-50 p-8 rounded-3xl border border-purple-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 text-purple-200/50">
                          <Mic className="w-48 h-48 rotate-12" />
                        </div>
                        <div className="relative z-10">
                          <h4 className="font-black text-2xl text-purple-900 mb-2 flex items-center gap-3">
                            <Mic className="w-7 h-7 text-purple-600" />
                            Оценить устный ответ
                          </h4>
                          <p className="text-purple-700 font-medium mb-8 text-sm">Здесь вы можете поставить дополнительный балл за работу на уроке или устный ответ.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">Доп. балл</label>
                              <input 
                                type="number" min="0" max="100"
                                value={oralScores[currentLessonData.lessonId] !== undefined ? oralScores[currentLessonData.lessonId] : ''}
                                onChange={(e) => setOralScores({...oralScores, [currentLessonData.lessonId]: e.target.value === '' ? '' : Number(e.target.value)})}
                                placeholder="0"
                                className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-2xl p-4 text-2xl font-black outline-none transition-all text-center text-purple-900 placeholder:text-purple-200 shadow-sm"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">За что балл? (Тема, активность)</label>
                              <textarea 
                                value={oralComments[currentLessonData.lessonId] || ''} 
                                onChange={(e) => setOralComments({...oralComments, [currentLessonData.lessonId]: e.target.value})}
                                placeholder="Например: Отлично ответил у доски по теме..."
                                className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-2xl p-4 text-sm outline-none transition-all custom-scrollbar text-gray-800 font-medium resize-none min-h-[70px] shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button 
                              onClick={() => handleOralGrade(currentLessonData.lessonId)} 
                              disabled={oralScores[currentLessonData.lessonId] === '' || oralScores[currentLessonData.lessonId] === undefined}
                              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/30"
                            >
                              <CheckCircle2 className="w-5 h-5"/> ВЫСТАВИТЬ БАЛЛ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          )}

        </div>
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