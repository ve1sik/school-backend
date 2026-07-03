import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  QuestionBlock,
  OptionText,
  getOptionLetter,
  getOptionLetterClass,
  LESSON_TEST_STYLES,
} from '../components/LessonTestUI';

type RonTask = {
  id: string;
  lessonId: string;
  blockId: string;
  courseId?: string;
  themeId?: string;
  courseTitle?: string;
  themeTitle?: string;
  lessonTitle?: string;
  blockTitle?: string;
  block: any;
};

export default function RonWork({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<RonTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/ron/tasks');
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) || null,
    [tasks, activeTaskId],
  );

  const activeAnswers = activeTask ? answers[activeTask.id] || [] : [];

  const toggleAnswer = (text: string) => {
    if (!activeTask) return;
    setFeedback(null);
    const current = answers[activeTask.id] || [];
    const updated = current.includes(text)
      ? current.filter((v) => v !== text)
      : [...current, text];
    setAnswers((prev) => ({ ...prev, [activeTask.id]: updated }));
  };

  const setTextAnswer = (text: string) => {
    if (!activeTask) return;
    setFeedback(null);
    setAnswers((prev) => ({ ...prev, [activeTask.id]: [text] }));
  };

  const setMatchingAnswer = (left: string, right: string) => {
    if (!activeTask) return;
    setFeedback(null);
    const current = [...(answers[activeTask.id] || [])].filter((s) => !s.startsWith(`${left}|||`));
    current.push(`${left}|||${right}`);
    setAnswers((prev) => ({ ...prev, [activeTask.id]: current }));
  };

  const submitTask = async () => {
    if (!activeTask) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post(`/ron/tasks/${activeTask.id}/answer`, {
        selected: answers[activeTask.id] || [],
      });
      if (res.data?.correct) {
        setFeedback({ type: 'ok', text: res.data.message || 'Верно! Задание убрано из РОН.' });
        setTasks((prev) => prev.filter((t) => t.id !== activeTask.id));
        setActiveTaskId(null);
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[activeTask.id];
          return next;
        });
      } else {
        setFeedback({ type: 'err', text: res.data?.message || 'Пока неверно. Попробуй ещё раз.' });
      }
    } catch {
      setFeedback({ type: 'err', text: 'Не удалось проверить ответ.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLesson = (task: RonTask) => {
    if (task.courseId && task.themeId) {
      navigate(`/course/${task.courseId}/theme/${task.themeId}`);
      return;
    }
    if (task.lessonId) navigate(`/homework/${task.lessonId}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  return (
    <div className={`${embedded ? '' : 'p-4 md:p-8 lg:p-10'} bg-[#F4F7FE] min-h-full`}>
      <style>{LESSON_TEST_STYLES}</style>

      <div className="max-w-5xl mx-auto space-y-6">
        {!embedded && (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 md:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-black uppercase tracking-widest mb-4">
            <RotateCcw className="w-4 h-4" /> РОН
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Работа над ошибками</h1>
          <p className="text-gray-500 font-medium">
            Здесь задания, где ты ошибся в тестах с автопроверкой. Исправь ответ — задание исчезнет из списка. Баллы за эти задания не начисляются.
          </p>
        </div>
        )}

        {tasks.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-emerald-100 p-10 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Всё чисто</h2>
            <p className="text-gray-500 font-medium">Нет заданий для повторения. Ошибёшься в тесте — оно появится здесь.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[320px,1fr] gap-6">
            <div className="space-y-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => { setActiveTaskId(task.id); setFeedback(null); }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    activeTaskId === task.id
                      ? 'border-[#5A4BFF] bg-indigo-50/60 shadow-md'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    {task.courseTitle || 'Курс'}{task.themeTitle ? ` · ${task.themeTitle}` : ''}
                  </p>
                  <p className="font-black text-gray-900 truncate">{task.blockTitle || 'Задание'}</p>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{task.lessonTitle}</p>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 md:p-8 shadow-sm min-h-[420px]">
              {!activeTask ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 font-bold">
                  <AlertCircle className="w-10 h-10 mb-3" />
                  Выбери задание слева
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={activeTask.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          {activeTask.lessonTitle}
                        </p>
                        <h2 className="text-xl font-black text-gray-900">{activeTask.blockTitle || 'Задание'}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => openLesson(activeTask)}
                        className="text-xs font-black text-[#5A4BFF] hover:underline shrink-0"
                      >
                        К уроку
                      </button>
                    </div>

                    <QuestionBlock content={activeTask.block?.question || ''} mode="quill" />

                    {activeTask.block?.type === 'test' && (
                      <div className="space-y-3 mt-6">
                        {(activeTask.block.options || []).map((opt: any, idx: number) => {
                          const selected = activeAnswers.includes(opt.text);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleAnswer(opt.text)}
                              className={`w-full text-left p-4 rounded-2xl border-2 flex items-start gap-3 transition-all ${
                                selected ? 'border-[#5A4BFF] bg-indigo-50/50' : 'border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <span className={getOptionLetterClass(selected)}>{getOptionLetter(idx)}</span>
                              <OptionText text={opt.text} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activeTask.block?.type === 'test_short' && (
                      <input
                        type="text"
                        value={activeAnswers[0] || ''}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        className="mt-6 w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#5A4BFF] outline-none font-bold"
                        placeholder="Введите ответ"
                      />
                    )}

                    {activeTask.block?.type === 'matching' && (
                      <div className="space-y-4 mt-6">
                        {(activeTask.block.pairs || []).map((pair: any, idx: number) => {
                          const current = activeAnswers.find((s) => s.startsWith(`${pair.left}|||`));
                          const currentRight = current ? current.split('|||')[1] : '';
                          return (
                            <div key={idx} className="grid md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
                              <div className="p-3 rounded-xl bg-gray-50 font-bold text-sm">{pair.left}</div>
                              <ChevronRight className="w-4 h-4 text-gray-300 mx-auto hidden md:block" />
                              <select
                                value={currentRight}
                                onChange={(e) => setMatchingAnswer(pair.left, e.target.value)}
                                className="p-3 rounded-xl border-2 border-gray-100 font-bold text-sm outline-none focus:border-[#5A4BFF]"
                              >
                                <option value="">Выберите...</option>
                                {(activeTask.block.pairs || []).map((p: any, i: number) => (
                                  <option key={i} value={p.right}>{p.right}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {feedback && (
                      <div className={`mt-5 p-4 rounded-2xl font-bold flex items-center gap-2 ${
                        feedback.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {feedback.type === 'ok' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        {feedback.text}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={submitTask}
                      className="mt-6 w-full py-4 rounded-2xl bg-[#5A4BFF] hover:bg-[#4a3dec] text-white font-black transition-all disabled:opacity-60"
                    >
                      {isSubmitting ? 'Проверяем...' : 'Проверить ответ'}
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
