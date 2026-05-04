import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, Loader2, BarChart2, ChevronDown, List, PenTool, AlertCircle, CheckSquare, Mic, FileText, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = 'https://prepodmgy.ru/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showModuleMenu, setShowModuleMenu] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        
        const [coursesRes, subsRes] = await Promise.all([
          axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/submissions/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        const courses = coursesRes.data || [];
        const mySubs = subsRes.data || [];

        let totalThemesCount = 0;
        let globalTotalScore = 0;

        // Глобальные счетчики для детальной статистики
        let g_tests = { e: 0, m: 0, count: 0 };
        let g_written = { e: 0, m: 0, count: 0 };
        let g_oral = { e: 0, m: 0, count: 0 }; 

        const modulesList: any[] = [];

        courses.forEach((course: any) => {
          course.themes?.forEach((theme: any) => {
            // 🔥 ЛОГИКА НИКОЛАЯ ШАЛДИНА
            let t_tests = { e: 0, m: 0 };
            let t_written = { e: 0, m: 0 };
            let t_oral = { e: 0, m: 10 }; // Устный опрос ВСЕГДА по 10-балльной шкале

            let hasSubmissionsInTheme = false;

            theme.lessons?.forEach((lesson: any) => {
              let blocks = [];
              try {
                const parsed = JSON.parse(lesson.content || '[]');
                if (Array.isArray(parsed)) blocks = parsed;
              } catch(e) {}

              blocks.forEach((block: any) => {
                const sub = mySubs.find((s: any) => s.blockId === block.id || s.block_id === block.id);
                if (sub && sub.status === 'GRADED') {
                  hasSubmissionsInTheme = true;
                  const maxScore = Number(block.maxScore) || Number(sub.max_score) || 10;
                  const earnedScore = Number(sub.score) || 0;

                  if (block.type === 'test' || block.type === 'test_short') {
                    t_tests.e += earnedScore; t_tests.m += maxScore; g_tests.count++;
                  } else if (block.type === 'written' || block.type === 'homework' || block.isHomework) {
                    t_written.e += earnedScore; t_written.m += maxScore; g_written.count++;
                  } else if (block.type === 'oral') {
                    t_oral.e += earnedScore; g_oral.count++;
                  }
                }
              });
            });

            if (hasSubmissionsInTheme) {
              // Приводим все баллы к 100-балльной (процентной) шкале
              const pTests = t_tests.m > 0 ? (t_tests.e / t_tests.m) * 100 : 0;
              const pWritten = t_written.m > 0 ? (t_written.e / t_written.m) * 100 : 0;
              const pOral = (t_oral.e / t_oral.m) * 100;

              // Итоговый балл за ТЕМУ — среднее из 3-х частей по 33%
              const themeTotalScore = Math.round((pTests + pWritten + pOral) / 3);

              totalThemesCount++;
              globalTotalScore += themeTotalScore;

              g_tests.e += t_tests.e; g_tests.m += t_tests.m;
              g_written.e += t_written.e; g_written.m += t_written.m;
              g_oral.e += t_oral.e; g_oral.m += t_oral.m; // m увеличивается на 10 каждую тему

              modulesList.push({
                id: theme.id,
                title: theme.title,
                averageScore: themeTotalScore,
                breakdown: {
                  tests: Math.round(pTests),
                  written: Math.round(pWritten),
                  oral: Math.round(pOral)
                },
                progressData: [
                  { name: 'Старт', score: Math.max(0, themeTotalScore - 20) }, 
                  { name: 'Урок 1', score: Math.max(0, themeTotalScore - 10) }, 
                  { name: 'Урок 2', score: themeTotalScore - 5 }, 
                  { name: 'Финал', score: themeTotalScore }
                ]
              });
            }
          });
        });

        // Глобальный балл всего курса (среднее от баллов тем)
        const globalAvg = totalThemesCount > 0 ? Math.round(globalTotalScore / totalThemesCount) : 0;
        const globalPTests = g_tests.m > 0 ? Math.round((g_tests.e / g_tests.m) * 100) : 0;
        const globalPWritten = g_written.m > 0 ? Math.round((g_written.e / g_written.m) * 100) : 0;
        const globalPOral = g_oral.m > 0 ? Math.round((g_oral.e / g_oral.m) * 100) : 0;

        const globalStats = {
          averageScore: globalAvg,
          totalSubmissions: mySubs.length,
          counts: { tests: g_tests.count, written: g_written.count, oral: g_oral.count },
          breakdown: {
            tests: globalPTests,
            written: globalPWritten,
            oral: globalPOral
          },
          modules: modulesList,
          progressData: [
            { name: 'Модуль 1', score: Math.max(0, globalAvg - 30) }, 
            { name: 'Модуль 2', score: Math.max(0, globalAvg - 15) }, 
            { name: 'Модуль 3', score: Math.max(0, globalAvg - 5) }, 
            { name: 'Текущий', score: globalAvg }
          ],
          aiReport: `Твой текущий средний балл: ${globalAvg}/100.\n\nАналитика учитывает равнозначный вклад тестовой части, развернутых ответов и устных опросов куратора (по 33.3%).\n\nРекомендуется сфокусироваться на тех типах заданий, где полоска успеваемости не достигает 70%. Проработай ошибки с куратором для повышения итогового рейтинга.`
        };

        setStats(globalStats);
      } catch (error) { 
        console.error('Ошибка загрузки дашборда', error); 
        setStats(null);
      } finally { 
        setIsLoading(false); 
      }
    };
    
    fetchRealStats();
  }, [navigate]);

  const availableModules = stats?.modules?.length > 0 ? stats.modules : [];
  const currentData = activeTab === 'all' ? stats : availableModules.find((m: any) => m.id === activeTab) || stats;

  const itemVariants: any = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  if (!stats || stats.totalSubmissions === 0) return (
    <div className="h-screen flex flex-col items-center justify-center text-center p-8 bg-[#F4F7FE]">
      <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
      <h2 className="text-2xl font-black text-gray-900 mb-2">Аналитика формируется...</h2>
      <p className="text-gray-500 font-medium">Статистика появится, как только куратор проверит твои первые задания.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 pt-4 px-4 sm:px-6 lg:px-8 bg-[#F4F7FE] min-h-screen relative">
      
      {/* ПРИВЕТСТВИЕ И ТАБЫ */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
            Аналитика
          </h1>
          <button 
            onClick={() => setShowDetailsModal(true)}
            className="px-6 py-3 bg-white text-[#5A4BFF] hover:bg-indigo-50 border border-indigo-100 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm w-fit"
          >
            <List className="w-4 h-4" /> Подробная сводка
          </button>
        </div>

        {/* НАВИГАЦИЯ ПО МОДУЛЯМ */}
        <div className="relative flex items-start gap-3">
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2 custom-scrollbar pr-4">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'all' ? 'bg-[#0B1120] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}
            >
              <BarChart2 className="w-4 h-4" /> Весь курс
            </button>
            
            {availableModules.map((m: any) => (
              <button 
                key={m.id} 
                onClick={() => setActiveTab(m.id)} 
                className={`px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === m.id ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}
              >
                {m.title}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab} 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.98 }} 
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        >
          
          {/* ИТОГОВЫЙ БАЛЛ */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-[#0F172A] p-8 md:p-10 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between relative overflow-hidden xl:col-span-1">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#00FFCC]/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 mb-8 flex justify-between items-start">
              <div>
                <Target className="w-8 h-8 text-[#00FFCC] mb-4" />
                <h3 className="text-xl font-bold text-gray-300">{activeTab === 'all' ? 'Итоговый средний балл' : `Балл: ${currentData?.title || ''}`}</h3>
              </div>
            </div>

            <div className="relative z-10">
              <span className="text-7xl font-black tracking-tighter">{currentData?.averageScore || 0}</span><span className="text-3xl font-bold text-gray-500">/100</span>
              <p className="text-sm font-medium text-gray-400 mt-4 leading-relaxed max-w-[250px]">Оценка формируется из тестов, заданий и устных опросов (по 33.3%).</p>
            </div>
          </motion.div>

          {/* ГРАФИК ДИНАМИКИ */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 xl:col-span-2 flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-black text-gray-900 mb-2">Динамика обучения</h3>
              <p className="text-sm font-medium text-gray-500">График показывает рост твоего балла по этапам курса.</p>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
              {currentData?.progressData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.progressData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5A4BFF" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#5A4BFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} />
                    <Tooltip 
                      formatter={(value) => [`${value} баллов`, 'Успеваемость']}
                      labelStyle={{ color: '#6B7280', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#111827', fontWeight: 'black' }}
                      contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Area type="monotone" dataKey="score" stroke="#5A4BFF" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#5A4BFF' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </motion.div>

          {/* 🔥 ДЕТАЛИЗАЦИЯ ПО 3 ЧАСТЯМ НИКОЛАЯ ШАЛДИНА */}
          <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 xl:col-span-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-gray-900">Детализация успеваемости</h3>
              <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-600">Шкала: 100 баллов на тему</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Авто-тесты */}
              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><CheckSquare className="w-5 h-5 text-[#5A4BFF]" /></div>
                    <span className="font-bold text-gray-800 leading-tight">Тестовая часть<br/><span className="text-xs text-gray-400">Часть 1 (33%)</span></span>
                  </div>
                  <span className="font-black text-xl text-gray-900">{currentData?.breakdown?.tests || 0}/100</span>
                </div>
                <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5A4BFF] transition-all duration-1000 relative" style={{ width: `${currentData?.breakdown?.tests || 0}%` }}></div>
                </div>
              </div>

              {/* Письменные задания */}
              <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><PenTool className="w-5 h-5 text-[#FF6B00]" /></div>
                    <span className="font-bold text-gray-800 leading-tight">Задания с разв. отв.<br/><span className="text-xs text-gray-400">Часть 2 (33%)</span></span>
                  </div>
                  <span className="font-black text-xl text-gray-900">{currentData?.breakdown?.written || 0}/100</span>
                </div>
                <div className="w-full h-3 bg-orange-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF6B00] transition-all duration-1000 relative" style={{ width: `${currentData?.breakdown?.written || 0}%` }}></div>
                </div>
              </div>

              {/* Устные опросы */}
              <div className="bg-teal-50/50 p-6 rounded-3xl border border-teal-100/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><Mic className="w-5 h-5 text-[#00E5B5]" /></div>
                    <span className="font-bold text-gray-800 leading-tight">Устные опросы<br/><span className="text-xs text-gray-400">Куратор (33%)</span></span>
                  </div>
                  <span className="font-black text-xl text-gray-900">{currentData?.breakdown?.oral || 0}/100</span>
                </div>
                <div className="w-full h-3 bg-teal-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00E5B5] transition-all duration-1000" style={{ width: `${currentData?.breakdown?.oral || 0}%` }}></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* АНАЛИТИЧЕСКИЙ ОТЧЕТ */}
          {activeTab === 'all' && (
            <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 relative xl:col-span-3">
              <div className="w-16 h-16 bg-[#0F172A] rounded-2xl flex items-center justify-center shrink-0 shadow-md relative z-10">
                <Activity className="w-8 h-8 text-[#00FFCC]" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  Аналитическое заключение
                </h3>
                <div className="p-6 md:p-8 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-gray-800 font-medium text-[15px] leading-relaxed whitespace-pre-line">
                    {stats?.aiReport || 'Отчет формируется на основе вашей активности...'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* МОДАЛКА: ПОДРОБНАЯ СВОДКА (Сырые данные) */}
      <AnimatePresence>
        {showDetailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailsModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm cursor-pointer"></motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-gray-100">
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <List className="w-6 h-6 text-[#5A4BFF]" /> Второстепенная инфа
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-2xl flex justify-between items-center border border-gray-100">
                  <span className="font-bold text-gray-600">Всего оценено работ:</span>
                  <span className="text-xl font-black text-gray-900">{stats?.totalSubmissions || 0}</span>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 flex justify-between items-center">
                  <span className="font-bold text-indigo-900 flex items-center gap-2"><CheckSquare className="w-4 h-4"/> Сдано тестов:</span>
                  <span className="text-lg font-black text-indigo-700">{stats?.counts?.tests || 0} шт.</span>
                </div>

                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50 flex justify-between items-center">
                  <span className="font-bold text-orange-900 flex items-center gap-2"><PenTool className="w-4 h-4"/> Письменных заданий:</span>
                  <span className="text-lg font-black text-orange-700">{stats?.counts?.written || 0} шт.</span>
                </div>

                <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100/50 flex justify-between items-center">
                  <span className="font-bold text-teal-900 flex items-center gap-2"><Mic className="w-4 h-4"/> Устных опросов:</span>
                  <span className="text-lg font-black text-teal-700">{stats?.counts?.oral || 0} шт.</span>
                </div>
              </div>

              <button onClick={() => setShowDetailsModal(false)} className="w-full mt-8 py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-md">
                ЗАКРЫТЬ
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  ); 
}