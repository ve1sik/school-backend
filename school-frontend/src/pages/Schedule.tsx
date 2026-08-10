import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Link as LinkIcon, Plus, X, Trash2, Loader2, AlertCircle, Sparkles, Search, Users, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { decodeToken, getToken } from '../lib/auth';
import { parseSafeDate } from '../lib/parseDate';

import { API_URL, SITE_ORIGIN, resolveUploadUrl } from '../lib/api';

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  WEBINAR: 'Лекция',
  DEADLINE: 'Дедлайн',
  OFFLINE: 'Офлайн',
};

const MONTH_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const getEventTypeLabel = (ev: any) => {
  if (ev.custom_type?.trim()) return ev.custom_type.trim();
  return DEFAULT_TYPE_LABELS[ev.type] || ev.type || 'Событие';
};

/** Figma Inspect Groups 15–18 — card 327×100, border 0.5px #5C38A3 / #D3412E */
const getSubjectTheme = (ev: any) => {
  const hay = `${ev?.group?.title || ''} ${ev?.title || ''}`.toLowerCase();
  if (/истор/.test(hay)) {
    return {
      key: 'history' as const,
      short: 'ИСТОРИЯ',
      color: '#D3412E',
      badge: 'bg-[#D3412E] text-white',
      border: 'border-[#D3412E]',
      pill: 'bg-[#D3412E] text-white',
      title: 'text-[#D3412E]',
      datePill: 'border-[#D3412E] text-[#D3412E]',
    };
  }
  return {
    key: 'russian' as const,
    short: 'РУССКИЙ ЯЗЫК',
    color: '#5C38A3',
    badge: 'bg-[#5C38A3] text-white',
    border: 'border-[#5C38A3]',
    pill: 'bg-[#5C38A3] text-white',
    title: 'text-[#5C38A3]',
    datePill: 'border-[#5C38A3] text-[#5C38A3]',
  };
};

