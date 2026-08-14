import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  CreditCard,
  Loader2,
  ShieldCheck,
  Target,
  UserCircle,
  Calendar,
  Zap,
  Star,
  Search,
  X,
  AlertCircle,
  Clock,
  Send,
  Upload,
  BookOpen,
  ChevronDown,
  ChevronUp,
  QrCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getTokenConfig } from '../lib/auth';
import { API_URL, SITE_ORIGIN } from '../lib/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${SITE_ORIGIN}/${cleanPath}`;
};

/** Figma badge: «СТАРТ: 5 СЕНТЯБРЯ» */
const formatShopDateBadge = (dateString: string) => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    const months = [
      'ЯНВАРЯ',
      'ФЕВРАЛЯ',
      'МАРТА',
      'АПРЕЛЯ',
      'МАЯ',
      'ИЮНЯ',
      'ИЮЛЯ',
      'АВГУСТА',
      'СЕНТЯБРЯ',
      'ОКТЯБРЯ',
      'НОЯБРЯ',
      'ДЕКАБРЯ',
    ];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]}`;
  } catch {
    return dateString;
  }
};

const getFeatureIcon = (index: number) => {
  if (index === 0) return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
  if (index === 1) return <Target className="w-3.5 h-3.5 text-[#6C63FF]" />;
  return <Zap className="w-3.5 h-3.5 text-emerald-500" />;
};

const getFeatureBg = (index: number) => {
  if (index === 0) return 'bg-amber-50';
  if (index === 1) return 'bg-[#EEEAFF]';
  return 'bg-emerald-50';
};

type Toast = { id: string; type: 'success' | 'error'; text: string };

export default function Shop() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [myApplications, setMyApplications] = useState<Record<string, string>>({});
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [paymentComment, setPaymentComment] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  const showToast = (type: 'success' | 'error', text: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
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
      (appsRes.data || []).forEach((a: any) => {
        appsMap[a.group_id] = a.status;
      });
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
    if (!group.price || group.price === 0) {
      try {
        await axios.post(`${API_URL}/groups/${group.id}/enroll`, {}, getTokenConfig());
        setUserGroups((prev) => [...prev, group.id]);
        showToast('success', '🚀 Вы записаны! Курсы добавлены в личный кабинет');
      } catch {
        showToast('error', 'Ошибка при записи. Попробуй ещё раз.');
      }
      return;
    }
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
      setMyApplications((prev) => ({ ...prev, [paymentModal.id]: 'PENDING' }));
      setPaymentModal(null);
      showToast('success', '✅ Заявка отправлена! Ожидайте подтверждения.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Ошибка при отправке заявки');
    } finally {
      setSubmittingApp(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      !searchQuery ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.courses || []).some((c: any) => c.title.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-0 pb-16 font-[Golos_Text,system-ui,sans-serif] space-y-5">
      {/* Toasts */}
      <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex flex-col gap-3 pointer-events-none items-stretch md:items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm w-full md:max-w-xs ${
                t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Payment modal — keep behavior, restyle lightly */}
      <AnimatePresence>
        {paymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPaymentModal(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 24 }}
              className="bg-white rounded-t-[1.5rem] md:rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-[env(safe-area-inset-bottom)] md:pb-0"
            >
              <div className="bg-[#1A1D26] p-6 md:p-8 relative shrink-0">
                <div className="md:hidden w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
                <button
                  onClick={() => setPaymentModal(null)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-xl md:text-2xl font-black text-white mb-1">Запись на поток</h2>
                <p className="text-white/60 font-bold text-sm">{paymentModal.title}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2">
                  <CreditCard className="w-5 h-5 text-white/80" />
                  <span className="text-2xl font-black text-white">
                    {paymentModal.price?.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="p-5 md:p-8 space-y-5 md:space-y-6 overflow-y-auto flex-1 min-h-0">
                {paymentModal.payment_qr_url && (
                  <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-5 text-center">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                      <QrCode className="w-4 h-4" /> QR для оплаты
                    </p>
                    <a
                      href={getFullUrl(paymentModal.payment_qr_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-white rounded-[1.5rem] border border-amber-100 p-4 shadow-sm"
                    >
                      <img
                        src={getFullUrl(paymentModal.payment_qr_url)}
                        alt="QR для оплаты"
                        className="w-full max-w-sm mx-auto max-h-[420px] object-contain"
                      />
                    </a>
                    <p className="text-[11px] font-bold text-amber-600 mt-3">
                      Нажми на QR, чтобы открыть крупнее. После оплаты прикрепи скрин ниже.
                    </p>
                  </div>
                )}

                {!paymentModal.payment_qr_url && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
                    <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">
                      QR для оплаты пока не добавлен. Уточните оплату у куратора.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">
                    Комментарий к заявке
                  </label>
                  <textarea
                    value={paymentComment}
                    onChange={(e) => setPaymentComment(e.target.value)}
                    placeholder="Например: оплатил(а) 15 мая, перевод от Иванова А.И."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/10 resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">
                    Скриншот оплаты (необязательно)
                  </label>
                  {paymentProof ? (
                    <div className="relative rounded-2xl overflow-hidden border border-emerald-200">
                      <img
                        src={getFullUrl(paymentProof)}
                        alt="Чек"
                        className="w-full max-h-48 object-contain bg-gray-50"
                      />
                      <button
                        onClick={() => setPaymentProof('')}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                      >
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
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingProof}
                        onChange={(e) => e.target.files?.[0] && handleProofUpload(e.target.files[0])}
                      />
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

      {/* Figma: promo banner */}
      <div className="w-full min-h-[112px] md:min-h-[128px] rounded-[16px] bg-[#E5E9F0] flex items-center justify-center px-6 py-8">
        <p className="text-[#9CA3AF] font-semibold text-[14px] md:text-[15px] text-center">
          Рекламный баннер предстоящего курса
        </p>
      </div>

      {/* Figma: search */}
      <div className="relative w-full max-w-none md:max-w-[520px]">
        <Search className="w-[18px] h-[18px] text-[#B0B5C3] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="НАЙТИ ПОТОК ИЛИ КУРС"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-[#E5E7EB] rounded-full pl-11 pr-10 py-[12px] outline-none focus:border-[#6C63FF] transition-all font-medium text-[13px] text-gray-700 placeholder:text-[#B0B5C3] placeholder:uppercase placeholder:tracking-[0.04em] placeholder:font-semibold"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredGroups.length === 0 && searchQuery ? (
        <div className="bg-white rounded-[16px] p-12 text-center border border-[#E5E7EB]">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Ничего не найдено</h2>
          <p className="text-gray-500 text-sm">Попробуй изменить запрос.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-[16px] p-12 text-center border border-[#E5E7EB]">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Витрина пока пуста</h2>
          <p className="text-gray-500 text-sm">Скоро здесь появятся новые потоки для записи.</p>
        </div>
      ) : (
        <div
          className="grid gap-4 md:gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}
        >
          {filteredGroups.map((group) => {
            const isOwned = userGroups.includes(group.id);
            const appStatus = myApplications[group.id];
            const featuresList =
              group.features && group.features.length > 0
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
                className="bg-white rounded-[16px] border border-[#E5E7EB] overflow-hidden flex flex-col hover:shadow-[0_8px_24px_rgba(17,24,39,0.06)] transition-shadow"
              >
                {/* Cover — Figma dark header */}
                <div className="relative h-[180px] md:h-[168px] bg-[#1A1D26] overflow-hidden">
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

                  <div className="absolute top-3 left-3 right-3 flex flex-wrap justify-between items-start gap-2">
                    {group.start_date ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full text-[10px] font-bold text-[#6C63FF] uppercase tracking-wide shadow-sm">
                        <Calendar className="w-3 h-3" />
                        Старт: {formatShopDateBadge(group.start_date)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EF4444] text-white rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
                        <Star className="w-3 h-3 fill-white" />
                        Популярный тариф
                      </span>
                    )}
                  </div>

                  {group.curator && (
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/75 text-white rounded-full text-[10px] font-bold uppercase tracking-wide border border-white/25">
                        <ShieldCheck className="w-3 h-3" />С куратором
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-[18px] md:text-[20px] font-bold text-[#111827] mb-3.5 leading-snug line-clamp-2 tracking-tight">
                    {group.title}
                  </h3>

                  {mentorName && (
                    <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-[#EEF0FF] border border-[#E0E4FF] rounded-[12px]">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#E0E4FF]">
                        {group.curator?.avatar ? (
                          <img
                            src={getFullUrl(group.curator.avatar)}
                            alt="Куратор"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-[0.06em]">
                          Личный наставник
                        </p>
                        <p className="text-[14px] font-bold text-[#111827] truncate mt-0.5">{mentorName}</p>
                      </div>
                    </div>
                  )}

                  {courses.length > 0 && (
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCourses((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                        }
                        className="flex items-center gap-2 text-[11px] font-bold text-[#6C63FF] uppercase tracking-wider mb-2 hover:text-indigo-700 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {courses.length}{' '}
                        {courses.length === 1 ? 'курс' : courses.length < 5 ? 'курса' : 'курсов'}
                        {isCoursesExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isCoursesExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1.5 pb-1">
                              {courses.map((course: any) => (
                                <div
                                  key={course.id}
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="text-xs font-bold text-gray-700 line-clamp-1">
                                    {course.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="flex gap-3 mb-5 flex-1 items-start">
                    <div className="space-y-2.5 flex-1 min-w-0">
                      {featuresList.slice(0, 3).map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg ${getFeatureBg(index)} flex items-center justify-center shrink-0`}
                          >
                            {getFeatureIcon(index)}
                          </div>
                          <p className="text-[13px] font-semibold text-[#374151] leading-snug">
                            {feature}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 px-3 py-2 rounded-[10px] border border-[#E5E7EB] bg-white text-right min-w-[96px]">
                      <span className="text-[10px] font-semibold text-[#9CA3AF] block mb-0.5">
                        Стоимость
                      </span>
                      <span className="text-[18px] font-extrabold text-[#111827] leading-none whitespace-nowrap">
                        {group.price > 0 ? `${group.price.toLocaleString('ru-RU')}₽` : '0₽'}
                      </span>
                    </div>
                  </div>

                  {isOwned ? (
                    <div className="w-full py-[14px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-[12px] font-bold text-[13px] flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wide">
                      <CheckCircle2 className="w-4 h-4" /> Куплено
                    </div>
                  ) : appStatus === 'PENDING' ? (
                    <div className="w-full py-[14px] bg-amber-50 text-amber-600 border border-amber-200 rounded-[12px] font-bold text-[13px] flex items-center justify-center gap-2 cursor-not-allowed">
                      <Clock className="w-4 h-4" /> На рассмотрении
                    </div>
                  ) : appStatus === 'REJECTED' ? (
                    <button
                      type="button"
                      onClick={() => handleApply(group)}
                      className="w-full py-[14px] bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-[12px] font-bold text-[13px] transition-all flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" /> Отклонено — повторить
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApply(group)}
                      className="w-full py-[14px] bg-[#1A1D26] hover:bg-black text-white rounded-[12px] font-bold text-[13px] uppercase tracking-[0.04em] transition-all active:scale-[.99] flex items-center justify-center gap-2"
                    >
                      {group.price > 0 ? 'ЗАПИСАТЬСЯ' : 'ВСТУПИТЬ'}
                      <CreditCard className="w-4 h-4" />
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
