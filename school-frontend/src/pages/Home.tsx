import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, CheckCircle2, Award, Users, BrainCircuit } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#06080e] font-sans text-white overflow-hidden relative">
      
      {/* Фоновое свечение (Магия) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand/30 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-700/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
      
      {/* ШАПКА САЙТА */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 max-w-7xl mx-auto relative z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">Препод из МГУ</span>
        </div>
        
        <div className="hidden lg:flex gap-10 text-sm font-semibold text-gray-300">
          <a href="#" className="hover:text-white transition-colors">Программа</a>
          <a href="#" className="hover:text-white transition-colors">Платформа</a>
          <a href="#" className="hover:text-white transition-colors">Отзывы</a>
        </div>
        
        <button
          onClick={() => navigate('/login')}
          className="bg-white hover:bg-gray-100 text-gray-950 px-7 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-xl"
        >
          Войти в кабинет
        </button>
      </nav>

      {/* ГЛАВНЫЙ БЛОК */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-28 flex flex-col items-center justify-center text-center relative z-10">
        
        {/* Анимированный бейдж */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-10 shadow-lg shadow-black/30"
        >
          <Award className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-bold tracking-wide uppercase text-purple-100">Флагманский курс подготовки</span>
        </motion.div>
        
        {/* ЗАГОЛОВОК */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-8 tracking-tighter"
        >
          Гарантия <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300">высокого балла</span><br/> на ЕГЭ. Твой путь в МГУ.
        </motion.h1>
        
        {/* Подзаголовок */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-gray-300 mb-14 leading-relaxed max-w-2xl"
        >
          Инновационная IT-платформа. Обучение ведут действующие преподаватели ведущего вуза страны. Персональный трек и умный анализ твоих ошибок.
        </motion.p>
        
        {/* Кнопки действия */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-5 mb-28"
        >
          <button
            onClick={() => navigate('/login')}
            className="bg-brand hover:bg-brand-light text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all active:scale-[0.98] shadow-2xl shadow-brand/30 flex items-center justify-center gap-2"
          >
            Начать обучение бесплатно <ArrowRight className="w-5 h-5" />
          </button>
          <button className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center shadow-sm">
            Узнать подробности
          </button>
        </motion.div>

        {/* Элитный Bento Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="w-full grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left"
        >
          
          <div className="bg-white/5 backdrop-blur-xl p-8 lg:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl transform hover:-translate-y-2 transition-transform duration-300 flex flex-col gap-8 h-full">
            <div className="w-16 h-16 bg-purple-700/30 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-lg">
              <Users className="w-8 h-8 text-purple-200" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3 text-white">Ведущие эксперты МГУ</h3>
              <p className="text-gray-300 font-medium">Курс ведут действующие преподаватели и научные сотрудники университета.</p>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl p-8 lg:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl transform md:translate-y-12 hover:-translate-y-2 transition-transform duration-300 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-brand/30 rounded-2xl flex items-center justify-center border border-brand/20 shadow-lg">
                    <CheckCircle2 className="w-8 h-8 text-brand-light" />
                </div>
                <span className="text-4xl font-extrabold tracking-tighter text-brand-light">89.4</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3 text-white">Средний балл выпускников</h3>
              <p className="text-gray-300 font-medium leading-relaxed">Результат по профильным предметам за последние три года.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand to-purple-900 p-8 lg:p-10 rounded-[2.5rem] border border-brand/30 shadow-2xl transform hover:-translate-y-2 transition-transform duration-300 flex flex-col gap-8 h-full lg:col-span-1 md:col-span-2">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner backdrop-blur-md">
                <BrainCircuit className="w-8 h-8 text-white"/>
            </div>
            <div>
                <h3 className="text-2xl font-bold mb-3 text-white">Умный анализ ошибок</h3>
                <p className="text-purple-100 font-medium leading-relaxed">Платформа сама находит твои слабые места и строит персональный трек для тренировок.</p>
            </div>
          </div>
        </motion.div>
      </main>
      
    </div>
  );
}