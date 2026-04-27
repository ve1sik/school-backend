import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, PlayCircle, Loader2, BookOpen, CheckSquare, CheckCircle2, XCircle, Type, PenTool, Clock, FileDown, Link2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3000';

export default function CourseView() {
  const { courseId, themeId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [testAnswers, setTestAnswers] = useState<Record<string, string[]>>(() => JSON.parse(localStorage.getItem('demo_answers') || '{}'));
  const [testResults, setTestResults] = useState<Record<string, 'SUCCESS' | 'ERROR' | 'PENDING'>>(() => JSON.parse(localStorage.getItem('demo_results') || '{}'));
  const [attemptsUsed, setAttemptsUsed] = useState<Record<string, number>>(() => JSON.parse(localStorage.getItem('demo_attempts') || '{}'));

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const res = await axios.get(`${API_URL}/courses/${courseId}`, { headers });
        let courseData = res.data;
        
        if (courseData && (!courseData.themes || courseData.themes.length === 0)) {
          const allRes = await axios.get(`${API_URL}/courses`, { headers });
          courseData = allRes.data.find((c: any) => String(c.id) === String(courseId));
        }
        
        setCourse(courseData);

        if (courseData && courseData.themes) {
          const targetTheme = courseData.themes.find((t: any) => String(t.id) === String(themeId));
          if (targetTheme && targetTheme.lessons && targetTheme.lessons.length > 0) {
            setActiveLesson(targetTheme.lessons[0]);
          } else if (courseData.themes[0]?.lessons?.[0]) {
            setActiveLesson(courseData.themes[0].lessons[0]); 
          }
        }
      } catch (err) { 
        console.error('Ошибка загрузки курса:', err);
      } finally { 
        setIsLoading(false); 
      }
    };
    fetchCourseData();
  }, [courseId, themeId]);

  const handleAnswerToggle = (blockId: string, answerText: string) => {
    const current = testAnswers[blockId] || [];
    const updated = current.includes(answerText) ? current.filter(a => a !== answerText) : [...current, answerText];
    const newAnswers = { ...testAnswers, [blockId]: updated };
    setTestAnswers(newAnswers);
    localStorage.setItem('demo_answers', JSON.stringify(newAnswers));

    if (testResults[blockId] === 'ERROR') {
      const newResults = { ...testResults };
      delete newResults[blockId];
      setTestResults(newResults);
      localStorage.setItem('demo_results', JSON.stringify(newResults));
    }
  };

  const handleTextAnswerChange = (blockId: string, text: string) => {
    const newAnswers = { ...testAnswers, [blockId]: [text] };
    setTestAnswers(newAnswers);
    localStorage.setItem('demo_answers', JSON.stringify(newAnswers));

    if (testResults[blockId] === 'ERROR') {
      const newResults = { ...testResults };
      delete newResults[blockId];
      setTestResults(newResults);
      localStorage.setItem('demo_results', JSON.stringify(newResults));
    }
  };

  const handleSubmitTest = async (block: any) => {
    const currentAttempts = attemptsUsed[block.id] || 0;
    const maxAttempts = block.maxAttempts || 3;
    if (block.type !== 'written' && currentAttempts >= maxAttempts) return; 

    const selected = testAnswers[block.id] || [];
    let isSuccess = false;
    let isPending = false;

    if (block.type === 'written') {
      try {
        const questionWithImage = block.questionImage 
          ? `${block.question}|||IMG|||${block.questionImage}` 
          : block.question;

        await axios.post(`${API_URL}/submissions`, {
          lessonId: activeLesson.id,
          blockId: block.id,
          question: questionWithImage,
          answer: selected[0] || '',
          maxScore: block.maxScore || 3
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        
        isPending = true;
      } catch (err) {
        console.error('Ошибка отправки эссе куратору', err);
        return; 
      }
    } else if (block.type === 'test') {
      const correctOptions = block.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.text);
      isSuccess = correctOptions.length === selected.length && correctOptions.every((val: string) => selected.includes(val));
    } else if (block.type === 'test_short') {
      const userAnswer = (selected[0] || '').trim().toLowerCase();
      const correctAnswer = (block.correctAnswer || '').trim().toLowerCase();
      isSuccess = userAnswer === correctAnswer && userAnswer !== '';
    }
    
    // 🔥 НОВАЯ МАГИЯ ДЛЯ АВТО-ТЕСТОВ: СОХРАНЯЕМ И СРАЗУ ОЦЕНИВАЕМ
    if (block.type !== 'written' && isSuccess) {
      try {
        const token = localStorage.getItem('token');
        
        // 1. Создаем "Сдачу" в базе (как будто это ДЗ)
        const res = await axios.post(`${API_URL}/submissions`, {
          lessonId: activeLesson.id,
          blockId: block.id,
          question: block.question,
          answer: selected.join(', '),
          maxScore: block.maxScore || 100
        }, { headers: { Authorization: `Bearer ${token}` } });

        // 2. Бэкенд возвращает нам ID созданной сдачи. СРАЗУ ЖЕ ставим ей 100 баллов!
        if (res.data && res.data.id) {
          await axios.patch(`${API_URL}/submissions/${res.data.id}/grade`, {
            score: block.maxScore || 100,
            comment: '🤖 Автоматическая проверка: Верно!'
          });
        }
      } catch (error) {
        console.error('Ошибка сохранения прогресса авто-теста:', error);
      }
    }

    if (block.type !== 'written') {
      const newAttempts = { ...attemptsUsed, [block.id]: currentAttempts + 1 };
      setAttemptsUsed(newAttempts);
      localStorage.setItem('demo_attempts', JSON.stringify(newAttempts));
    }

    const newResultState = isPending ? 'PENDING' : (isSuccess ? 'SUCCESS' : 'ERROR');
    const newResults = { ...testResults, [block.id]: newResultState };
    setTestResults(newResults);
    localStorage.setItem('demo_results', JSON.stringify(newResults));
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('vk.com/video_ext.php')) return url;
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
    return url;
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;
  if (!course) return <div className="p-8 text-center font-bold">Курс не найден</div>;

  let blocks: any[] = [];
  if (activeLesson) {
    if (activeLesson.content) {
      try {
        const parsed = JSON.parse(activeLesson.content);
        blocks = Array.isArray(parsed) ? parsed : [{ id: 'text-1', type: 'text', content: activeLesson.content }];
      } catch (e) {
        blocks = [{ id: 'text-1', type: 'text', content: activeLesson.content }];
      }
    }
    if (activeLesson.video_url && !blocks.find(b => b.type === 'video')) blocks.unshift({ id: 'video-1', type: 'video', url: activeLesson.video_url });
    if (activeLesson.test_data && !blocks.find(b => b.type === 'test')) blocks.push({ id: 'test-1', type: 'test', ...activeLesson.test_data });
  }

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900">
      <aside className="w-80 bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-xl">
        <div className="p-6 border-b border-gray-50 bg-white">
          <button onClick={() => navigate(`/course/${courseId}`)} className="text-xs font-bold text-gray-400 hover:text-[#5A4BFF] flex items-center gap-2 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> К МОДУЛЯМ
          </button>
          <h2 className="text-2xl font-black leading-tight text-gray-900">{course.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {course.themes?.map((theme: any, tIdx: number) => (
            <div key={theme.id} className="space-y-2">
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 px-3 ${String(theme.id) === String(themeId) ? 'text-[#5A4BFF]' : 'text-gray-400'}`}>
                Модуль {tIdx + 1}. {theme.title}
              </h3>
              <div className="space-y-1">
                {theme.lessons?.map((lesson: any) => (
                  <button key={lesson.id} onClick={() => setActiveLesson(lesson)} className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm font-bold flex gap-3 transition-all ${activeLesson?.id === lesson.id ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <PlayCircle className={`w-5 h-5 shrink-0 ${activeLesson?.id === lesson.id ? 'text-white/80' : 'text-gray-300'}`} />
                    <span className="leading-snug">{lesson.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#F4F7FE] scroll-smooth">
        <AnimatePresence mode="wait">
          {activeLesson ? (
            <motion.div key={activeLesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto p-6 md:p-10 pb-32">
              <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 md:p-12 pb-6 border-b border-gray-50">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-[#5A4BFF] animate-pulse"></span> Материалы
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">{activeLesson.title}</h1>
                </div>

                <div className="p-8 md:p-12 space-y-12">
                  {blocks.map((block) => {
                    
                    if (block.type === 'video' && block.url) return (
                      <div key={block.id} className="space-y-4">
                        {block.title && <h3 className="text-2xl font-black text-gray-900">{block.title}</h3>}
                        <div className="aspect-video bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl relative border border-gray-100">
                          <iframe src={getEmbedUrl(block.url)} className="w-full h-full absolute inset-0" allowFullScreen></iframe>
                        </div>
                      </div>
                    );

                    if (block.type === 'image' && block.url) return (
                      <div key={block.id} className="space-y-4">
                        {block.title && <h3 className="text-2xl font-black text-gray-900">{block.title}</h3>}
                        <div className="rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 bg-gray-50 flex justify-center p-4">
                          <img src={block.url} alt="Материал" className="max-w-full h-auto rounded-xl" />
                        </div>
                      </div>
                    );

                    if (block.type === 'video_file' && block.url) return (
                      <div key={block.id} className="space-y-4">
                        {block.title && <h3 className="text-2xl font-black text-gray-900">{block.title}</h3>}
                        <div className="aspect-video bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl relative border border-gray-100">
                          <video src={block.url} controls className="w-full h-full absolute inset-0 object-contain"></video>
                        </div>
                      </div>
                    );

                    if (block.type === 'text' && block.content) return (
                      <div key={block.id} className="space-y-4">
                        {block.title && <h3 className="text-2xl font-black text-gray-900">{block.title}</h3>}
                        
                        {block.image && (
                          <div className="my-6">
                            <img src={block.image} alt="Материал лекции" className="max-w-full rounded-2xl border border-gray-100 shadow-sm" />
                          </div>
                        )}
                        
                        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                          <div dangerouslySetInnerHTML={{ __html: block.content.replace(/\n/g, '<br/>') }} />
                        </div>
                      </div>
                    );

                    if (block.type === 'file' && block.url) return (
                      <div key={block.id} className="bg-cyan-50/50 border border-cyan-100 rounded-[2.5rem] p-8 md:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md hover:bg-cyan-50 group">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center shrink-0">
                            <FileDown className="w-7 h-7 text-cyan-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">{block.title || 'Файл для скачивания'}</h3>
                            {block.content && <p className="text-sm font-medium text-gray-600 leading-relaxed">{block.content}</p>}
                          </div>
                        </div>
                        <a href={block.url} target="_blank" rel="noopener noreferrer" download className="shrink-0 w-full sm:w-auto px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-cyan-600/20 active:scale-95 flex items-center justify-center gap-3">
                          <FileDown className="w-5 h-5" /> СКАЧАТЬ
                        </a>
                      </div>
                    );

                    if (block.type === 'link' && block.url) return (
                      <div key={block.id} className="bg-pink-50/50 border border-pink-100 rounded-[2.5rem] p-8 md:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md hover:bg-pink-50 group">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center shrink-0">
                            <Link2 className="w-7 h-7 text-pink-600" />
                          </div>
                          <h3 className="text-xl font-black text-gray-900">{block.title || 'Полезная ссылка'}</h3>
                        </div>
                        <a href={block.url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-full sm:w-auto px-10 py-5 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-pink-600/20 active:scale-95 flex items-center justify-center gap-3">
                          {block.buttonText || 'ПЕРЕЙТИ'} <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>
                    );

                    if ((block.type === 'test' || block.type === 'test_short' || block.type === 'written') && block.question) {
                      const selected = testAnswers[block.id] || [];
                      const result = testResults[block.id];
                      const currentAttempts = attemptsUsed[block.id] || 0;
                      const maxAttempts = block.maxAttempts || 3;
                      const attemptsLeft = maxAttempts - currentAttempts;
                      const isExhausted = block.type !== 'written' && attemptsLeft <= 0;
                      const isLocked = isExhausted || result === 'SUCCESS' || result === 'PENDING';
                      
                      let badgeText = block.title || 'Практика';
                      let badgeColor = 'bg-indigo-100 text-indigo-700';
                      if (block.type === 'test_short') badgeColor = 'bg-amber-100 text-amber-700';
                      if (block.type === 'written') badgeColor = 'bg-purple-100 text-purple-700';

                      return (
                        <div key={block.id} className={`bg-[#F8FAFC] rounded-[2.5rem] p-8 md:p-10 border-2 transition-colors ${isExhausted && result !== 'SUCCESS' ? 'border-rose-200' : 'border-gray-100'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest w-max ${badgeColor}`}>
                              {block.type === 'test_short' && <Type className="w-3 h-3"/>}
                              {block.type === 'written' && <PenTool className="w-3 h-3"/>}
                              {block.type === 'test' && <CheckSquare className="w-3 h-3"/>}
                              {badgeText}
                            </div>
                            {block.type !== 'written' && (
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest w-max ${isExhausted ? 'bg-rose-100 text-rose-600' : 'bg-gray-200 text-gray-600'}`}>
                                Попыток: {attemptsLeft} из {maxAttempts}
                              </div>
                            )}
                            {block.type === 'written' && (
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest w-max">
                                Макс. балл: {block.maxScore || 3}
                              </div>
                            )}
                          </div>

                          <h3 className={`text-2xl md:text-3xl font-black ${block.questionImage ? 'mb-6' : 'mb-10'} leading-tight`}>{block.question}</h3>
                          
                          {block.questionImage && (
                            <div className="mb-10">
                              <img src={block.questionImage} alt="Схема к заданию" className="max-w-full max-h-[500px] rounded-2xl border border-gray-200 shadow-sm" />
                            </div>
                          )}
                          
                          {block.type === 'test' && (
                            <div className="space-y-4 mb-10">
                              {block.options?.map((opt: any, idx: number) => {
                                const isChecked = selected.includes(opt.text);
                                return (
                                  <label key={idx} className={`flex items-center gap-5 p-6 rounded-2xl border-2 transition-all bg-white ${isChecked ? 'border-[#5A4BFF] shadow-md shadow-indigo-500/10' : 'border-gray-100 hover:border-gray-200'} ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input type="checkbox" className="hidden" checked={isChecked} disabled={isLocked} onChange={() => handleAnswerToggle(block.id, opt.text)} />
                                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[#5A4BFF] border-[#5A4BFF]' : 'border-gray-300'} ${isLocked && !isChecked ? 'bg-gray-100' : ''}`}>
                                      {isChecked && <CheckSquare className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className={`text-lg font-bold ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>{opt.text}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {block.type === 'test_short' && (
                            <div className="mb-10">
                              <input 
                                type="text" 
                                value={selected[0] || ''} 
                                onChange={(e) => handleTextAnswerChange(block.id, e.target.value)} 
                                disabled={isLocked}
                                placeholder="Введите ваш ответ..." 
                                className={`w-full p-6 text-xl font-bold rounded-2xl border-2 outline-none transition-all ${isLocked ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-100 focus:border-[#5A4BFF] focus:shadow-md text-gray-900'}`}
                              />
                            </div>
                          )}

                          {block.type === 'written' && (
                            <div className="mb-10">
                              <textarea 
                                value={selected[0] || ''} 
                                onChange={(e) => handleTextAnswerChange(block.id, e.target.value)} 
                                disabled={isLocked}
                                placeholder="Напишите развернутый ответ или вставьте ссылку на работу..." 
                                rows={6}
                                className={`w-full p-6 text-lg rounded-2xl border-2 outline-none transition-all custom-scrollbar ${isLocked ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-100 focus:border-purple-400 focus:shadow-md text-gray-900'}`}
                              />
                            </div>
                          )}

                          <div className="flex flex-col items-start gap-4 pt-8 border-t border-gray-200">
                            <div className="flex flex-col md:flex-row md:items-start gap-4 w-full">
                              <button 
                                onClick={() => handleSubmitTest(block)} 
                                disabled={selected.length === 0 || selected[0] === '' || isLocked} 
                                className={`w-full md:w-auto shrink-0 px-10 py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50 ${isExhausted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : (block.type === 'written' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-900 hover:bg-black text-white')}`}
                              >
                                {block.type === 'written' ? (result === 'PENDING' ? 'ОТПРАВЛЕНО' : 'СДАТЬ НА ПРОВЕРКУ') : (isExhausted ? 'ЛИМИТ ИСЧЕРПАН' : 'ПРОВЕРИТЬ')}
                              </button>
                              
                              <AnimatePresence>
                                {result === 'SUCCESS' && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-5 py-4 rounded-xl shrink-0"><CheckCircle2 className="w-5 h-5" /> Верно!</motion.div>}
                                {result === 'ERROR' && !isExhausted && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 px-5 py-4 rounded-xl shrink-0"><XCircle className="w-5 h-5" /> Неверно, попробуй ещё</motion.div>}
                                {result === 'PENDING' && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-purple-600 font-bold bg-purple-50 px-5 py-4 rounded-xl border border-purple-100 shrink-0"><Clock className="w-5 h-5" /> Ушло куратору на оценку</motion.div>}
                                
                                {isExhausted && result !== 'SUCCESS' && (
                                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-3 bg-rose-50 p-5 rounded-2xl border border-rose-100 w-full mt-4 md:mt-0">
                                    <div className="flex items-center gap-2 text-rose-600 font-black text-sm uppercase tracking-wider">
                                      <XCircle className="w-5 h-5" /> Попытки закончились
                                    </div>
                                    <div className="text-base font-bold text-gray-800">
                                      Правильный ответ: <span className="text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 ml-1">
                                        {block.type === 'test' 
                                          ? block.options?.filter((o:any) => o.isCorrect).map((o:any) => o.text).join(' / ') 
                                          : block.correctAnswer}
                                      </span>
                                    </div>
                                    
                                    {block.explanation && (
                                      <div className="mt-2 pt-3 border-t border-rose-200/50 text-sm font-medium text-gray-700">
                                        <span className="font-black text-rose-600 mb-1 block">💡 Пояснение:</span>
                                        <div className="whitespace-pre-wrap leading-relaxed">{block.explanation}</div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-gray-400">
              <div className="max-w-xs"><BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" /><p className="font-black text-2xl mb-2">Урок не выбран</p></div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}