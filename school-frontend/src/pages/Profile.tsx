import { useState, useEffect, useRef } from 'react';
import { User, MapPin, Calendar, Copy, CheckCircle2, Loader2, Mail, Save, X, Camera, BookOpen, Flame, Star, Trophy, Zap, Target, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) finalUrl = finalUrl.replace('http://', 'https://');
  if (finalUrl.startsWith('http')) return finalUrl;
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (cleanPath.startsWith('uploads/')) return `https://prepodmgy.ru/${cleanPath}`;
  return `${API_URL}/${cleanPath}`;
};

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Стейты для редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editData, setEditData] = useState({ name: '', surname: '', city: '', birthday: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Тосты (уведомления)
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let userData = res.data;

        // Если кода нет, генерируем тихо
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
        setEditData({
          name: userData.name || '',
          surname: userData.surname || '',
          city: userData.city || '',
          birthday: userData.birthday || ''
        });

        // Загружаем статистику
        try {
          const statsRes = await axios.get(`${API_URL}/dashboard/analytics`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStats(statsRes.data);
        } catch { /* silent */ }
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
    setTimeout(() => setCopied(false), 2000);
  };

  // 🔥 СОХРАНЕНИЕ ПРОФИЛЯ
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`${API_URL}/auth/profile`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(res.data);
      setIsEditing(false);
      showToast('Профиль успешно обновлен!', 'success');
    } catch (err) {
      console.error('Ошибка при сохранении профиля:', err);
      showToast('Ошибка при сохранении. Проверь консоль.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 🔥 ЗАГРУЗКА АВАТАРКИ
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      
      // 1. Загружаем файл на сервер
      const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });

      const newAvatarUrl = uploadRes.data.url;

      // 2. Обновляем профиль с новой ссылкой на аватарку
      const profileRes = await axios.patch(`${API_URL}/auth/profile`, { avatar: newAvatarUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(profileRes.data);
      showToast('Аватарка успешно обновлена!', 'success');
    } catch (err) {
      console.error('Ошибка при загрузке аватарки:', err);
      showToast('Ошибка при загрузке фото', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Сбрасываем инпут
    }
  };

  // Генерация инициалов
  const getInitials = () => {
    if (user?.name && user?.surname) return (user.name[0] + user.surname[0]).toUpperCase();
    if (user?.name) return user.name[0].toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return 'СТ';
  };

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6 pb-20 relative">
      
      {/* ВЕРХНЯЯ КАРТОЧКА: Основная инфа */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8">
        
        {/* 🔥 БЛОК АВАТАРКИ */}
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 bg-indigo-50 rounded-[2rem] flex items-center justify-center shrink-0 border-2 border-indigo-100 relative overflow-hidden shadow-sm">
            {isUploadingAvatar ? (
              <Loader2 className="w-8 h-8 animate-spin text-[#5A4BFF]" />
            ) : user?.avatar ? (
              <img src={getFullUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-indigo-300">{getInitials()}</span>
            )}
          </div>
          {/* Оверлей при наведении */}
          <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="flex-1 text-center md:text-left w-full">
          {isEditing ? (
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Имя"
                value={editData.name} 
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-black text-xl outline-none focus:border-indigo-400 transition-all text-gray-900"
              />
              <input 
                type="text" 
                placeholder="Фамилия"
                value={editData.surname} 
                onChange={(e) => setEditData({...editData, surname: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-black text-xl outline-none focus:border-indigo-400 transition-all text-gray-900"
              />
            </div>
          ) : (
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-2">
              {user?.name || 'Имя'} {user?.surname || 'Фамилия'}
            </h1>
          )}
          
          <p className="text-gray-500 font-medium flex items-center justify-center md:justify-start gap-2 mb-6">
            <Mail className="w-4 h-4" /> {user?.email || 'email@example.com'}
          </p>

          {isEditing ? (
            <div className="flex items-center justify-center md:justify-start gap-3">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black transition-all active:scale-95 shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Сохранить
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditData({ name: user.name || '', surname: user.surname || '', city: user.city || '', birthday: user.birthday || '' });
                }} 
                disabled={isSaving}
                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all active:scale-95 shadow-md">
              Редактировать
            </button>
          )}
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
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              {isEditing ? (
                <input 
                  type="text" 
                  placeholder="Ваш город"
                  value={editData.city} 
                  onChange={(e) => setEditData({...editData, city: e.target.value})}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold outline-none focus:border-indigo-400 transition-all w-full"
                />
              ) : (
                <span className="font-bold text-gray-700">{user?.city || 'Город не указан'}</span>
              )}
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
              {isEditing ? (
                <input 
                  type="text" 
                  placeholder="ДД.ММ.ГГГГ"
                  value={editData.birthday} 
                  onChange={(e) => setEditData({...editData, birthday: e.target.value})}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold outline-none focus:border-indigo-400 transition-all w-full"
                />
              ) : (
                <span className="font-bold text-gray-700">{user?.birthday || 'Дата рождения не указана'}</span>
              )}
            </div>
          </div>

          {/* БЛОК ДЛЯ РОДИТЕЛЕЙ */}
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

        {/* ПРАВАЯ КАРТОЧКА: Статистика + Достижения */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-4">

          {/* Мини-статы */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: BookOpen, val: stats?.totalTests ?? '—', label: 'Заданий', color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { icon: Flame, val: stats?.streakDays ?? 0, label: 'Стрик', color: 'text-orange-500', bg: 'bg-orange-50' },
              { icon: Star, val: stats?.averageScore ?? '—', label: 'Балл', color: 'text-amber-500', bg: 'bg-amber-50' },
            ].map(({ icon: Icon, val, label, color, bg }) => (
              <div key={label} className={`${bg} rounded-[1.5rem] p-5 flex flex-col items-center`}>
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <span className="text-2xl font-black text-gray-900">{val}</span>
                <span className="text-xs font-bold text-gray-400 mt-1">{label}</span>
              </div>
            ))}
          </div>

          {/* Достижения */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 flex-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">Достижения</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🎯', label: 'Первый тест', unlocked: (stats?.totalTests ?? 0) >= 1 },
                { icon: '🔥', label: '3 дня подряд', unlocked: (stats?.streakDays ?? 0) >= 3 },
                { icon: '📚', label: '10 заданий', unlocked: (stats?.totalTests ?? 0) >= 10 },
                { icon: '⭐', label: 'Балл 80+', unlocked: (stats?.averageScore ?? 0) >= 80 },
                { icon: '🚀', label: '7 дней подряд', unlocked: (stats?.streakDays ?? 0) >= 7 },
                { icon: '🏆', label: 'Балл 95+', unlocked: (stats?.averageScore ?? 0) >= 95 },
              ].map(({ icon, label, unlocked }) => (
                <div key={label} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${unlocked ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                  <span className="text-2xl mb-1">{icon}</span>
                  <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-8 py-5 rounded-[2rem] shadow-2xl font-black text-white text-lg flex items-center gap-4 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-7 h-7" /> : <X className="w-7 h-7" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}