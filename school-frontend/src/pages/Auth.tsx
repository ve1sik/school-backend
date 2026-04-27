import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, GraduationCap, Sparkles, ShieldCheck, Loader2, ArrowRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://85.193.89.154:3000';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, { email, password });
      
      const token = res.data.token || res.data.access_token;
      
      if (token) {
        localStorage.setItem('token', token);
        
        // РАСШИФРОВЫВАЕМ ТОКЕН И ДОСТАЕМ РОЛЬ
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          // РАСПРЕДЕЛЯЕМ ПОТОКИ
          if (payload.role === 'ADMIN' || payload.role === 'CURATOR') {
            navigate('/admin'); // Кидаем препода в админку
          } else {
            navigate('/courses'); // Кидаем студента учиться
          }
        } catch (e) {
          navigate('/courses'); // Если что-то пошло не так, кидаем как обычного юзера
        }
        
      } else {
        if (!isLogin) {
          setIsLogin(true);
          setError('Регистрация успешна! Теперь войдите с этими данными.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка авторизации. Проверьте данные.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white selection:bg-indigo-200">
      
      {/* ЛЕВАЯ ЧАСТЬ: ФОРМА */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
        <div className="w-full max-w-[400px]">
          
          {/* Заголовки */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              Добро пожаловать! <span className="text-2xl">👋</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Создайте аккаунт или войдите, чтобы начать подготовку.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <div className={`p-3 rounded-xl text-sm font-medium ${error.includes('успешна') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">Ваша почта</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all" 
                  placeholder="student@mail.ru"
                  required 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                <label className="block text-xs font-semibold text-gray-600">Пароль</label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Забыли пароль?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-indigo-500 rounded-xl text-sm font-medium outline-none shadow-[0_0_10px_rgba(79,70,229,0.1)] transition-all" 
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-[#31118A] hover:bg-[#250d6e] text-white rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Продолжить <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Быстрый вход */}
          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative bg-white px-4 text-xs font-medium text-gray-400">Быстрый вход</div>
          </div>

          {/* Кнопки соцсетей - теперь их 3 */}
          <div className="mt-6 flex gap-2">
            <button type="button" className="flex-1 py-3 border border-gray-200 hover:border-gray-300 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-all">
              <span className="font-bold text-[#0077FF]">VK</span> ID
            </button>
            <button type="button" className="flex-1 py-3 border border-gray-200 hover:border-gray-300 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-sky-500 hover:bg-gray-50 transition-all">
              TG Telegram
            </button>
            <button type="button" className="flex-1 py-3 border border-gray-200 hover:border-gray-300 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-rose-500 hover:bg-gray-50 transition-all">
              <MessageSquare className="w-4 h-4" /> MAX
            </button>
          </div>

          {/* Переключатель логики */}
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} type="button" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
              {isLogin ? 'Нужна регистрация? Нажмите здесь' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>

        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ПРОМО-БЛОК */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#4A1DCA] to-[#6D28D9] p-12 flex-col justify-center relative overflow-hidden text-white">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full"></div>

        <div className="relative z-10 max-w-lg mx-auto">
          
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            Инновационный формат обучения
          </div>

          <h2 className="text-5xl font-bold leading-[1.1] mb-6">
            Подготовка, которая дает <span className="text-yellow-400">результат.</span>
          </h2>

          <p className="text-indigo-100/80 text-lg leading-relaxed mb-10">
            Индивидуальный трек обучения, умная аналитика твоих ошибок и поддержка кураторов 24/7.
          </p>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">Умные алгоритмы</h4>
              <p className="text-sm text-indigo-200">Автоматический анализ ошибок в тестах</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}