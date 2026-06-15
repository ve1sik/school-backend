import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, LogOut, Lock, ArrowRight, Loader2, User,
  TrendingUp, Flame, BookOpen, CheckSquare,
  AlertTriangle, Star, RefreshCw, PenTool, Mic, Send, Copy
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [isLinked, setIsLinked] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [data, setData] = useState<any>(null);
  const [telegram, setTelegram] = useState<any>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const res = await axios.get(`${API_URL}/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data || {};
      setData(d);
      setIsLinked(d.isLinked !== false);
      try {
        const tgRes = await axios.get(`${API_URL}/telegram/link-code`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTelegram(tgRes.data);
      } catch { /* silent */ }
    } catch { /* silent */ }
    finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setCodeError('');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/auth/link-student`, { invite_code: code.trim().toUpperCase() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch {
      setCodeError('Неверный код. Попросите ребёнка проверить код в разделе «Мой профиль».');
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };
  const copyTelegramCode = () => {
    if (!telegram?.code) return;
    navigator.clipboard.writeText(telegram.code);
  };

  const scoreColor = (s: number) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#F4F7FE]">
      <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans text-gray-900 flex flex-col">

      {/* HEADER */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 md:px-10 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-[#00FFCC]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight">Препод из МГУ</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Портал для родителей</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isLinked && (
            <button onClick={() => fetchData(true)} disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold transition-colors">
            <LogOut className="w-5 h-5" /> Выйти
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <AnimatePresence mode="wait">

          {/* ── ЭКРАН ВХОДА ПО КОДУ ── */}
          {!isLinked ? (
            <motion.div key="auth" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 max-w-lg w-full">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-8 mx-auto border-8 border-white">
                  <Lock className="w-8 h-8 text-[#5A4BFF]" />
                </div>
                <h2 className="text-3xl font-black text-center mb-3">Код доступа</h2>
                <p className="text-center text-gray-500 font-medium mb-8">
                  Введите уникальный код вашего ребёнка. Он отображается в разделе «Мой профиль» → «Для родителей».
                </p>
                <form onSubmit={handleLinkStudent} className="space-y-4">
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="КОД ИЗ ПРОФИЛЯ"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-center text-xl font-black tracking-[0.3em] outline-none uppercase focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all" />
                  {codeError && <p className="text-sm font-bold text-rose-500 text-center">{codeError}</p>}
                  <button type="submit" disabled={isSubmitting || !code.trim()}
                    className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Подключить <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </form>
              </div>
            </motion.div>

          ) : (
            /* ── ДАШБОРД ── */
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto space-y-6">

              {/* ШАПКА УЧЕНИКА */}
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#5A4BFF] to-[#00FFCC] rounded-[1.5rem] p-0.5 shrink-0">
                  <div className="w-full h-full bg-white rounded-[1.3rem] flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-700" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Активно обучается
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">{data?.studentName || 'Ученик'}</h2>
                  <p className="text-gray-500 font-medium mt-1">Аналитика успеваемости</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-5 py-3 bg-orange-50 rounded-2xl">
                    <div className="flex items-center gap-1 justify-center mb-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="font-black text-orange-600">{data?.streakDays ?? 0}</span>
                    </div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Стрик</span>
                  </div>
                  <div className="text-center px-5 py-3 bg-indigo-50 rounded-2xl">
                    <div className="flex items-center gap-1 justify-center mb-1">
                      <Star className="w-4 h-4 text-indigo-500" />
                      <span className="font-black text-indigo-600">{data?.averageScore ?? 0}</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Средний балл</span>
                  </div>
                  <div className="text-center px-5 py-3 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-1 justify-center mb-1">
                      <BookOpen className="w-4 h-4 text-gray-500" />
                      <span className="font-black text-gray-700">{data?.totalTests ?? 0}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Заданий</span>
                  </div>
                </div>
              </div>

              <div className="bg-sky-50 rounded-[2.5rem] p-6 md:p-8 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-2">Telegram бот для родителя</p>
                  <h3 className="text-2xl font-black text-sky-950 mb-1">Уведомления и статистика в Telegram</h3>
                  <p className="text-sm font-bold text-sky-700">Отправьте этот код боту, и он покажет статистику привязанного ребёнка.</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-sky-100 min-w-[260px]">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Код</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-black tracking-[0.18em] text-gray-900">{telegram?.code || '...'}</p>
                    <button onClick={copyTelegramCode} className="p-2 bg-sky-100 hover:bg-sky-200 rounded-xl text-sky-700">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <a href={telegram?.botUrl || 'https://t.me/prepodmgybot'} target="_blank" rel="noreferrer" className="mt-3 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Открыть бота
                  </a>
                </div>
              </div>

              {/* ── ЦИФРЫ ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: TrendingUp, label: 'Средний балл', val: `${data?.averageScore ?? 0} / 100`, iconColor: 'text-[#00FFCC]', bg: 'bg-gray-900', textColor: 'text-white', subColor: 'text-gray-400' },
                  { icon: Flame, label: 'Стрик', val: `${data?.streakDays ?? 0} дн.`, iconColor: 'text-orange-500', bg: 'bg-orange-50', textColor: 'text-orange-700', subColor: 'text-orange-400' },
                  { icon: BookOpen, label: 'Всего заданий', val: `${data?.totalTests ?? 0}`, iconColor: 'text-indigo-500', bg: 'bg-indigo-50', textColor: 'text-indigo-700', subColor: 'text-indigo-400' },
                  { icon: Star, label: 'Оценено работ', val: `${data?.gradedCount ?? 0}`, iconColor: 'text-emerald-500', bg: 'bg-emerald-50', textColor: 'text-emerald-700', subColor: 'text-emerald-400' },
                ].map(({ icon: Icon, label, val, iconColor, bg, textColor, subColor }) => (
                  <div key={label} className={`${bg} rounded-[2rem] p-6`}>
                    <Icon className={`w-6 h-6 ${iconColor} mb-3`} />
                    <p className={`text-2xl font-black ${textColor} leading-tight`}>{val}</p>
                    <p className={`text-xs font-bold ${subColor} uppercase tracking-widest mt-1`}>{label}</p>
                  </div>
                ))}
              </div>

              {/* ── ТИПЫ ЗАДАНИЙ ── */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-6">📊 Успеваемость по типам заданий</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: CheckSquare, label: 'Тесты', val: data?.breakdown?.tests ?? 0, color: '#5A4BFF', bg: 'bg-indigo-50', textColor: 'text-indigo-700' },
                    { icon: PenTool, label: 'Письменные', val: data?.breakdown?.written ?? 0, color: '#f97316', bg: 'bg-orange-50', textColor: 'text-orange-700' },
                    { icon: Mic, label: 'Устные', val: data?.breakdown?.oral ?? 0, color: '#10b981', bg: 'bg-emerald-50', textColor: 'text-emerald-700' },
                  ].map(({ icon: Icon, label, val, color, bg, textColor }) => (
                    <div key={label} className={`${bg} rounded-2xl p-5 flex items-center gap-4`}>
                      <Icon className="w-8 h-8 shrink-0" style={{ color }} />
                      <div className="flex-1">
                        <p className={`text-2xl font-black ${textColor}`}>{val}<span className="text-sm font-bold opacity-50"> / 100</span></p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">{label}</p>
                        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── АКТИВНОСТЬ ── */}
              {data?.activityData?.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6">📅 Активность по дням</h3>
                  <div className="flex items-end gap-3">
                    {data.activityData.map((d: any, i: number) => {
                      const maxCount = Math.max(...data.activityData.map((x: any) => x.count || 0), 1);
                      const pct = Math.round(((d.count || 0) / maxCount) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-black text-gray-500">{d.count || 0}</span>
                          <div className="w-full bg-gray-100 rounded-lg overflow-hidden" style={{ height: 80 }}>
                            <div className="w-full bg-[#5A4BFF] rounded-lg transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{d.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ПРОГРЕСС ПО ТЕМАМ */}
              {data?.modules?.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6">📚 Успеваемость по темам</h3>
                  <div className="space-y-3">
                    {data.modules.map((m: any) => {
                      const c = scoreColor(m.averageScore);
                      const emoji = m.averageScore >= 70 ? '✅' : m.averageScore >= 50 ? '🟡' : '🔴';
                      return (
                        <div key={m.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <span className="text-xl shrink-0">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{m.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${m.averageScore}%`, backgroundColor: c }} />
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-base" style={{ color: c }}>{m.averageScore} / 100</p>
                            <p className="text-xs text-gray-400">{m.totalTests} зад.</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* СЛАБЫЕ ТЕМЫ */}
              {data?.weakestTheme && (
                <div className="bg-amber-50 border border-amber-200 rounded-[2.5rem] p-8 flex items-center gap-6">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Требует внимания</p>
                    <h4 className="text-xl font-black text-amber-900">{data.weakestTheme.title}</h4>
                    <p className="text-amber-700 font-medium mt-1">
                      Средний балл по теме: <strong>{data.weakestTheme.score}%</strong>. Рекомендуем уделить дополнительное время.
                    </p>
                  </div>
                </div>
              )}


            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
