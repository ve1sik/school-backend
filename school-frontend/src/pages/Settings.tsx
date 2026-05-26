import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, ShieldCheck, Key, CheckCircle2, X, Loader2, Lock,
  Target, Info, Trash2, BookOpen, Zap, Clock, Award
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 focus:outline-none ${checked ? 'bg-[#5A4BFF]' : 'bg-gray-200'}`}
  >
    <motion.div layout initial={false} animate={{ x: checked ? 26 : 2 }} className="w-5 h-5 bg-white rounded-full shadow-sm" />
  </button>
);

const DAILY_GOALS = [
  { value: 10, label: '10 мин', icon: '🌱', desc: 'Начинающий' },
  { value: 20, label: '20 мин', icon: '📚', desc: 'Стандарт' },
  { value: 30, label: '30 мин', icon: '🚀', desc: 'Активный' },
  { value: 60, label: '1 час', icon: '🔥', desc: 'Интенсив' },
];

export default function Settings() {
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifCards, setNotifCards] = useState(true);

  const [dailyGoal, setDailyGoal] = useState(20);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('settings');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.dailyGoal) setDailyGoal(s.dailyGoal);
        if (s.notifMessages !== undefined) setNotifMessages(s.notifMessages);
        if (s.notifDeadlines !== undefined) setNotifDeadlines(s.notifDeadlines);
        if (s.notifEmail !== undefined) setNotifEmail(s.notifEmail);
        if (s.notifCards !== undefined) setNotifCards(s.notifCards);
      } catch { /* ignore */ }
    }
  }, []);

  const saveLocal = (patch: object) => {
    const saved = JSON.parse(localStorage.getItem('settings') || '{}');
    localStorage.setItem('settings', JSON.stringify({ ...saved, ...patch }));
  };

  const handleToggle = (type: string, val: boolean) => {
    saveLocal({ [type]: val });
    showToast('Настройки сохранены');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Минимум 6 символов'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Пароли не совпадают'); return; }

    setIsSavingPassword(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/auth/change-password`, { oldPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowPasswordModal(false);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Пароль успешно изменён!');
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || 'Неверный текущий пароль');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem('demo_answers');
    localStorage.removeItem('demo_results');
    localStorage.removeItem('demo_attempts');
    showToast('Локальные данные очищены', 'info');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 pt-4">

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Настройки ⚙️</h1>
        <p className="text-gray-500 font-medium text-lg">Персонализируй платформу под себя</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* УВЕДОМЛЕНИЯ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#5A4BFF]">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Уведомления</h2>
          </div>
          <div className="space-y-6">
            {[
              { key: 'notifMessages', val: notifMessages, set: setNotifMessages, title: 'Новые сообщения', desc: 'Ответы куратора в чате' },
              { key: 'notifDeadlines', val: notifDeadlines, set: setNotifDeadlines, title: 'Напоминания о дедлайнах', desc: 'За 24 часа до сдачи' },
              { key: 'notifCards', val: notifCards, set: setNotifCards, title: 'Флеш-карточки', desc: 'Напоминание об ежедневном повторении' },
              { key: 'notifEmail', val: notifEmail, set: setNotifEmail, title: 'Email-рассылка', desc: 'Новости и акции платформы' },
            ].map(({ key, val, set, title, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900">{title}</h4>
                  <p className="text-sm font-medium text-gray-500">{desc}</p>
                </div>
                <ToggleSwitch checked={val} onChange={() => { set(!val); handleToggle(key, !val); }} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* БЕЗОПАСНОСТЬ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Безопасность</h2>
          </div>
          <div className="space-y-4">
            <button onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Изменить пароль</span>
              </div>
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg uppercase tracking-widest">Безопасно</span>
            </button>

            <button onClick={handleClearCache}
              className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-red-100 hover:bg-red-50 transition-all group">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                <div className="text-left">
                  <span className="font-bold text-gray-700 group-hover:text-red-600 transition-colors block">Очистить локальные данные</span>
                  <span className="text-xs text-gray-400">Черновики тестов, кешированные ответы</span>
                </div>
              </div>
              <span className="text-[10px] font-black bg-red-50 text-red-400 px-3 py-1.5 rounded-lg uppercase tracking-widest">Очистить</span>
            </button>
          </div>
        </motion.div>

        {/* ЦЕЛЬ НА ДЕНЬ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Цель на день</h2>
              <p className="text-sm text-gray-400 font-medium">Сколько хочешь учиться каждый день?</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DAILY_GOALS.map((g) => (
              <button key={g.value} onClick={() => { setDailyGoal(g.value); saveLocal({ dailyGoal: g.value }); showToast(`Цель: ${g.label} в день`); }}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${dailyGoal === g.value ? 'border-[#5A4BFF] bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <span className="text-2xl mb-1">{g.icon}</span>
                <span className="font-black text-gray-900">{g.label}</span>
                <span className="text-xs font-bold text-gray-400">{g.desc}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* О ПЛАТФОРМЕ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
              <Info className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">О платформе</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: BookOpen, label: 'Платформа', value: 'Препод из МГУ', color: 'text-indigo-500' },
              { icon: Zap, label: 'Версия', value: '2.0.0', color: 'text-amber-500' },
              { icon: Clock, label: 'Последнее обновление', value: 'Май 2026', color: 'text-emerald-500' },
              { icon: Award, label: 'Тариф', value: 'Полный доступ', color: 'text-purple-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="font-bold text-gray-600">{label}</span>
                </div>
                <span className="font-black text-gray-900 text-sm">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* МОДАЛКА ПАРОЛЯ */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md relative shadow-2xl">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#5A4BFF] mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Изменение пароля</h3>
              <p className="text-gray-500 font-medium mb-6">Минимум 6 символов</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input type="password" placeholder="Текущий пароль" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all font-medium" required />
                <input type="password" placeholder="Новый пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all font-medium" required />
                <input type="password" placeholder="Повторите новый пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all font-medium" required />
                <AnimatePresence>
                  {passwordError && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="text-sm font-bold text-rose-500">{passwordError}</motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={isSavingPassword || !oldPassword || !newPassword || !confirmPassword}
                  className="w-full py-4 mt-2 bg-gray-900 hover:bg-black text-white rounded-xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSavingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить пароль'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.3 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-[#5A4BFF]'
            }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : toast.type === 'error' ? <X className="w-6 h-6" /> : <Info className="w-6 h-6" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
