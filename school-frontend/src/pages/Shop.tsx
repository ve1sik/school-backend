import { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, Sparkles, GraduationCap, CreditCard, Loader2, ShieldCheck, Target, UserCircle, Calendar, Zap, Star, Search, X, AlertCircle, Clock, Send, Upload, BookOpen, ChevronDown, ChevronUp, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getTokenConfig } from '../lib/auth';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${API_URL.replace('/api', '')}/${cleanPath}`;
};

const formatShopDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
  } catch (e) {
    return dateString;
  }
};

const getFeatureIcon = (index: number) => {
  if (index === 0) return <Sparkles className="w-4 h-4 text-amber-500" />;
  if (index === 1) return <Target className="w-4 h-4 text-purple-500" />;
  return <Zap className="w-4 h-4 text-emerald-500" />;
};

const getFeatureBg = (index: number) => {
  if (index === 0) return 'bg-amber-50';
  if (index === 1) return 'bg-purple-50';
  return 'bg-emerald-50';
};

type Toast = { id: string; type: 'success' | 'error'; text: string };

export default function Shop() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Заявки текущего пользователя: { groupId -> 'PENDING'|'APPROVED'|'REJECTED' }
  const [myApplications, setMyApplications] = useState<Record<string, string>>({});

  // Модалка оплаты
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [paymentComment, setPaymentComment] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);

  // Раскрытые курсы в карточке
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  const showToast = (type: 'success' | 'error', text: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, profileRes, appsRes] = await Promise.all([
        axios.get(`${API_URL}/groups/shop`, getTokenConfig()),
        axios.get(`${API_URL}/auth/me`, getTokenConfig()),
        axios.get(`${API_URL}/groups/my-applications`, getTokenConfig()).catch(() => ({ data: [] })),
      ]);
      
      setGroups(groupsRes.data);
      setUserGroups(profileRes.data.groups?.map((g: any) => g.id) || []);

      const appsMap: Record<string, string> = {};
      (appsRes.data || []).forEach((a: any) => { appsMap[a.group_id] = a.status; });
      setMyApplications(appsMap);
    } catch (error) {
      console.error('Ошибка загрузки магазина', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProofUpload = async (file: File) => {
    if (!file) return;
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { ...getTokenConfig().headers, 'Content-Type': 'multipart/form-data' },
      });
      setPaymentProof(res.data.url || res.data.path || '');
    } catch {
      showToast('error', 'Ошибка загрузки файла');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleApply = async (group: any) => {
    // Бесплатные группы — просто зачисляем напрямую
    if (!group.price || group.price === 0) {
      try {
        await axios.post(`${API_URL}/groups/${group.id}/enroll`, {}, getTokenConfig());
        setUserGroups(prev => [...prev, group.id]);
        showToast('success', '🚀 Вы записаны! Курсы добавлены в личный кабинет');
      } catch {
        showToast('error', 'Ошибка при записи. Попробуй ещё раз.');
      }
      return;
    }

    // Платная группа — показываем модалку
    setPaymentModal(group);
    setPaymentComment('');
    setPaymentProof('');
  };

  const handleSubmitApplication = async () => {
    if (!paymentModal) return;
    setSubmittingApp(true);
    try {
      await axios.post(
        `${API_URL}/groups/${paymentModal.id}/apply`,
        { comment: paymentComment, proof_image: paymentProof || undefined },
        getTokenConfig(),
      );
      setMyApplications(prev => ({ ...prev, [paymentModal.id]: 'PENDING' }));
      setPaymentModal(null);
      showToast('success', '✅ Заявка отправлена! Ожидайте подтверждения.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Ошибка при отправке заявки');
    } finally {
      setSubmittingApp(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.courses || []).some((c: any) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-20">

      {/* Toast уведомления */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-xs
                ${t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
              {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Модалка оплаты */}
      <AnimatePresence>
        {paymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setPaymentModal(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
              
              <div className="bg-gradient-to-br from-[#5A4BFF] to-indigo-700 p-8 relative">
                <button onClick={() => setPaymentModal(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-2xl font-black text-white mb-1">Запись на поток</h2>
                <p className="text-indigo-200 font-bold text-sm">{paymentModal.title}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-2xl px-4 py-2">
                  <CreditCard className="w-5 h-5 text-[#00FFCC]" />
                  <span className="text-2xl font-black text-white">{paymentModal.price?.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {paymentModal.payment_qr_url && (
                  <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-5 text-center">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                      <QrCode className="w-4 h-4" /> QR для оплаты
                    </p>
                    <a href={getFullUrl(paymentModal.payment_qr_url)} target="_blank" rel="noreferrer" className="block bg-white rounded-[1.5rem] border border-amber-100 p-4 shadow-sm">
                      <img src={getFullUrl(paymentModal.payment_qr_url)} alt="QR для оплаты" className="w-full max-w-sm mx-auto max-h-[420px] object-contain" />
                    </a>
                    <p className="text-[11px] font-bold text-amber-600 mt-3">Нажми на QR, чтобы открыть крупнее. После оплаты прикрепи скрин ниже.</p>
                  </div>
                )}

                {!paymentModal.payment_qr_url && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
                    <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">QR для оплаты пока не добавлен. Уточните оплату у куратора.</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Комментарий к заявке</label>
                  <textarea
                    value={paymentComment}
                    onChange={e => setPaymentComment(e.target.value)}
                    placeholder="Например: оплатил(а) 15 мая, перевод от Иванова А.И."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:border-[#5A4BFF] focus:ring-2 focus:ring-[#5A4BFF]/10 resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Скриншот оплаты (необязательно)</label>
                  {paymentProof ? (
                    <div className="relative rounded-2xl overflow-hidden border border-emerald-200">
                      <img src={getFullUrl(paymentProof)} alt="Чек" className="w-full max-h-48 object-contain bg-gray-50" />
                      <button onClick={() => setPaymentProof('')} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#5A4BFF] hover:bg-indigo-50/30 transition-all">
                      {uploadingProof ? (
                        <Loader2 className="w-8 h-8 text-[#5A4BFF] animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-300" />
                          <span className="text-sm font-bold text-gray-400">Прикрепить скриншот чека</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingProof}
                        onChange={e => e.target.files?.[0] && handleProofUpload(e.target.files[0])} />
                    </label>
                  )}
                </div>

                <button
                  onClick={handleSubmitApplication}
                  disabled={submittingApp}
                  className="w-full py-4 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white rounded-2xl font-black text-sm transition-all active:scale-[.98] shadow-lg shadow-[#5A4BFF]/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submittingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Отправить заявку
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mb-12 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-gray-900 via-indigo-900 to-[#5A4BFF] p-10 md:p-16 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 mb-6 shadow-sm">
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Набор открыт</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
              Твой билет на <span className="text-[#00FFCC]">бюджет</span>
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 font-medium leading-relaxed max-w-xl">
              Выбирай направление, залетай на поток и готовься к экзаменам с лучшими преподами в топовой тусовке.
            </p>
          </div>
          
          <div className="hidden lg:flex w-32 h-32 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 items-center justify-center shrink-0 rotate-12 hover:rotate-0 transition-all duration-500 shadow-xl">
            <ShoppingCart className="w-16 h-16 text-[#00FFCC]" />
          </div>
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-8 relative max-w-md">
        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Найти поток или курс..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-10 py-3.5 outline-none focus:border-[#5A4BFF] focus:ring-4 focus:ring-[#5A4BFF]/10 transition-all font-bold text-gray-700 shadow-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredGroups.length === 0 && searchQuery ? (
        <div className="bg-white rounded-[3rem] p-12 text-center border border-gray-100 shadow-sm">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Ничего не найдено</h2>
          <p className="text-gray-500">Попробуй изменить запрос.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-12 text-center border border-gray-100 shadow-sm">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Витрина пока пуста</h2>
          <p className="text-gray-500">Скоро здесь появятся новые потоки для записи.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGroups.map((group) => {
            const isOwned = userGroups.includes(group.id);
            const appStatus = myApplications[group.id];
            const featuresList = (group.features && group.features.length > 0) ? group.features : ['Доступ ко всем урокам', 'Проверка ДЗ', 'Авторские конспекты'];
            const courses = group.courses || [];
            const isCoursesExpanded = expandedCourses[group.id];
            
            return (
              <motion.div 
                whileHover={{ y: -8 }}
                key={group.id} 
                className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col group/card transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
              >
                <div className="relative h-56 bg-gray-100 overflow-hidden">
                  {group.cover_url ? (
                    <img src={getFullUrl(group.cover_url)} alt={group.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover/card:scale-105 transition-transform duration-700 ease-out">
                      <GraduationCap className="w-20 h-20 text-white/20" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent"></div>
                  
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <div className="flex flex-col gap-2 items-start">
                      {group.curator && (
                        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black text-gray-900 uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-[#5A4BFF]" /> С куратором
                        </div>
                      )}
                    </div>
                  </div>

                  {group.start_date && (
                    <div className="absolute bottom-4 left-6 flex items-center gap-2 text-white font-bold text-sm bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                      <Calendar className="w-4 h-4 text-[#00FFCC]" /> Старт: {formatShopDate(group.start_date)}
                    </div>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight line-clamp-2">
                    {group.title}
                  </h3>

                  {/* Список курсов */}
                  {courses.length > 0 && (
                    <div className="mb-5">
                      <button
                        onClick={() => setExpandedCourses(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className="flex items-center gap-2 text-xs font-black text-[#5A4BFF] uppercase tracking-widest mb-2 hover:text-indigo-700 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {courses.length} {courses.length === 1 ? 'курс' : courses.length < 5 ? 'курса' : 'курсов'}
                        {isCoursesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <AnimatePresence>
                        {isCoursesExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="space-y-1.5 pb-1">
                              {courses.map((course: any) => (
                                <div key={course.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="text-xs font-bold text-gray-700 line-clamp-1">{course.title}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {group.curator && (
                    <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-gray-200">
                        {group.curator.avatar ? (
                          <img src={getFullUrl(group.curator.avatar)} alt="Куратор" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#5A4BFF] uppercase tracking-widest mb-0.5">Личный наставник</p>
                        <p className="text-sm font-bold text-gray-900">{group.curator.name || 'Куратор'} {group.curator.surname || ''}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 mb-8 flex-1">
                    {featuresList.map((feature: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl ${getFeatureBg(index)} flex items-center justify-center shrink-0`}>
                          {getFeatureIcon(index)}
                        </div>
                        <p className="text-sm font-bold text-gray-700 leading-snug pt-1.5">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Стоимость</span>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                          {group.price > 0 ? `${group.price.toLocaleString('ru-RU')} ₽` : 'Бесплатно'}
                        </span>
                      </div>
                      {group._count?.students > 0 && (
                        <span className="text-[10px] font-bold text-emerald-500 block mt-1.5">
                          {group._count.students} учеников уже учатся
                        </span>
                      )}
                    </div>
                    
                    {isOwned ? (
                      <div className="px-6 py-4 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl font-black text-sm flex items-center gap-2 cursor-not-allowed shrink-0">
                        <CheckCircle2 className="w-5 h-5" /> КУПЛЕНО
                      </div>
                    ) : appStatus === 'PENDING' ? (
                      <div className="px-5 py-4 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-black text-xs flex items-center gap-2 cursor-not-allowed shrink-0">
                        <Clock className="w-4 h-4" /> НА РАССМОТРЕНИИ
                      </div>
                    ) : appStatus === 'REJECTED' ? (
                      <button
                        onClick={() => handleApply(group)}
                        className="px-5 py-4 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shrink-0"
                      >
                        <AlertCircle className="w-4 h-4" /> ОТКЛОНЕНО — ПОВТОРИТЬ
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleApply(group)}
                        className="px-8 py-4 bg-gray-900 hover:bg-[#5A4BFF] text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center gap-2 group-hover/card:shadow-[#5A4BFF]/30 shrink-0"
                      >
                        <CreditCard className="w-4 h-4" />
                        {group.price > 0 ? 'ЗАПИСАТЬСЯ' : 'ВСТУПИТЬ'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