const formatEventCardDate = (d: Date) => {
  const day = d.getDate();
  const mon = MONTH_GENITIVE[d.getMonth()].toUpperCase();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} ${hh}:${mm}`;
};

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔥 БРОНЕБОЙНАЯ ПРОВЕРКА НА АДМИНА (читаем прямо из токена)
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageSchedule, setCanManageSchedule] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    try {
      const token = getToken();
      if (token) {
        const payload = decodeToken();
        if (payload?.role === 'ADMIN') {
          setIsAdmin(true);
        }
        if (['ADMIN', 'CURATOR', 'TEACHER'].includes(payload?.role || '')) {
          setCanManageSchedule(true);
        }
      }
    } catch (e) {
      console.error('Ошибка расшифровки токена');
    }
  }, []);

  useEffect(() => {
    if (!canManageSchedule) return;
    const loadGroups = async () => {
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/schedule/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroups(Array.isArray(res.data) ? res.data : []);
      } catch {
        setGroups([]);
      }
    };
    loadGroups();
  }, [canManageSchedule]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDateTitle, setSelectedDateTitle] = useState('');

  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'WEBINAR',
    custom_type: '',
    link: '',
    description: '',
    group_id: '',
    repeat_weeks: 2,
    useRepeat: false,
  });

  const normalizeEventLink = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const resetForm = () => {
    setEditingEventId(null);
    setFormData({
      title: '',
      date: '',
      time: '',
      type: 'WEBINAR',
      custom_type: '',
      link: '',
      description: '',
      group_id: '',
      repeat_weeks: 2,
      useRepeat: false,
    });
    setSaveError('');
  };

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => String(g.title || '').toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const selectedGroupTitle = useMemo(
    () => groups.find((g) => g.id === formData.group_id)?.title || '',
    [groups, formData.group_id],
  );

  useEffect(() => {
    if (showAddModal) setGroupSearch('');
  }, [showAddModal]);

  const fetchEvents = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/schedule`, { headers: { Authorization: `Bearer ${token}` } });
      setEvents(res.data);
    } catch (err) { console.error('Ошибка загрузки расписания', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const buildEventDateTime = (): string | null => {
    if (!formData.date || !formData.time) return null;
    const time = formData.time.length === 5 ? `${formData.time}:00` : formData.time;
    const d = new Date(`${formData.date}T${time}`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const eventDateTime = buildEventDateTime();
    if (!eventDateTime) {
      setSaveError('Проверьте дату и время — не удалось собрать дату события.');
      return;
    }
    if (formData.type === 'CUSTOM' && !formData.custom_type.trim()) {
      setSaveError('Укажите своё название типа события.');
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      const repeatWeeks = formData.useRepeat ? Math.max(2, Number(formData.repeat_weeks) || 2) : 0;
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        date: eventDateTime,
        type: formData.type === 'CUSTOM' ? 'WEBINAR' : formData.type,
        custom_type: formData.type === 'CUSTOM' ? formData.custom_type.trim() : (formData.custom_type?.trim() || undefined),
        link: normalizeEventLink(formData.link) || undefined,
        group_id: formData.group_id || undefined,
      };
      if (!editingEventId && formData.useRepeat && repeatWeeks > 1) {
        payload.repeat_weeks = repeatWeeks;
      }

      if (editingEventId) {
        await axios.patch(`${API_URL}/schedule/${editingEventId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_URL}/schedule`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }

      setShowAddModal(false);
      setGroupSearch('');
      resetForm();
      setShowDayModal(false);
      fetchEvents();
    } catch (err: any) {
      console.error('Ошибка сохранения события', err);
      const msg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.message) ? err.response.data.message.join(', ') : null) ||
        err?.response?.data?.error ||
        'Не удалось сохранить событие. Проверьте поля и попробуйте снова.';
      setSaveError(typeof msg === 'string' ? msg : 'Не удалось сохранить событие.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditEvent = (ev: any) => {
    const d = parseSafeDate(ev.date);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setEditingEventId(ev.id);
    setFormData({
      title: ev.title || '',
      date: d.toISOString().slice(0, 10),
      time: `${hh}:${mm}`,
      type: ev.custom_type ? 'CUSTOM' : (ev.type || 'WEBINAR'),
      custom_type: ev.custom_type || '',
      link: ev.link || '',
      description: ev.description || '',
      group_id: ev.group_id || ev.group?.id || '',
      repeat_weeks: 2,
      useRepeat: false,
    });
    setShowDayModal(false);
    setShowAddModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/schedule/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchEvents();
      setShowDayModal(false);
    } catch (err) { console.error('Ошибка удаления', err); }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  if (firstDayOfMonth === 0) firstDayOfMonth = 7; 
  firstDayOfMonth--; 

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const handleDayClick = (day: number, thisDate: Date) => {
    const clickedDate = thisDate.toDateString();
    setSelectedDayKey(clickedDate);
    const dayEvents = events.filter(e => parseSafeDate(e.date).toDateString() === clickedDate);
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setSelectedDateTitle(`${day} ${monthNames[currentDate.getMonth()].toLowerCase()}`);
      setShowDayModal(true);
    }
  };

  // Ближайшие события — до 4 карточек как в макете
  const now = new Date();
  const upcomingEvents = events
    .filter(e => parseSafeDate(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime())
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 px-0 pt-0.5 flex flex-col gap-[clamp(0.75rem,1.5vw,1rem)] overflow-y-auto md:overflow-hidden pb-4 md:pb-0 font-[Golos_Text,system-ui,sans-serif] scrollbar-hide">
      {/* Title + Add — Figma Group 19: h 26, radius 6 */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <h1 className="sched-page-title text-[clamp(1.35rem,2vw,1.75rem)] font-extrabold tracking-tight text-[#0E1829] leading-none">
          Расписание
        </h1>
        {canManageSchedule && (
          <button
            type="button"
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="inline-flex items-center gap-1.5 h-[26px] px-3 bg-[#0E1829] hover:bg-black text-white text-[10px] font-bold uppercase tracking-[0.04em] rounded-[6px] transition-colors active:scale-95"
          >
            <Plus className="w-3 h-3" /> ДОБАВИТЬ СОБЫТИЕ
          </button>
        )}
      </div>

      {/* Cards — Figma 327×100 @ full width; scale with page (4-col fluid grid) */}
      {upcomingEvents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[clamp(0.5rem,1vw,0.75rem)] shrink-0 w-full">
          {upcomingEvents.map((ev) => {
            const theme = getSubjectTheme(ev);
            const evDate = parseSafeDate(ev.date);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  if (ev.link) {
                    window.open(ev.link, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  const d = parseSafeDate(ev.date);
                  setSelectedDayEvents([ev]);
                  setSelectedDateTitle(`${d.getDate()} ${monthNames[d.getMonth()].toLowerCase()}`);
                  setShowDayModal(true);
                }}
                className={`text-left bg-white border-[0.5px] ${theme.border} rounded-[13px] w-full aspect-[327/100] min-h-[88px] max-h-[110px] px-[clamp(0.5rem,1.2vw,1rem)] py-[clamp(0.5rem,1vw,0.75rem)] hover:shadow-sm transition-shadow flex flex-col`}
              >
                <div className="flex items-start justify-between gap-2 shrink-0">
                  <span className={`text-[8px] font-bold uppercase tracking-[0.04em] px-1.5 py-[3px] rounded-[4px] leading-none ${theme.badge}`}>
                    {theme.short}
                  </span>
                  <span className={`text-[8px] font-semibold whitespace-nowrap shrink-0 px-1.5 py-[2px] rounded-full border-[0.5px] leading-none ${theme.datePill}`}>
                    {formatEventCardDate(evDate)}
                  </span>
                </div>
                <p className={`sched-card-title mt-auto uppercase line-clamp-2 ${theme.title}`}>
                  {ev.title}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#0E1829] leading-none">{getEventTypeLabel(ev)}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar — border #98A1B0/40; cells ~175×95 radius 9; selected #5C38A3 */}
      <div className="bg-white border border-[#98A1B0]/40 rounded-[12px] p-3 md:p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h2 className="sched-month-title text-[20px] text-[#0E1829]">
            {monthNames[currentDate.getMonth()]}{' '}
            <span className="font-medium text-[#98A1B0]">{currentDate.getFullYear()}</span>
          </h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 bg-[#0E1829] text-white flex items-center justify-center hover:bg-black transition-colors rounded-[8px]"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 bg-[#0E1829] text-white flex items-center justify-center hover:bg-black transition-colors rounded-[8px]"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0 md:auto-rows-[minmax(95px,1fr)] auto-rows-fr">
          {Array(firstDayOfMonth).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[52px] md:min-h-0 rounded-[9px] bg-transparent" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayKey = thisDate.toDateString();
            const isSelected = selectedDayKey === dayKey || (!selectedDayKey && dayKey === now.toDateString());
            const dayEvents = events.filter(
              (e) => parseSafeDate(e.date).toDateString() === dayKey,
            );

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day, thisDate)}
                className={`min-h-[52px] md:min-h-0 p-1.5 rounded-[9px] bg-white relative cursor-pointer transition-colors hover:bg-[#F8F9FC] overflow-hidden flex flex-col
                  ${isSelected ? 'border border-[#5C38A3]' : 'border border-[#EEF0F4]'}`}
              >
                <div className="font-semibold text-[12px] text-[#0E1829] mb-1 leading-none tabular-nums shrink-0">{day}</div>
                <div className="space-y-0.5 mt-auto">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const theme = getSubjectTheme(ev);
                    return (
                      <div
                        key={ev.id}
                        className={`text-[6px] md:text-[7px] font-bold uppercase tracking-[0.02em] px-1 py-[2px] rounded-[3px] truncate ${theme.pill}`}
                        title={ev.title}
                      >
                        {theme.short}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[7px] font-semibold text-gray-400 px-0.5">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showDayModal && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-md flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl relative p-8 md:p-10 border border-white/20">
              <button onClick={() => setShowDayModal(false)} className="absolute top-6 right-6 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#5A4BFF]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedDateTitle}</h3>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Запланировано событий: {selectedDayEvents.length}</p>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} className="p-6 rounded-[2rem] border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative group">
                    {canManageSchedule && (
                      <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button type="button" onClick={() => openEditEvent(ev)} className="p-2 text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl"><Pencil className="w-5 h-5"/></button>
                        <button type="button" onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-gray-300 hover:bg-rose-50 hover:text-rose-500 rounded-xl"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100">
                        {getEventTypeLabel(ev)}
                      </span>
                      {ev.group?.title && (
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-100">
                          {ev.group.title}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {parseSafeDate(ev.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    <h4 className="text-xl font-black text-gray-900 mb-2">{ev.title}</h4>
                    {ev.description && <p className="text-base font-medium text-gray-600 mb-6 leading-relaxed">{ev.description}</p>}
                    
                    {ev.link && (
                      <a href={ev.link} target="_blank" rel="noreferrer" className="inline-flex px-6 py-3 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20 items-center gap-2 w-full justify-center sm:w-auto active:scale-95">
                        ПЕРЕЙТИ К СОБЫТИЮ <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && canManageSchedule && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-md flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[min(90dvh,820px)] flex flex-col overflow-hidden shadow-2xl relative border border-white/20">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="absolute top-5 right-5 z-10 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
              
              <div className="shrink-0 px-8 pt-8 pb-4">
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 pr-10">{editingEventId ? 'Редактировать событие' : 'Новое событие'}</h3>
              </div>
              
              <form onSubmit={handleCreateEvent} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 space-y-4 custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Название</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all text-lg" placeholder="Разбор варианта №5" />
                </div>

                {canManageSchedule && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Для какой группы
                    </label>
                    <p className="text-xs font-medium text-gray-400 mb-3 ml-1">
                      Выберите учебную группу или оставьте «Все ученики» для общего события
                    </p>

                    {formData.group_id && selectedGroupTitle && (
                      <div className="mb-3 flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="font-black text-indigo-900 truncate">{selectedGroupTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, group_id: '' })}
                          className="shrink-0 p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-white rounded-lg transition-colors"
                          title="Сбросить выбор"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all text-sm"
                        placeholder="Поиск группы по названию…"
                      />
                    </div>

                    <div className="max-h-[200px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/80 custom-scrollbar divide-y divide-gray-100">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, group_id: '' })}
                        className={`w-full text-left px-4 py-3 font-bold text-sm transition-colors ${
                          !formData.group_id
                            ? 'bg-[#5A4BFF] text-white'
                            : 'hover:bg-white text-gray-700'
                        }`}
                      >
                        Все ученики
                      </button>
                      {groups.length === 0 ? (
                        <p className="px-4 py-3 text-sm font-medium text-gray-400">Нет доступных учебных групп</p>
                      ) : filteredGroups.length === 0 ? (
                        <p className="px-4 py-3 text-sm font-medium text-gray-400">Ничего не найдено по запросу «{groupSearch}»</p>
                      ) : (
                        filteredGroups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, group_id: g.id });
                              setGroupSearch('');
                            }}
                            className={`w-full text-left px-4 py-3 font-bold text-sm transition-colors truncate ${
                              formData.group_id === g.id
                                ? 'bg-[#5A4BFF] text-white'
                                : 'hover:bg-white text-gray-700'
                            }`}
                          >
                            {g.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Дата</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Время</label>
                    <input type="time" step="60" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Тип события</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold cursor-pointer transition-all appearance-none">
                    <option value="WEBINAR">📹 Вебинар (Онлайн)</option>
                    <option value="DEADLINE">🚨 Дедлайн (Сдача работ)</option>
                    <option value="OFFLINE">📍 Офлайн занятие</option>
                    <option value="CUSTOM">✏️ Свой тип (название ниже)</option>
                  </select>
                </div>

                {(formData.type === 'CUSTOM' || formData.custom_type) && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Своё название типа</label>
                    <input
                      type="text"
                      value={formData.custom_type}
                      onChange={e => setFormData({ ...formData, custom_type: e.target.value })}
                      required={formData.type === 'CUSTOM'}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all"
                      placeholder="Например: Разбор пробника"
                    />
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  {!editingEventId && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useRepeat}
                      onChange={e => {
                        const on = e.target.checked;
                        setFormData({
                          ...formData,
                          useRepeat: on,
                          repeat_weeks: on ? Math.max(2, formData.repeat_weeks) : formData.repeat_weeks,
                        });
                      }}
                      className="w-5 h-5 rounded accent-[#5A4BFF]"
                    />
                    <span className="font-bold text-gray-800 text-sm">Повторять каждую неделю (например, каждое воскресенье)</span>
                  </label>
                  )}
                  {!editingEventId && formData.useRepeat && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Сколько недель</label>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={Math.max(2, formData.repeat_weeks)}
                        onChange={e => setFormData({ ...formData, repeat_weeks: Math.max(2, Number(e.target.value) || 2) })}
                        className="w-full px-5 py-3 bg-white border border-gray-100 focus:border-[#5A4BFF] rounded-2xl outline-none font-bold"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Ссылка (Zoom/YouTube)</label>
                  <input type="text" inputMode="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-medium transition-all" placeholder="zoom.us/j/... или https://..." />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Описание (необязательно)</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-medium transition-all resize-none" placeholder="Что нужно подготовить к уроку..." rows={2} />
                </div>
                </div>

                <div className="shrink-0 px-8 py-5 border-t border-gray-100 bg-white space-y-3">
                  {saveError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-medium">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-4 bg-[#5A4BFF] hover:bg-[#4a3dec] disabled:opacity-60 text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {editingEventId ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОХРАНИТЬ В КАЛЕНДАРЬ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}