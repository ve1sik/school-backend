import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, FileText, CheckSquare, Mic, Activity, Loader2, BarChart2, ChevronDown, List, PenTool, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const API_URL = 'https://prepodmgy.ru/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showModuleMenu, setShowModuleMenu] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        
        const res = await axios.get(`${API_URL}/dashboard/analytics`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        setStats(res.data);

      } catch (error) { 
        console.error('Ошибка загрузки дашборда', error); 
        // 🔥 Фаллбэк на случай, если бэк упадет, чтобы фронт не умирал белым экраном
        setStats({
          averageScore: 0, totalTests: 0, progressData: [], activityData: [], breakdown: { tests: 0, written: 0, oral: 0 }, report: 'Не удалось загрузить данные аналитики. Попробуйте позже.'
        });
      } finally { 
        setIsLoading(false); 
      }
    };
    fetchStats();
  }, [navigate]);

  const availableModules = stats?.modules?.length > 0 ? stats.modules : [];
  const currentData = activeTab === 'all' ? stats : availableModules.find((m: any) => m.id === activeTab) || stats;

  const itemVariants: any = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🔥 Умный вердикт на основе балла
  const getScoreVerdict = (score: number) => {
    if (score >= 85) return { text: 'Отличный результат', color: 'text-[#00FFCC]', bg: 'bg-[#00FFCC]/10' };
    if (score >= 60) return { text: 'Хороший темп', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    if (score >= 40) return { text: 'Нужно поднажать', color: 'text-amber-400', bg: 'bg-amber-400/10' };
    return { text: 'Критический уровень', color: 'text-rose-400', bg: 'bg-rose-400/10' };
  };

  if (isLoading) return <div className="h-full flex items-center justify-center min-h-[60vh]"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  if (!stats) return (
    <div className="h-full flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
      <h2 className="text-2xl font-black text-gray-900 mb-2">Нет данных</h2>
      <p className="text-gray-500 font-medium">Аналитика появится, когда вы начнете проходить уроки и сдавать задания.</p>
    </div>
  );

  const verdict = getScoreVerdict(currentData?.averageScore || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 pt-4 px-4 sm:px-6 lg:px-8">
      
      {/* ПРИВЕТСТВИЕ И ТАБЫ */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-2">
              Главная
            </h1>
          </div>
        </div>

        {/* НАВИГАЦИЯ ПО МОДУЛЯМ */}
        <div className="relative flex items-start gap-3">
          
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2 custom-scrollbar pr-4">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'all' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 hover:border-gray-200'}`}
            >
              <BarChart2 className="w-4 h-4" /> Общая статистика
            </button>
            
            {availableModules.map((m: any) => (
              <button 
                key={m.id} 
                onClick={() => setActiveTab(m.id)} 
                className={`px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === m.id ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 hover:border-gray-200'}`}
              >
                {m.title}
              </button>
            ))}
          </div>

          {availableModules.length > 0 && (
            <button 
              onClick={() => setShowModuleMenu(!showModuleMenu)}
              className={`shrink-0 px-5 py-3.5 border text-sm rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm ${showModuleMenu ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4 hidden sm:block" /> 
              <span className="hidden sm:block">Все модули</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showModuleMenu ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>
          )}

          <AnimatePresence>
            {showModuleMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col"
              >
                <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Навигация</h4>
                </div>
                <div className="p-3 max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                  <button 
                    onClick={() => { setActiveTab('all'); setShowModuleMenu(false); }}
                    className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${activeTab === 'all' ? 'bg-gray-900 text-white shadow-md' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
                  >
                    <BarChart2 className="w-4 h-4" /> Общая статистика
                  </button>
                  
                  {availableModules.map((m: any) => (
                    <button 
                      key={m.id} 
                      onClick={() => { setActiveTab(m.id); setShowModuleMenu(false); }}
                      className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${activeTab === m.id ? 'bg-[#5A4BFF] text-white shadow-md shadow-indigo-500/20' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab} 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.98 }} 
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          
          {/* ИТОГОВЫЙ БАЛЛ */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-[#0F172A] p-8 md:p-10 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between relative overflow-hidden lg:col-span-1">
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#5A4BFF]/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 mb-8 flex justify-between items-start">
              <div>
                <TrendingUp className="w-8 h-8 text-[#00FFCC] mb-4" />
                <h3 className="text-xl font-bold text-gray-300">{activeTab === 'all' ? 'Итоговый средний балл' : `Балл: ${currentData?.title || ''}`}</h3>
              </div>
            </div>

            <div className="relative z-10">
              <span className="text-7xl font-black tracking-tighter">{currentData?.averageScore || 0}</span><span className="text-2xl font-bold text-gray-500">/100</span>
              <p className="text-sm font-medium text-gray-400 mt-4 leading-relaxed max-w-[250px]">Оценка формируется из тестов, письменных заданий и опросов.</p>
            </div>
          </motion.div>

          {/* ГРАФИК ДИНАМИКИ */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Динамика успеваемости</h3>
                <p className="text-sm font-medium text-gray-500">График показывает твой средний балл за каждый день обучения.</p>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[240px]">
              {currentData?.progressData && currentData.progressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5A4BFF" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#5A4BFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} />
                    <Tooltip 
                      formatter={(value) => [`${value} баллов`, 'Результат']}
                      labelStyle={{ color: '#6B7280', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#111827', fontWeight: 'black' }}
                      contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Area type="monotone" dataKey="score" stroke="#5A4BFF" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#5A4BFF' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Недостаточно данных для графика
                </div>
              )}
            </div>
          </motion.div>

          {/* ДЕТАЛИЗАЦИЯ И АКТИВНОСТЬ */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-gray-900">Детализация успеваемости</h3>
              <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-600">Сдано работ: {currentData?.totalTests || 0}</span>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 bg-[#5A4BFF]/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><CheckSquare className="w-6 h-6 text-[#5A4BFF]" /></div>
                <div className="flex-1">
                  <div className="flex justify-between mb-3"><span className="font-black text-gray-900">Авто-тесты (Часть 1)</span><span className="font-black text-gray-900">{currentData?.breakdown?.tests || 0}/100</span></div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#5A4BFF] transition-all duration-1000 relative" style={{ width: `${currentData?.breakdown?.tests || 0}%` }}></div></div>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><PenTool className="w-6 h-6 text-[#FF6B00]" /></div>
                <div className="flex-1">
                  <div className="flex justify-between mb-3"><span className="font-black text-gray-900">Письменные задания (Часть 2)</span><span className="font-black text-gray-900">{currentData?.breakdown?.written || 0}/100</span></div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#FF6B00] transition-all duration-1000 relative" style={{ width: `${currentData?.breakdown?.written || 0}%` }}></div></div>
                </div>
              </div>

              <div className="flex items-center gap-6 group opacity-50 hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-[#00D496]/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Mic className="w-6 h-6 text-[#00D496]" /></div>
                <div className="flex-1">
                  <div className="flex justify-between mb-3"><span className="font-black text-gray-900">Устные опросы куратора</span><span className="font-black text-gray-900">{currentData?.breakdown?.oral || 0}/100</span></div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#00D496] transition-all duration-1000" style={{ width: `${currentData?.breakdown?.oral || 0}%` }}></div></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ГРАФИК АКТИВНОСТИ */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-1 flex flex-col">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-gray-900 mb-2">Типы сданных работ</h3>
              <p className="text-sm font-medium text-gray-500">Сколько заданий каждого типа выполнено.</p>
            </div>
            <div className="flex-1 w-full min-h-[200px]">
              {currentData?.activityData && currentData.activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentData.activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11, fontWeight: 'bold'}} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}} 
                      formatter={(value) => [`${value} шт.`, 'Сдано']}
                      labelStyle={{ color: '#6B7280', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#111827', fontWeight: 'black' }}
                      contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Bar dataKey="count" fill="#00FFCC" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    Нет данных
                 </div>
              )}
            </div>
          </motion.div>

          {/* 🔥 СТРОГИЙ ОТЧЕТ УЧИТЕЛЯ (БЕЗ ИИ И НЕЙРОСЕТЕЙ) */}
          {activeTab === 'all' && (
            <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-gradient-to-br from-white to-gray-50 p-8 md:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8 relative lg:col-span-3 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100/50 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shrink-0 shadow-md relative z-10">
                <Activity className="w-8 h-8 text-[#00FFCC]" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  Аналитическое заключение результатов домашних заданий
                </h3>
                <div className="p-6 md:p-8 bg-white/80 backdrop-blur-sm rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-gray-800 font-medium text-lg leading-relaxed whitespace-pre-line">
                    {/* ТУТ ВЫВОДИТСЯ РЕАЛЬНЫЙ ТЕКСТ ОТ БЭКЕНДА */}
                    {stats?.aiReport || stats?.report || 'Отчет формируется на основе вашей активности... Продолжайте обучение, чтобы получить детальный анализ.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}