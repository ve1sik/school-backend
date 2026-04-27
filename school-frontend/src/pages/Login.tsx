import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Loader2, GraduationCap, Users, MessageCircle, Share2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://85.193.89.154:3000';

type Mode = 'login' | 'register_student' | 'register_parent';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', surname: '', invite_code: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let res;
      if (mode === 'login') {
        res = await axios.post(`${API_URL}/auth/login`, { email: formData.email, password: formData.password });
      } else if (mode === 'register_student') {
        res = await axios.post(`${API_URL}/auth/register`, { email: formData.email, password: formData.password });
      } else {
        res = await axios.post(`${API_URL}/auth/register-parent`, formData);
      }
      
      localStorage.setItem('token', res.data.access_token);
      
      // Если зашел родитель - кидаем в его дашборд
      const payload = JSON.parse(window.atob(res.data.access_token.split('.')[1]));
      navigate(payload.role === 'PARENT' ? '/parent-dashboard' : '/');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка доступа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] p-4 font-sans relative overflow-hidden">
      
      {/* Декор */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#5A4BFF] opacity-10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 relative z-10">
        
        <div className="w-16 h-16 bg-[#5A4BFF] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-3xl font-black text-center text-gray-900 mb-2">
          {mode === 'login' ? 'С возвращением!' : mode === 'register_student' ? 'Регистрация' : 'Аккаунт родителя'}
        </h1>
        <p className="text-center text-gray-400 font-medium mb-8 text-sm uppercase tracking-widest">
          Платформа <span className="text-[#5A4BFF] font-black">Препод из МГУ</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register_parent' && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                placeholder="Имя" 
                className="p-3 bg-gray-50 border rounded-xl outline-none focus:border-[#5A4BFF]"
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input 
                placeholder="Фамилия" 
                className="p-3 bg-gray-50 border rounded-xl outline-none focus:border-[#5A4BFF]"
                onChange={e => setFormData({...formData, surname: e.target.value})}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="email" required placeholder="Email" 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl outline-none focus:border-[#5A4BFF]"
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="password" required placeholder="Пароль" 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl outline-none focus:border-[#5A4BFF]"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {mode === 'register_parent' && (
            <div className="p-4 bg-indigo-50 rounded-2xl border-2 border-dashed border-[#5A4BFF]/30 text-center">
              <input 
                placeholder="КОД ИЗ ПРОФИЛЯ РЕБЕНКА" 
                className="bg-transparent text-center font-black text-[#5A4BFF] placeholder:text-indigo-200 outline-none uppercase"
                onChange={e => setFormData({...formData, invite_code: e.target.value})}
              />
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#5A4BFF] text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="animate-spin" /> : <><LogIn className="w-5 h-5" /> {mode === 'login' ? 'Войти' : 'Создать аккаунт'}</>}
          </button>
        </form>

        {/* Кнопки соцсетей */}
        <div className="mt-8">
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Или войти через</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm text-[#0077FF]">
              <Share2 className="w-4 h-4" /> VK
            </button>
            <button className="flex items-center justify-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm text-[#24A1DE]">
              <MessageCircle className="w-4 h-4" /> Telegram
            </button>
          </div>
        </div>

        {/* Переключатели режимов */}
        <div className="mt-8 flex flex-col gap-2 text-center">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('register_student')} className="text-sm font-bold text-gray-500 hover:text-[#5A4BFF]">Нет аккаунта? Зарегистрироваться</button>
              <button onClick={() => setMode('register_parent')} className="text-sm font-black text-[#5A4BFF] flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> Я родитель
              </button>
            </>
          ) : (
            <button onClick={() => setMode('login')} className="text-sm font-bold text-gray-500 hover:text-[#5A4BFF]">Уже есть аккаунт? Войти</button>
          )}
        </div>
      </div>
    </div>
  );
}