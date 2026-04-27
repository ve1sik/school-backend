import { useState, useEffect } from 'react';
import { User, MapPin, Calendar, ShieldCheck, Copy, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = 'http://85.193.89.154:3000';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let userData = res.data;

        // 🔥 ГЕНИАЛЬНО: Если кода нет, тихо генерируем его сами без лишних кнопок!
        if (!userData.invite_code) {
          try {
            const codeRes = await axios.post(`${API_URL}/auth/invite-code`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            userData.invite_code = codeRes.data.invite_code;
          } catch (e) {
            console.error('Не удалось сгенерировать код');
          }
        }

        setUser(userData);
      } catch (err) {
        console.error('Ошибка загрузки профиля', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const copyToClipboard = () => {
    if (!user?.invite_code) return;
    navigator.clipboard.writeText(user.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Гасим галочку через 2 секунды
  };

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      
      {/* ВЕРХНЯЯ КАРТОЧКА: Основная инфа */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="w-32 h-32 bg-indigo-50 rounded-[2rem] flex items-center justify-center shrink-0 border-2 border-indigo-100">
          <User className="w-12 h-12 text-[#5A4BFF]" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-2">
            {user?.name || 'Имя'} {user?.surname || 'Фамилия'}
          </h1>
          <p className="text-gray-500 font-medium flex items-center justify-center md:justify-start gap-2 mb-6">
            <Mail className="w-4 h-4" /> {user?.email || 'email@example.com'}
          </p>
          <button className="px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all active:scale-95 shadow-md">
            Редактировать
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ЛЕВАЯ КАРТОЧКА: Личные данные и КОД */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <div className="px-3 py-1 rounded-md bg-indigo-50 text-[#5A4BFF] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Личные данные
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="font-bold text-gray-700">{user?.city || 'Город не указан'}</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="font-bold text-gray-700">{user?.birthday || 'Дата рождения не указана'}</span>
            </div>
          </div>

          {/* 🔥 БЛОК ДЛЯ РОДИТЕЛЕЙ (Без кнопок генерации) */}
          <div className="mt-auto pt-8">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Для родителей</p>
            <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">Секретный код доступа</p>
                <p className="text-xl md:text-2xl font-black text-white tracking-[0.2em]">
                  {user?.invite_code || 'ОШИБКА'}
                </p>
              </div>
              <button 
                onClick={copyToClipboard} 
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
                title="Скопировать код"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ПРАВАЯ КАРТОЧКА: Статус обучения */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#5A4BFF] rounded-[2.5rem] p-8 md:p-10 shadow-lg shadow-indigo-500/30 text-white relative overflow-hidden flex flex-col">
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Статус обучения</h2>
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-6">Тарифный план</p>
            
            <div className="text-4xl md:text-5xl font-black tracking-tight mb-8">
              СТУДЕНТ PRO
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl">
              <p className="font-medium text-indigo-50">
                Твой рейтинг выше, чем у 85% студентов на потоке. Красава! Так держать! 🚀
              </p>
            </div>
          </div>

          <div className="mt-auto pt-10 flex justify-end relative z-10">
            <ShieldCheck className="w-32 h-32 text-white/10 absolute -bottom-4 -right-4 rotate-12" />
          </div>
        </motion.div>

      </div>
    </div>
  );
}