import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShieldCheck, LogOut, User, Lock, ArrowRight, BrainCircuit, Loader2, CheckSquare, Edit3, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'http://85.193.89.154:3000';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [isLinked, setIsLinked] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [realStats, setRealStats] = useState<any>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const statsRes = await axios.get(`${API_URL}/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const d = statsRes.data || {};
      
      setRealStats({
        name: d.studentName || 'Ученик',
        score: d.averageScore || 0,
        tests: d.totalTests || 0,
        status: 'Обучается',
        breakdown: d.breakdown || { tests: 0, written: 0, oral: 0 },
        aiReport: d.aiReport || 'Отчет формируется...'
      });

      setIsLinked(d.isLinked !== false); 
    } catch (err) { console.error('Ошибка загрузки данных', err); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/auth/link-student`, { invite_code: code }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
    } catch (err) {
      alert('Неверный код доступа!');
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans text-gray-900 flex flex-col">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-[#00FFCC]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight">Препод из МГУ</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Портал для родителей</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold transition-colors">
          <LogOut className="w-5 h-5" /> Выйти
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isLinked ? (
            <motion.div key="auth" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 max-w-lg w-full relative z-10">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-8 mx-auto border-8 border-white"><Lock className="w-8 h-8 text-[#5A4BFF]" /></div>
              <h2 className="text-3xl font-black text-center mb-3">Код доступа</h2>
              <p className="text-center text-gray-500 font-medium mb-10">Введите уникальный код вашего ребенка для доступа к детализированной аналитике.</p>
              <form onSubmit={handleLinkStudent} className="space-y-6">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="КОД ИЗ ПРОФИЛЯ" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-center text-xl font-black tracking-[0.3em] outline-none uppercase" />
                <button type="submit" disabled={isSubmitting || !code} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50">
                  {isSubmitting ? 'СИНХРОНИЗАЦИЯ...' : <>ПОДКЛЮЧИТЬ <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl w-full space-y-6 z-10 py-10">
              
              <div className="flex items-end justify-between bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#5A4BFF] to-[#00FFCC] rounded-[1.5rem] p-1"><div className="w-full h-full bg-white rounded-[1.2rem] flex items-center justify-center"><User className="w-8 h-8 text-gray-900" /></div></div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {realStats?.status}</div>
                    <h2 className="text-3xl font-black text-gray-900">Ученик: {realStats?.name}</h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 🔥 ГЛАВНЫЙ БЛОК ИТОГОВОГО БАЛЛА */}
                <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between relative overflow-hidden lg:col-span-1">
                  <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                  <div className="relative z-10 mb-8">
                    <TrendingUp className="w-8 h-8 text-[#00FFCC] mb-4" />
                    <h3 className="text-xl font-bold text-gray-400">Итоговый балл</h3>
                  </div>
                  <div className="relative z-10">
                    <span className="text-6xl font-black">{realStats?.score}</span><span className="text-2xl text-gray-500">/100</span>
                    <p className="text-sm font-medium text-gray-400 mt-4">Рассчитывается как среднее значение всех форматов контроля.</p>
                  </div>
                </div>

                {/* 🔥 ПРОЗРАЧНАЯ ДЕТАЛИЗАЦИЯ ИЗ ЧЕГО СОСТОИТ ОЦЕНКА */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-2">
                  <h3 className="text-xl font-black text-gray-900 mb-6">Детализация успеваемости</h3>
                  <div className="space-y-6">
                    
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0"><CheckSquare className="w-6 h-6 text-[#5A4BFF]" /></div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-2"><span className="font-bold text-gray-700">Авто-тесты</span><span className="font-black">{realStats?.breakdown?.tests}/100</span></div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#5A4BFF]" style={{ width: `${realStats?.breakdown?.tests}%` }}></div></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0"><Edit3 className="w-6 h-6 text-orange-500" /></div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-2"><span className="font-bold text-gray-700">Письменные задания (Часть 2)</span><span className="font-black">{realStats?.breakdown?.written}/100</span></div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${realStats?.breakdown?.written}%` }}></div></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0"><Mic className="w-6 h-6 text-emerald-500" /></div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-2"><span className="font-bold text-gray-700">Устные опросы куратора</span><span className="font-black">{realStats?.breakdown?.oral}/100</span></div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${realStats?.breakdown?.oral}%` }}></div></div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* 🔥 НАСТОЯЩИЙ ИИ-ОТЧЕТ */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 flex flex-col md:flex-row gap-8 relative">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-200"><BrainCircuit className="w-8 h-8 text-gray-900" /></div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-4">Аналитическое заключение нейросети</h3>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-gray-700 font-medium leading-relaxed">
                      {realStats?.aiReport}
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}