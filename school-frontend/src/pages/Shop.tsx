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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-20 px-2 md:px-4 pt-2 space-y-6">

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
              
              <div className="bg-[#1A1D26] p-8 relative">
                <button onClick={() => setPaymentModal(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-2xl font-black text-white mb-1">Запись на поток</h2>
                <p className="text-white/60 font-bold text-sm">{paymentModal.title}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2">
                  <CreditCard className="w-5 h-5 text-white/80" />
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/10 resize-none transition-all"
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
                    <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#6C63FF] hover:bg-indigo-50/30 transition-all">
                      {uploadingProof ? (
                        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
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
                  className="w-full py-4 bg-[#1A1D26] hover:bg-black text-white rounded-2xl font-black text-sm transition-all active:scale-[.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submittingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Отправить заявку
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-[28px] md:text-[32px] font-black tracking-tight text-gray-900 leading-none">
        Магазин курсов
      </h1>

      {/* Баннер */}
      <div className="w-full min-h-[120px] md:min-h-[140px] rounded-2xl bg-[#E8ECF2] border border-gray-200/80 flex items-center justify-center px-6 py-8">
        <p className="text-gray-400 font-bold text-sm md:text-base text-center">
          Рекламный баннер предстоящего курса
        </p>
      </div>

      {/* Поиск */}
      <div className="relative w-full max-w-xl">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="найти поток или курс"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-10 py-3 outline-none focus:border-[#6C63FF] transition-all font-medium text-sm text-gray-700 placeholder:text-gray-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredGroups.length === 0 && searchQuery ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Ничего не найдено</h2>
          <p className="text-gray-500 text-sm">Попробуй изменить запрос.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Витрина пока пуста</h2>
          <p className="text-gray-500 text-sm">Скоро здесь появятся новые потоки для записи.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const isOwned = userGroups.includes(group.id);
            const appStatus = myApplications[group.id];
            const featuresList = (group.features && group.features.length > 0)
              ? group.features
              : ['Доступ ко всем урокам', 'Проверка ДЗ', 'Авторские конспекты'];
            const courses = group.courses || [];
            const isCoursesExpanded = expandedCourses[group.id];
            const isPopular = Boolean(group.price > 0 || (group._count?.students ?? 0) >= 3);
            const mentorName = group.curator
              ? `${group.curator.name || ''} ${group.curator.surname || ''}`.trim() || 'Куратор'
              : null;

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Обложка */}
                <div className="relative h-44 bg-[#1A1D26] overflow-hidden">
                  {group.cover_url ? (
                    <img
                      src={getFullUrl(group.cover_url)}
                      alt={group.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1A1D26] flex items-center justify-center">
                      <GraduationCap className="w-16 h-16 text-white/15" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                    {group.start_date ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-md text-[10px] font-black text-gray-900 uppercase tracking-wide shadow-sm">
                        <Calendar className="w-3 h-3" />
                        Старт: {formatShopDate(group.start_date)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EF4444] text-white rounded-md text-[10px] font-black uppercase tracking-wide shadow-sm">
                        <Star className="w-3 h-3 fill-white" />
                        Популярный тариф
                      </span>
                    )}
                  </div>

                  {group.curator && (
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/80 text-white rounded-md text-[10px] font-black uppercase tracking-wide">
                        <ShieldCheck className="w-3 h-3" />
                        С куратором
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-gray-900 mb-4 leading-snug line-clamp-2">
                    {group.title}
                  </h3>

                  {mentorName && (
                    <div className="flex items-center gap-3 mb-4 p-3 bg-[#EEF0FF] rounded-xl">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-indigo-100">
                        {group.curator?.avatar ? (
                          <img src={getFullUrl(group.curator.avatar)} alt="Куратор" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-[#6C63FF] uppercase tracking-wider mb-0.5">Личный наставник</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{mentorName}</p>
                      </div>
                    </div>
                  )}

                  {courses.length > 0 && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setExpandedCourses(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className="flex items-center gap-2 text-[11px] font-black text-[#6C63FF] uppercase tracking-wider mb-2 hover:text-indigo-700 transition-colors"
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

                  <div className="flex gap-3 mb-5 flex-1">
                    <div className="space-y-3 flex-1 min-w-0">
                      {featuresList.slice(0, 3).map((feature: string, index: number) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-lg ${getFeatureBg(index)} flex items-center justify-center shrink-0`}>
                            {getFeatureIcon(index)}
                          </div>
                          <p className="text-[13px] font-bold text-gray-700 leading-snug pt-1">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 self-start px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-right min-w-[88px]">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Стоимость</span>
                      <span className="text-lg font-black text-gray-900 leading-none whitespace-nowrap">
                        {group.price > 0 ? `${group.price.toLocaleString('ru-RU')}₽` : '0₽'}
                      </span>
                    </div>
                  </div>

                  {isOwned ? (
                    <div className="w-full py-3.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                      <CheckCircle2 className="w-4 h-4" /> Куплено
                    </div>
                  ) : appStatus === 'PENDING' ? (
                    <div className="w-full py-3.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                      <Clock className="w-4 h-4" /> На рассмотрении
                    </div>
                  ) : appStatus === 'REJECTED' ? (
                    <button
                      type="button"
                      onClick={() => handleApply(group)}
                      className="w-full py-3.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" /> Отклонено — повторить
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApply(group)}
                      className="w-full py-3.5 bg-[#1A1D26] hover:bg-black text-white rounded-xl font-black text-sm transition-all active:scale-[.98] flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {group.price > 0 ? 'Записаться' : 'Вступить'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
