import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, PlayCircle, Loader2, BookOpen, CheckSquare, CheckCircle2, 
  XCircle, Type, PenTool, Clock, FileDown, Link2, ExternalLink, 
  Search, ChevronDown, ChevronRight, ListTodo, FileSignature
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔥 Ворд-редактор для ответа ученика
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // Если это файл из папки uploads, не добавляем /api
  if (url.startsWith('/uploads')) {
    return `https://prepodmgy.ru${url}`;
  }
  
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const studentQuillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ],
};

export default function CourseView() {
  const { courseId, themeId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [openedTasks, setOpenedTasks] = useState<Record<string, boolean>>({});
  
  // 🔥 ВОТ ОНИ: ДВА НЕЗАВИСИМЫХ СТЕЙТА
  const [areTestsRevealed, setAreTestsRevealed] = useState(false); // Для практики
  const [isHomeworkRevealed, setIsHomeworkRevealed] = useState(false); // Для ДЗ

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
            setExpandedThemes({ [targetTheme.id]: true }); 
          } else if (courseData.themes[0]?.lessons?.[0]) {
            setActiveLesson(courseData.themes[0].lessons[0]);
            setExpandedThemes({ [courseData.themes[0].id]: true }); 
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

  useEffect(() => {
    setOpenedTasks({});
    setAreTestsRevealed(false);
    setIsHomeworkRevealed(false); // 🔥 Закрываем и то, и другое при переключении урока
  }, [activeLesson?.id]);

  const toggleTheme = (tId: string) => {
    setExpandedThemes(prev => ({ ...prev, [tId]: !prev[tId] }));
  };

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
    if (!['written', 'homework'].includes(block.type) && currentAttempts >= maxAttempts) return; 

    const selected = testAnswers[block.id] || [];
    let isSuccess = false;
    let isPending = false;

    if (['written', 'homework'].includes(block.type)) {
      try {
        const questionWithImage = block.questionImage 
          ? `${block.question}|||IMG|||${block.questionImage}` 
          : block.question;

        await axios.post(`${API_URL}/submissions`, {
          lessonId: activeLesson.id,
          blockId: block.id,
          question: questionWithImage,
          answer: selected[0] || '',
          maxScore: block.maxScore || 10
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        
        isPending = true;
      } catch (err) {
        console.error('Ошибка отправки', err);
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
    
    if (!['written', 'homework'].includes(block.type) && isSuccess) {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/submissions`, {
          lessonId: activeLesson.id,
          blockId: block.id,
          question: block.question,
          answer: selected.join(', '),
          maxScore: block.maxScore || 100
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data && res.data.id) {
          await axios.patch(`${API_URL}/submissions/${res.data.id}/grade`, {
            score: block.maxScore || 100,
            comment: '🤖 Автоматическая проверка: Верно!'
          });
        }
      } catch (error) {
        console.error('Ошибка авто-проверки:', error);
      }
    }

    if (!['written', 'homework'].includes(block.type)) {
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

  const filteredThemes = course?.themes?.map((theme: any) => {
    const filteredLessons = theme.lessons?.filter((l: any) => 
      l.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...theme, lessons: filteredLessons };
  }).filter((theme: any) => theme.lessons && theme.lessons.length > 0);

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
  }

  // Разделяем блоки
  const theoryBlocks = blocks.filter(b => !['test', 'test_short'].includes(b.type) && !b.isHomework);
  const practiceBlocks = blocks.filter(b => ['test', 'test_short'].includes(b.type) && !b.isHomework);
  const homeworkBlocks = blocks.filter(b => b.isHomework);

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900">
      
      <style>{`
        .ql-editor { min-height: 120px; font-family: inherit; font-size: 16px; }
      `}</style>

      <aside className="w-[340px] bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-lg">
        <div className="p-5 border-b border-gray-100 bg-white">
          <button onClick={() => navigate(`/course/${courseId}`)} className="text-[11px] font-black tracking-wider text-gray-400 hover:text-[#5A4BFF] flex items-center gap-2 mb-4 transition-colors uppercase">
            <ArrowLeft className="w-4 h-4" /> Назад к модулям
          </button>
          <h2 className="text-xl font-black leading-tight text-gray-900 mb-4 line-clamp-2">{course.title}</h2>
          
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Поиск по урокам..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-[#5A4BFF]/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredThemes?.map((theme: any, tIdx: number) => {
            const isExpanded = expandedThemes[theme.id];
            
            return (
              <div key={theme.id} className="bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100">
                <button 
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-gray-100 transition-colors"
                >
                  <div className="text-left pr-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#5A4BFF] block mb-0.5">
                      Модуль {theme.order_index || tIdx + 1}
                    </span>
                    <span className="text-sm font-bold text-gray-800 line-clamp-1 break-words">{theme.title}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="px-2 pb-2 space-y-1"
                    >
                      {theme.lessons?.map((lesson: any) => {
                        const isActive = activeLesson?.id === lesson.id;
                        const isHw = lesson.is_homework;
                        return (
                          <button 
                            key={lesson.id} 
                            onClick={() => setActiveLesson(lesson)} 
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex gap-3 transition-all items-center ${isActive ? (isHw ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'bg-[#5A4BFF] text-white shadow-md shadow-[#5A4BFF]/20') : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'}`}
                          >
                            {isHw ? (
                              <FileSignature className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                            ) : (
                              <PlayCircle className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                            )}
                            <span className="leading-snug line-clamp-2 break-words w-full overflow-hidden">{lesson.title}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#F4F7FE] scroll-smooth">
        <AnimatePresence mode="wait">
          {activeLesson ? (
            <motion.div key={activeLesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-[1100px] mx-auto p-4 md:p-8 pb-32">
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                
                <div className="p-6 md:p-10 pb-6 border-b border-gray-50">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span> Урок и Теория
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight break-words w-full overflow-hidden">{activeLesson.title}</h1>
                </div>

                <div className="p-6 md:p-10 space-y-8">
                  {/* --- БЛОК 1: ТЕОРИЯ --- */}
                  {theoryBlocks.map((block) => {
                    if (block.type === 'video' && block.url) {
                      if (block.url.includes('disk.yandex.ru/')) {
                        return (
                          <div key={block.id} className="space-y-3">
                            {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
                            <div className="bg-orange-50 border border-orange-200 rounded-[1.5rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 border border-orange-100 shadow-sm">
                                  <PlayCircle className="w-6 h-6 text-orange-500" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-lg font-bold text-gray-900 truncate">Видео на Яндекс.Диске</h3>
                                  <p className="text-sm text-gray-600 truncate">Видео откроется в новой вкладке.</p>
                                </div>
                              </div>
                              <a href={block.url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-6 py-3 bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:border-orange-500 hover:text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                                Смотреть <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={block.id} className="space-y-3">
                          {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
                          <div className="aspect-video bg-gray-900 rounded-[1.5rem] overflow-hidden shadow-lg relative border border-gray-100">
                            <iframe src={getEmbedUrl(block.url)} className="w-full h-full absolute inset-0" allowFullScreen></iframe>
                          </div>
                        </div>
                      );
                    }

                    if (block.type === 'text' && block.content) return (
                      <div key={block.id} className="space-y-3 w-full overflow-hidden">
                        {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
                        {block.image && (
                          <div className="my-4">
                            <img src={block.image} alt="Материал" className="max-w-full rounded-2xl border border-gray-100 shadow-sm" />
                          </div>
                        )}
                        <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed break-words ql-editor px-0">
                          <div dangerouslySetInnerHTML={{ 
                            __html: block.content.includes('<') ? block.content : block.content.replace(/\n/g, '<br/>') 
                          }} />
                        </div>
                      </div>
                    );

                    if (block.type === 'file' && block.url) return (
                      <div key={block.id} className="bg-cyan-50/50 border border-cyan-100 rounded-[1.5rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-cyan-50">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0">
                            <FileDown className="w-6 h-6 text-cyan-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-black text-gray-900 leading-tight break-words">{block.title || 'Файл для скачивания'}</h3>
                            {block.content && <p className="text-xs font-medium text-gray-600 mt-1 break-words">{block.content}</p>}
                          </div>
                        </div>
                        <a href={getFullUrl(block.url)} target="_blank" rel="noopener noreferrer" download className="shrink-0 w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                          <FileDown className="w-4 h-4" /> СКАЧАТЬ
                        </a>
                      </div>
                    );
                    return null;
                  })}

                  {/* --- БЛОК 2: ПРАКТИКА --- */}
                  {practiceBlocks.length > 0 && (
                    <div className="mt-12 pt-10 border-t border-dashed border-gray-200">
                      {!areTestsRevealed ? (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8 text-center flex flex-col items-center">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                            <ListTodo className="w-8 h-8 text-indigo-600" />
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 mb-2">Практика к уроку</h3>
                          <p className="text-gray-600 mb-6">В этом уроке доступно {practiceBlocks.length} заданий для закрепления материала.</p>
                          <button 
                            onClick={() => setAreTestsRevealed(true)}
                            className="px-8 py-4 bg-[#5A4BFF] hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                          >
                            Показать задания
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                            <ListTodo className="w-6 h-6 text-[#5A4BFF]" /> Практическая часть
                          </h3>
                          
                          {practiceBlocks.map(block => {
                            const selected = testAnswers[block.id] || [];
                            const result = testResults[block.id];
                            const currentAttempts = attemptsUsed[block.id] || 0;
                            const maxAttempts = block.maxAttempts || 3;
                            const attemptsLeft = maxAttempts - currentAttempts;
                            const isExhausted = attemptsLeft <= 0;
                            const isLocked = isExhausted || result === 'SUCCESS';
                            
                            let badgeText = block.title || 'Практика';
                            let badgeColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                            let icon = <CheckSquare className="w-5 h-5 text-indigo-600"/>;
                            
                            if (block.type === 'test_short') {
                              badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                              icon = <Type className="w-5 h-5 text-amber-600"/>;
                            }

                            const isTaskOpen = openedTasks[block.id];

                            if (!isTaskOpen) {
                              return (
                                <div key={block.id} className={`border-2 border-dashed rounded-[1.5rem] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all bg-white hover:bg-gray-50 ${badgeColor.replace('bg-', 'hover:border-').split(' ')[0]}`}>
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${badgeColor}`}>
                                      {icon}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-gray-900 text-lg break-words">{badgeText}</h4>
                                      <p className="text-sm text-gray-500 line-clamp-1 break-words">{block.question ? block.question.replace(/<[^>]*>?/gm, '') : ''}</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setOpenedTasks(prev => ({...prev, [block.id]: true}))} 
                                    className={`shrink-0 px-6 py-3 font-bold rounded-xl transition-all shadow-sm active:scale-95 ${result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-900 hover:bg-black text-white'}`}
                                  >
                                    {result === 'SUCCESS' ? 'Выполнено' : 'Приступить'}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div key={block.id} className={`bg-[#F8FAFC] rounded-[2rem] p-6 md:p-8 border-2 transition-colors relative ${isExhausted && result !== 'SUCCESS' ? 'border-rose-200' : 'border-gray-100'}`}>
                                <button onClick={() => setOpenedTasks(prev => ({...prev, [block.id]: false}))} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm z-10">
                                  <ChevronUpIcon className="w-5 h-5" />
                                </button>

                                <div className="flex flex-wrap items-center gap-3 mb-6 pr-10">
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${badgeColor} border-none`}>{badgeText}</div>
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${isExhausted ? 'bg-rose-100 text-rose-600' : 'bg-gray-200 text-gray-600'}`}>
                                    Попыток: {attemptsLeft} из {maxAttempts}
                                  </div>
                                </div>

                                <div className="text-xl md:text-2xl font-black mb-6 leading-snug text-gray-800 break-words w-full overflow-hidden ql-editor px-0" dangerouslySetInnerHTML={{ __html: block.question?.includes('<') ? block.question : block.question?.replace(/\n/g, '<br/>') }} />
                                
                                {block.questionImage && <img src={block.questionImage} alt="Схема" className="mb-6 max-w-full max-h-[400px] rounded-xl border border-gray-200 shadow-sm" />}
                                
                                {block.type === 'test' && (
                                  <div className="space-y-3 mb-6">
                                    {block.options?.map((opt: any, idx: number) => {
                                      const isChecked = selected.includes(opt.text);
                                      return (
                                        <label key={idx} className={`flex items-center gap-4 p-4 md:p-5 rounded-xl border-2 transition-all bg-white ${isChecked ? 'border-[#5A4BFF] shadow-sm' : 'border-gray-100 hover:border-gray-200'} ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                          <input type="checkbox" className="hidden" checked={isChecked} disabled={isLocked} onChange={() => handleAnswerToggle(block.id, opt.text)} />
                                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[#5A4BFF] border-[#5A4BFF]' : 'border-gray-300'} ${isLocked && !isChecked ? 'bg-gray-100' : ''}`}>
                                            {isChecked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                          </div>
                                          <span className={`text-base font-bold break-words ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>{opt.text}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}

                                {block.type === 'test_short' && (
                                  <div className="mb-6">
                                    <input 
                                      type="text" 
                                      value={selected[0] || ''} 
                                      onChange={(e) => handleTextAnswerChange(block.id, e.target.value)} 
                                      disabled={isLocked}
                                      placeholder="Введите ваш ответ..." 
                                      className={`w-full p-5 text-lg font-bold rounded-xl border-2 outline-none transition-all ${isLocked ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:border-[#5A4BFF] focus:shadow-sm text-gray-900'}`}
                                    />
                                  </div>
                                )}

                                <div className="flex flex-col items-start gap-4 pt-6 border-t border-gray-200">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                                    <button 
                                      onClick={() => handleSubmitTest(block)} 
                                      disabled={selected.length === 0 || selected[0] === '' || isLocked} 
                                      className={`w-full sm:w-auto shrink-0 px-8 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 ${isExhausted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#5A4BFF] hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                                    >
                                      {isExhausted ? 'ЛИМИТ ИСЧЕРПАН' : 'ОТВЕТИТЬ'}
                                    </button>
                                    
                                    <AnimatePresence>
                                      {result === 'SUCCESS' && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-3 rounded-lg shrink-0"><CheckCircle2 className="w-5 h-5" /> Верно</motion.div>}
                                      {result === 'ERROR' && !isExhausted && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 px-4 py-3 rounded-lg shrink-0"><XCircle className="w-5 h-5" /> Неверно</motion.div>}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🔥 БЛОК 3: ДОМАШНЕЕ ЗАДАНИЕ (ЗАКРЫТОЕ ПО УМОЛЧАНИЮ) */}
                  {homeworkBlocks.length > 0 && (
                    <div className="mt-12 pt-10 border-t-4 border-dashed border-purple-200">
                      
                      {/* ВСЕГДА ВИДИМАЯ ПЛАШКА ЗАДАНИЯ */}
                      <div className="bg-purple-600 p-6 md:p-8 rounded-[2rem] shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-400 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
                        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
                          <div className="hidden md:flex w-16 h-16 bg-white/10 rounded-2xl items-center justify-center border border-white/20 shrink-0">
                            <FileSignature className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-black text-white leading-tight break-words">Домашнее задание</h3>
                            <p className="text-purple-200 font-medium text-sm mt-1">Ожидает вашего выполнения</p>
                          </div>
                        </div>
                        
                        {/* 🔥 ЗДЕСЬ БЫЛА ОШИБКА: теперь используем правильный стейт isHomeworkRevealed */}
                        <button 
                          onClick={() => setIsHomeworkRevealed(!isHomeworkRevealed)}
                          className="w-full md:w-auto shrink-0 px-8 py-4 bg-white text-purple-700 hover:bg-purple-50 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 relative z-10"
                        >
                          {isHomeworkRevealed ? 'Скрыть задание' : 'Показать задание'}
                          <motion.span animate={{ rotate: isHomeworkRevealed ? 180 : 0 }} className="flex items-center justify-center">
                            <ChevronDownIcon className="w-4 h-4" />
                          </motion.span>
                        </button>
                      </div>

                      {/* СКРЫТЫЙ КОНТЕНТ ДОМАШНЕГО ЗАДАНИЯ */}
                      <AnimatePresence>
                        {isHomeworkRevealed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 32 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden space-y-8"
                          >
                            {homeworkBlocks.map(block => {
                              const selected = testAnswers[block.id] || [];
                              const result = testResults[block.id];
                              const isLocked = result === 'SUCCESS' || result === 'PENDING';
                              
                              return (
                                <div key={block.id} className="bg-white rounded-[2rem] border-2 border-purple-100 shadow-sm overflow-hidden p-6 md:p-8 relative">
                                  
                                  <div className="flex flex-wrap items-center gap-3 mb-6 pr-10">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700">
                                      {block.title || 'Задание ДЗ'}
                                    </div>
                                    {['written', 'homework'].includes(block.type) && (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                        Макс. балл: {block.maxScore || 10}
                                      </div>
                                    )}
                                  </div>

                                  {/* Если это обычное видео/текст/картинка внутри ДЗ */}
                                  {block.type === 'video' && block.url && (
                                    <div className="aspect-video bg-gray-900 rounded-[1.5rem] overflow-hidden shadow-lg relative border border-gray-100 mb-6">
                                      <iframe src={getEmbedUrl(block.url)} className="w-full h-full absolute inset-0" allowFullScreen></iframe>
                                    </div>
                                  )}

                                  {block.type === 'text' && block.content && (
                                    <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed break-words ql-editor px-0 mb-6">
                                      <div dangerouslySetInnerHTML={{ __html: block.content.includes('<') ? block.content : block.content.replace(/\n/g, '<br/>') }} />
                                    </div>
                                  )}

                                  {block.type === 'image' && block.url && (
                                  <img 
                                    src={getFullUrl(block.url)} 
                                    alt="Материал" 
                                    className="max-w-full rounded-2xl border border-gray-100 shadow-sm" 
                                    />
                                  )}

                                  {/* Вопрос (Для тестов и эссе) */}
                                  {['test', 'test_short', 'written', 'homework'].includes(block.type) && (
                                    <div className="text-xl md:text-2xl font-black mb-6 leading-snug text-gray-800 break-words w-full overflow-hidden ql-editor px-0" dangerouslySetInnerHTML={{ __html: block.question?.includes('<') ? block.question : block.question?.replace(/\n/g, '<br/>') }} />
                                  )}
                                  
                                  {block.questionImage && <img src={block.questionImage} alt="Схема" className="mb-6 max-w-full max-h-[400px] rounded-xl border border-gray-200 shadow-sm" />}
                                  
                                  {/* Варианты ответов для тестов внутри ДЗ */}
                                  {block.type === 'test' && (
                                    <div className="space-y-3 mb-6">
                                      {block.options?.map((opt: any, idx: number) => {
                                        const isChecked = selected.includes(opt.text);
                                        return (
                                          <label key={idx} className={`flex items-center gap-4 p-4 md:p-5 rounded-xl border-2 transition-all bg-white ${isChecked ? 'border-purple-500 shadow-sm' : 'border-gray-100 hover:border-gray-200'} ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <input type="checkbox" className="hidden" checked={isChecked} disabled={isLocked} onChange={() => handleAnswerToggle(block.id, opt.text)} />
                                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-purple-500 border-purple-500' : 'border-gray-300'} ${isLocked && !isChecked ? 'bg-gray-100' : ''}`}>
                                              {isChecked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className={`text-base font-bold break-words ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>{opt.text}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* ВОРД-РЕДАКТОР ДЛЯ ОТВЕТА УЧЕНИКА (written / homework) */}
                                  {['written', 'homework'].includes(block.type) && (
                                    <div className="mb-6">
                                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3 block">Ваш развернутый ответ:</label>
                                      <div className={`rounded-xl border-2 overflow-hidden transition-all bg-white ${isLocked ? 'border-gray-200 opacity-70 pointer-events-none' : 'border-purple-200 focus-within:border-purple-500 focus-within:shadow-md'}`}>
                                        <ReactQuill 
                                          theme="snow"
                                          modules={studentQuillModules}
                                          value={selected[0] || ''} 
                                          onChange={(val) => handleTextAnswerChange(block.id, val)} 
                                          readOnly={isLocked}
                                          placeholder="Напишите подробный ответ..." 
                                          className="min-h-[120px]"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Кнопка отправки ответа */}
                                  {['test', 'test_short', 'written', 'homework'].includes(block.type) && (
                                    <div className="flex flex-col items-start gap-4 pt-6 border-t border-purple-50">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                                        <button 
                                          onClick={() => handleSubmitTest(block)} 
                                          disabled={selected.length === 0 || selected[0] === '' || selected[0] === '<p><br></p>' || isLocked} 
                                          className="w-full sm:w-auto shrink-0 px-8 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                                        >
                                          {result === 'PENDING' ? 'ОТПРАВЛЕНО НА ПРОВЕРКУ' : 'СДАТЬ ОТВЕТ'}
                                        </button>
                                        
                                        <AnimatePresence>
                                          {result === 'SUCCESS' && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-3 rounded-lg shrink-0"><CheckCircle2 className="w-5 h-5" /> Верно</motion.div>}
                                          {result === 'PENDING' && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-purple-600 font-bold bg-purple-50 px-4 py-3 rounded-lg border border-purple-100 shrink-0"><Clock className="w-5 h-5" /> Ушло куратору</motion.div>}
                                        </AnimatePresence>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-gray-400">
              <div className="max-w-xs"><BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" /><p className="font-black text-xl mb-1">Урок не выбран</p></div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ChevronUpIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m18 15-6-6-6 6"/>
    </svg>
  );
}

function ChevronDownIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 9l6 6 6-6"/>
    </svg>
  );
}