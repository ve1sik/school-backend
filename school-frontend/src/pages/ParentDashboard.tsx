import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, LogOut, Lock, ArrowRight, Loader2, User,
  TrendingUp, Flame, BookOpen, CheckSquare, Edit3, BrainCircuit,
  AlertTriangle, Star, BarChart2, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ИТОГОВЫЙ БАЛЛ */}
                <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-xl text-white flex flex-col relative overflow-hidden">
                  <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                  <TrendingUp className="w-7 h-7 text-[#00FFCC] mb-6" />
                  <p className="text-gray-400 font-bold mb-2">Итоговый балл</p>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-6xl font-black" style={{ color: scoreColor(data?.averageScore ?? 0) }}>
                      {data?.averageScore ?? 0}
                    </span>
                    <span className="text-2xl text-gray-500 mb-2">/100</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-auto">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${data?.averageScore ?? 0}%` }} transition={{ duration: 1, delay: 0.3 }}
                      className="h-full rounded-full" style={{ backgroundColor: scoreColor(data?.averageScore ?? 0) }} />
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-3">
                    {(data?.averageScore ?? 0) >= 80 ? 'Отличный результат! 🏆' : (data?.averageScore ?? 0) >= 60 ? 'Хороший прогресс 📈' : 'Требует внимания ⚠️'}
                  </p>
                </div>

                {/* ГРАФИК ПРОГРЕССА */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xl font-black text-gray-900">Прогресс за 7 дней</h3>
                  </div>
                  {data?.progressData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={data.progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontWeight: 700 }}
                          formatter={(v: any) => [`${v} баллов`, 'Средний балл']}
                        />
                        <Line type="monotone" dataKey="score" stroke="#5A4BFF" strokeWidth={3} dot={{ fill: '#5A4BFF', r: 5 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-gray-300">
                      <p className="font-bold">Пока нет данных</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ДЕТАЛИЗАЦИЯ + АКТИВНОСТЬ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ДЕТАЛИЗАЦИЯ ПО ТИПАМ */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6">Детализация успеваемости</h3>
                  <div className="space-y-5">
                    {[
                      { icon: CheckSquare, label: 'Авто-тесты', val: data?.breakdown?.tests ?? 0, color: '#5A4BFF', bg: 'bg-indigo-50' },
                      { icon: Edit3, label: 'Письменные задания', val: data?.breakdown?.written ?? 0, color: '#f97316', bg: 'bg-orange-50' },
                      { icon: Star, label: 'Устные опросы', val: data?.breakdown?.oral ?? 0, color: '#10b981', bg: 'bg-emerald-50' },
                    ].map(({ icon: Icon, label, val, color, bg }) => (
                      <div key={label} className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center shrink-0`}>
                          <Icon className="w-6 h-6" style={{ color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1.5">
                            <span className="font-bold text-gray-700 text-sm">{label}</span>
                            <span className="font-black text-sm">{val}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full rounded-full" style={{ backgroundColor: color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* АКТИВНОСТЬ */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6">Активность</h3>
                  {data?.activityData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.activityData} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontWeight: 700 }}
                          formatter={(v: any) => [`${v} шт.`, 'Выполнено']} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {data.activityData.map((_: any, i: number) => (
                            <Cell key={i} fill={['#5A4BFF', '#f97316', '#10b981'][i % 3]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-300">
                      <p className="font-bold">Нет данных</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ПРОГРЕСС ПО МОДУЛЯМ */}
              {data?.modules?.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6">Успеваемость по темам</h3>
                  <div className="space-y-4">
                    {data.modules.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-4">
                        <div className="w-48 shrink-0">
                          <p className="font-bold text-gray-700 text-sm truncate">{m.title}</p>
                          <p className="text-xs text-gray-400">{m.totalTests} заданий</p>
                        </div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${m.averageScore}%` }} transition={{ duration: 0.8 }}
                            className="h-full rounded-full transition-all" style={{ backgroundColor: scoreColor(m.averageScore) }} />
                        </div>
                        <span className="w-12 text-right font-black text-sm" style={{ color: scoreColor(m.averageScore) }}>
                          {m.averageScore}%
                        </span>
                      </div>
                    ))}
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

              {/* AI ОТЧЁТ */}
              {data?.aiReport && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-200">
                    <BrainCircuit className="w-8 h-8 text-gray-900" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-900 mb-4">Аналитическое заключение нейросети</h3>
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-gray-700 font-medium leading-relaxed">{data.aiReport}</p>
                    </div>
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
