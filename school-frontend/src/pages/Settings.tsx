import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldCheck, Key, Moon, CheckCircle2, X, Loader2, Lock } from 'lucide-react';

export default function Settings() {
  // Стейты для уведомлений
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Стейты для модалки пароля
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Имитация автосохранения настроек уведомлений
  const handleToggle = (type: 'messages' | 'deadlines' | 'email') => {
    if (type === 'messages') setNotifMessages(!notifMessages);
    if (type === 'deadlines') setNotifDeadlines(!notifDeadlines);
    if (type === 'email') setNotifEmail(!notifEmail);
    
    showToast('Настройки уведомлений обновлены');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Новые пароли не совпадают');
      return;
    }

    setIsSavingPassword(true);
    
    try {
      // Имитация задержки сети
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Пароль успешно изменен!');
    } catch (err) {
      setPasswordError('Неверный старый пароль или ошибка сервера');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Компонент тумблера (Switch)
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 focus:outline-none ${checked ? 'bg-[#5A4BFF]' : 'bg-gray-200'}`}
    >
      <motion.div
        layout
        initial={false}
        animate={{ x: checked ? 26 : 2 }}
        className="w-5 h-5 bg-white rounded-full shadow-sm"
      />
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 pt-4">
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2 flex items-center gap-3">
          Настройки <span className="text-[#5A4BFF] text-3xl">⚙️</span>
        </h1>
        <p className="text-gray-500 font-medium text-lg">Управление уведомлениями и безопасностью аккаунта.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* БЛОК: УВЕДОМЛЕНИЯ */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#5A4BFF]">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Уведомления</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900">Новые сообщения</h4>
                <p className="text-sm font-medium text-gray-500">Ответы куратора в чате</p>
              </div>
              <ToggleSwitch checked={notifMessages} onChange={() => handleToggle('messages')} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900">Напоминания о дедлайнах</h4>
                <p className="text-sm font-medium text-gray-500">За 24 часа до сдачи</p>
              </div>
              <ToggleSwitch checked={notifDeadlines} onChange={() => handleToggle('deadlines')} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900">Email рассылка</h4>
                <p className="text-sm font-medium text-gray-500">Новости и акции платформы</p>
              </div>
              <ToggleSwitch checked={notifEmail} onChange={() => handleToggle('email')} />
            </div>
          </div>
        </motion.div>

        {/* БЛОК: БЕЗОПАСНОСТЬ */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Безопасность</h2>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Изменить пароль</span>
              </div>
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                Обновлен вчера
              </span>
            </button>

            <button 
              onClick={() => showToast('Темная тема появится в следующем обновлении! 🌙', 'info')}
              className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400 group-hover:text-[#5A4BFF] transition-colors" />
                <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Темная тема</span>
              </div>
              <span className="text-[10px] font-black bg-indigo-50 text-[#5A4BFF] px-3 py-1.5 rounded-lg uppercase tracking-widest">
                Скоро
              </span>
            </button>
          </div>
        </motion.div>

      </div>

      {/* МОДАЛКА ИЗМЕНЕНИЯ ПАРОЛЯ */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md relative shadow-2xl"
            >
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#5A4BFF] mb-6">
                <Lock className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-2">Изменение пароля</h3>
              <p className="text-gray-500 font-medium mb-6">Придумайте надежный пароль, состоящий минимум из 6 символов.</p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <input 
                    type="password" 
                    placeholder="Текущий пароль" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    placeholder="Новый пароль" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    placeholder="Повторите новый пароль" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                    required
                  />
                </div>

                <AnimatePresence>
                  {passwordError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm font-bold text-rose-500">
                      {passwordError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={isSavingPassword || !oldPassword || !newPassword || !confirmPassword}
                  className="w-full py-4 mt-2 bg-gray-900 hover:bg-black text-white rounded-xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить пароль'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST УВЕДОМЛЕНИЯ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-emerald-500' : 
              toast.type === 'error' ? 'bg-rose-500' : 
              'bg-[#5A4BFF]'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
             toast.type === 'error' ? <X className="w-6 h-6" /> : 
             <Moon className="w-6 h-6" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}