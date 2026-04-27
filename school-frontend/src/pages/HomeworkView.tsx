import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, CheckCircle2, Clock, PenTool } from 'lucide-react';

const API_URL = 'http://85.193.89.154:3000';

export default function HomeworkView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homework, setHomework] = useState<any>(null);
  
  const [answerText, setAnswerText] = useState('');
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    const fetchHomeworkAndSubmission = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        // 1. Ищем урок
        const coursesRes = await axios.get(`${API_URL}/courses`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        let foundLesson = null;
        coursesRes.data.forEach((course: any) => {
          course.themes?.forEach((theme: any) => {
            theme.lessons?.forEach((lesson: any) => {
              if (lesson.id === id) {
                foundLesson = lesson;
              }
            });
          });
        });

        if (foundLesson) {
          setHomework(foundLesson);
        }

        // 2. Ищем сдачу
        try {
          const subRes = await axios.get(`${API_URL}/submissions/lesson/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (subRes.data) setSubmission(subRes.data);
        } catch (err) {
          try {
            const allSubs = await axios.get(`${API_URL}/submissions`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const mySub = allSubs.data.find((s: any) => s.lessonId === id || s.lesson?.id === id || s.lesson_id === id);
            if (mySub) setSubmission(mySub);
          } catch (e) {
            console.log('Эндпоинты сдач пока недоступны');
          }
        }

      } catch (error) {
        console.error('Ошибка загрузки задания:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeworkAndSubmission();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!answerText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/submissions`, {
        lessonId: id,
        content: answerText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmission(res.data);
    } catch (error) {
      console.error('Ошибка при отправке', error);
      alert('Произошла ошибка при отправке задания.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-12 h-12 animate-spin text-[#A855F7]" />
      </div>
    );
  }

  if (!homework) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Задание не найдено</h2>
        <button onClick={() => navigate(-1)} className="text-[#A855F7] font-bold hover:underline">Вернуться назад</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* ЛЕВЫЙ САЙДБАР */}
      <div className="w-full md:w-80 bg-white border-r border-gray-100 p-6 flex flex-col shrink-0">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm tracking-wide transition-colors mb-8 uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> К списку заданий
        </button>

        <h2 className="text-2xl font-black text-gray-900 mb-6">{homework.theme?.title || 'Тема'}</h2>
        
        <div className="space-y-2">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">Текущее задание</div>
          <div className="bg-[#A855F7] text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-purple-500/20">
            <PenTool className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm line-clamp-2">{homework.title}</span>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ (КОНТЕНТ) */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
            
            <div className="inline-flex items-center gap-2 bg-[#F3E8FF] px-4 py-2 rounded-xl mb-6">
              <div className="w-2 h-2 rounded-full bg-[#A855F7]"></div>
              <span className="text-xs font-black text-[#A855F7] uppercase tracking-widest">Решение задания</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-10 tracking-tight">
              {homework.title}
            </h1>

            <div className="bg-[#F8FAFC] rounded-[2rem] border border-gray-100 p-6 md:p-8">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="inline-flex items-center gap-2 bg-[#F3E8FF] px-3 py-1.5 rounded-lg">
                  <PenTool className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span className="text-[10px] font-black text-[#A855F7] uppercase tracking-widest">Тест с развернутым ответом</span>
                </div>
                <div className="bg-gray-200/50 px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Макс. балл: {homework.max_score || 100}
                </div>
              </div>

              {/* 🔥 УМНЫЙ РЕНДЕР КОНТЕНТА (Без кракозябр) */}
              <div className="mb-8 space-y-4">
                {(() => {
                  if (!homework.content) return <h3 className="text-xl font-black text-gray-900">Опишите ваше решение подробно.</h3>;
                  try {
                    const blocks = JSON.parse(homework.content);
                    if (Array.isArray(blocks)) {
                      return blocks.map((block: any, idx: number) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                          {block.title && <div className="text-[10px] font-black text-[#A855F7] uppercase tracking-widest mb-2">{block.title}</div>}
                          {block.question && <div className="text-xl font-bold text-gray-800 leading-snug">{block.question}</div>}
                        </div>
                      ));
                    }
                  } catch (e) {
                    // Если это не JSON, выводим как обычный текст
                  }
                  return <h3 className="text-xl font-black text-gray-900">{homework.content}</h3>;
                })()}
              </div>

              {/* 🔥 ЛОГИКА ОТОБРАЖЕНИЯ: ФОРМА ИЛИ ОЦЕНКА */}
              {!submission ? (
                /* ФОРМА ДЛЯ ОТВЕТА (Которую ты случайно стер) */
                <div className="space-y-4">
                  <textarea 
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Напишите развернутый ответ или вставьте ссылку на работу..."
                    className="w-full min-h-[200px] p-6 bg-white border border-gray-200 rounded-3xl outline-none focus:border-[#A855F7] focus:ring-4 focus:ring-[#A855F7]/10 transition-all resize-y text-gray-700"
                  ></textarea>
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !answerText.trim()}
                    className="bg-[#C084FC] hover:bg-[#A855F7] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-2xl transition-all shadow-lg shadow-purple-500/20 w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сдать на проверку'}
                  </button>
                </div>

              ) : submission.status === 'GRADED' ? (
                /* ПРОВЕРЕНО КУРАТОРОМ */
                <div className="bg-white border border-emerald-100 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="bg-emerald-100 p-3 rounded-2xl shrink-0">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 mb-1">Работа проверена!</h4>
                      <p className="text-gray-500 text-sm font-medium mb-6">Куратор проверил ваше задание и выставил оценку.</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-2xl">
                          <span className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Ваш балл</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-emerald-600 tracking-tighter">{submission.score}</span>
                            <span className="text-lg font-bold text-emerald-600/50">/{submission.max_score || homework.max_score || 100}</span>
                          </div>
                        </div>
                      </div>

                      {submission.comment && (
                        <div className="mt-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Комментарий куратора</span>
                          <p className="text-gray-700 font-medium leading-relaxed">{submission.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              ) : (
                /* ОЖИДАЕТ ПРОВЕРКИ */
                <div className="bg-white border border-amber-100 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="bg-amber-100 p-3 rounded-2xl shrink-0">
                      <Clock className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 mb-1">Ожидает проверки</h4>
                      <p className="text-gray-500 text-sm font-medium mb-6">Ваша работа успешно отправлена. Как только куратор её проверит, здесь появится оценка.</p>
                      
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ваш ответ</span>
                        {/* Выводим ответ студента */}
                        <p className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{submission.answer || submission.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}