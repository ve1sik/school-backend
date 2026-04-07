import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Shield, GraduationCap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Auth() {
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const baseUrl = 'https://9bd56d0b1eef2b86-141-105-25-14.serveousercontent.com';

      if (isLogin) {
        // === ЛОГИКА ВХОДА ===
        const res = await axios.post(`${baseUrl}/auth/login`, { email, password }, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        const token = res.data?.token || res.data?.access_token || res.data?.accessToken;
        if (token) {
          localStorage.setItem('token', token);
          navigate('/'); // Летим в кабинет!
        } else {
          setError('Бэкенд ответил, но не дал токен.');
        }

      } else {
        // === ЛОГИКА РЕГИСТРАЦИИ ===
        await axios.post(`${baseUrl}/auth/register`, { name, email, password }, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        // Если дошли сюда — ошибок нет, юзер создан!
        setSuccessMsg('Аккаунт создан! Введите пароль и нажмите "Продолжить".');
        setIsLogin(true); // Перекидываем на Вход
        setPassword(''); // Сбрасываем пароль
      }

    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        setError('Неверный email или пароль!');
      } else if (err.response?.status === 409 || err.response?.status === 400) {
        setError('Ошибка: Возможно, такой email уже есть.');
      } else {
        setError('Ошибка соединения с сервером. Бэкенд запущен?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white">
      
      {/* ЛЕВАЯ ЧАСТЬ - ФОРМА */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
        <div className="w-full max-w-[400px]">
          
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              {isLogin ? 'Добро пожаловать! 👋' : 'Регистрация 🚀'}
            </h1>
            <p className="text-gray-500 font-medium">
              {isLogin ? 'Создайте аккаунт или войдите, чтобы начать подготовку.' : 'Введите свои данные, чтобы присоединиться к платформе.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Имя ученика</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#3b1c94] focus:ring-1 focus:ring-[#3b1c94] outline-none transition-all text-gray-900 font-medium" required={!isLogin} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Email ученика</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@mail.ru" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#3b1c94] focus:ring-1 focus:ring-[#3b1c94] outline-none transition-all text-gray-900 font-medium" required />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-700">Пароль</label>
                {isLogin && <button type="button" className="text-xs text-[#3b1c94] font-bold hover:underline">Забыли пароль?</button>}
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#3b1c94] focus:ring-1 focus:ring-[#3b1c94] outline-none transition-all text-gray-900 font-medium" required />
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl text-center border border-red-100">{error}</div>}
            {successMsg && <div className="p-3 bg-green-50 text-green-600 text-sm font-bold rounded-xl text-center border border-green-100">{successMsg}</div>}

            <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#2f1181] hover:bg-[#200b5e] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-[0.98]">
              {isLoading ? 'Загрузка...' : ( <>{isLogin ? 'Продолжить' : 'Зарегистрироваться'} <ArrowRight className="w-4 h-4" /></> )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-8">
              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-gray-200 w-full absolute"></div>
                <span className="bg-white px-4 text-xs text-gray-400 font-bold uppercase tracking-wider relative">Быстрый вход</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2 transition-colors">
                  <span className="text-[#0077FF] font-extrabold">VK</span> ID
                </button>
                <button type="button" className="py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2 transition-colors">
                  <span className="text-[#2AABEE] font-extrabold">TG</span> Telegram
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-gray-500 font-medium">
            {isLogin ? 'Нет аккаунта?' : 'Уже зарегистрированы?'} 
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }} className="ml-2 text-[#3b1c94] font-bold hover:underline">
              {isLogin ? 'Создать аккаунт' : 'Войти'}
            </button>
          </p>

        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ - ФИОЛЕТОВЫЙ БАННЕР */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#4c22b5] to-[#2a0e73] relative flex-col justify-center p-16 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[1px] border-white/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[1px] border-white/5 rounded-full border-dashed"></div>

        <div className="relative z-10 max-w-[500px] mx-auto">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white text-xs font-bold tracking-wide">Инновационный формат обучения</span>
          </div>

          <h2 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Подготовка, которая дает <span className="text-yellow-400">результат.</span>
          </h2>
          
          <p className="text-indigo-200 text-lg mb-12 leading-relaxed font-medium">
            Индивидуальный трек обучения, умная аналитика твоих ошибок и поддержка кураторов 24/7.
          </p>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-start gap-4 shadow-xl">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#2a0e73]" />
            </div>
            <div>
              <h4 className="text-white font-bold mb-1">Умные алгоритмы</h4>
              <p className="text-indigo-200 text-sm font-medium">Автоматический анализ ошибок в тестах</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}