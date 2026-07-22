import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Video, Clock, Link as LinkIcon, Plus, X, Trash2, CalendarDays, Loader2, MapPin, AlertCircle, Sparkles, ExternalLink, ArrowRight, Search, Users, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { decodeToken, getToken } from '../lib/auth';
import { parseSafeDate } from '../lib/parseDate';

const API_URL = 'https://prepodmgy.ru/api';

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  WEBINAR: 'Вебинар',
  DEADLINE: 'Дедлайн',
  OFFLINE: 'Офлайн',
};

const getEventTypeLabel = (ev: any) => {
  if (ev.custom_type?.trim()) return ev.custom_type.trim();
  return DEFAULT_TYPE_LABELS[ev.type] || ev.type || 'Событие';
};

const getEventTypeColors = (type: string) => {
  if (type === 'DEADLINE') return 'from-rose-500 to-red-600';
  if (type === 'OFFLINE') return 'from-emerald-500 to-teal-600';
  return 'from-[#5A4BFF] to-violet-600';
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

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'WEBINAR',
    custom_type: '',
    link: '',
    description: '',
    group_id: '',
    repeat_weeks: 1,
    useRepeat: false,
  });

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
      repeat_weeks: 1,
      useRepeat: false,
    });
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

  const buildEventDateTime = () => {
    const time = formData.time.length === 5 ? `${formData.time}:00` : formData.time;
    return new Date(`${formData.date}T${time}`).toISOString();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const eventDateTime = buildEventDateTime();
      const payload: any = {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        type: formData.type === 'CUSTOM' ? 'WEBINAR' : formData.type,
        custom_type: formData.type === 'CUSTOM' ? formData.custom_type : (formData.custom_type || undefined),
        link: formData.link,
        group_id: formData.group_id || undefined,
      };
      if (!editingEventId && formData.useRepeat && formData.repeat_weeks > 1) {
        payload.repeat_weeks = Number(formData.repeat_weeks);
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
    } catch (err) { console.error('Ошибка сохранения события', err); }
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
      repeat_weeks: 1,
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
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (day: number, thisDate: Date) => {
    const clickedDate = thisDate.toDateString();
    const dayEvents = events.filter(e => parseSafeDate(e.date).toDateString() === clickedDate);
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setSelectedDateTitle(`${day} ${monthNames[currentDate.getMonth()].toLowerCase()}`);
      setShowDayModal(true);
    }
  };

  // Ближайшие события (сегодня + будущие, максимум 3)
  const now = new Date();
  const upcomingEvents = events
    .filter(e => parseSafeDate(e.date) >= now)
    .sort((a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime())
    .slice(0, 3);

  const isToday = (d: string) => parseSafeDate(d).toDateString() === now.toDateString();

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-6 px-4 pt-4 relative">
      
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#5A4BFF]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      {/* ── СТРИП БЛИЖАЙШИХ ЗАНЯТИЙ ── */}
      {upcomingEvents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 hidden lg:grid">
          {upcomingEvents.map(ev => {
            const evDate = parseSafeDate(ev.date);
            const today = isToday(ev.date);
            const typeLabels: Record<string, string> = DEFAULT_TYPE_LABELS;
            const label = getEventTypeLabel(ev);
            return (
              <div key={ev.id} className={`relative rounded-[2rem] p-6 bg-gradient-to-br ${getEventTypeColors(ev.type)} text-white overflow-hidden shadow-lg`}>
                <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-lg">
                      {today ? '🔴 Сегодня' : evDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />{evDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-black text-base leading-snug mb-4 line-clamp-2">{ev.title}</p>
                  {ev.link ? (
                    <a href={ev.link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-white text-gray-900 font-black text-xs px-4 py-2.5 rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-md">
                      {today ? '🚀 Войти в урок' : 'Ссылка'} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-white/60">{label || typeLabels[ev.type]}</span>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 mb-1 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <CalendarDays className="w-6 h-6 text-[#5A4BFF]" />
            </div>
            Расписание
          </h1>
        </div>
        {canManageSchedule && (
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-gray-900/20 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> ДОБАВИТЬ СОБЫТИЕ
          </button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-lg shadow-indigo-500/5 border border-white p-4 md:p-5 relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 capitalize tracking-tight flex items-center gap-2">
            {monthNames[currentDate.getMonth()]} <span className="text-gray-400 font-bold text-lg">{currentDate.getFullYear()}</span>
          </h2>
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button onClick={prevMonth} className="p-3 bg-transparent hover:bg-white rounded-xl transition-all hover:shadow-sm"><ChevronLeft className="w-6 h-6 text-gray-700" /></button>
            <button onClick={nextMonth} className="p-3 bg-transparent hover:bg-white rounded-xl transition-all hover:shadow-sm"><ChevronRight className="w-6 h-6 text-gray-700" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center font-black text-gray-400 text-[10px] md:text-xs uppercase tracking-widest py-1">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2 auto-rows-fr" style={{ minHeight: 'min(52vh, 420px)' }}>
          {Array(firstDayOfMonth).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[3.25rem] md:min-h-[3.75rem] rounded-xl bg-gray-50/50 border border-gray-100/50 border-dashed"></div>
          ))}
          
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday = thisDate.toDateString() === new Date().toDateString();
            const dayEvents = events.filter(e => parseSafeDate(e.date).toDateString() === thisDate.toDateString());
            
            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day, thisDate)}
                className={`min-h-[3.25rem] md:min-h-[3.75rem] rounded-xl p-1.5 md:p-2 transition-all duration-200 flex flex-col relative group overflow-hidden
                  ${isToday 
                    ? 'bg-gradient-to-br from-[#5A4BFF] to-[#8c52ff] shadow-md shadow-indigo-500/20 cursor-pointer' 
                    : dayEvents.length > 0 
                      ? 'bg-white border border-gray-100 hover:border-[#5A4BFF] cursor-pointer' 
                      : 'bg-white border border-transparent hover:bg-gray-50'}`}
              >
                <div className={`font-black text-sm md:text-base leading-none ${isToday ? 'text-white' : 'text-gray-900 group-hover:text-[#5A4BFF] transition-colors'}`}>
                  {day}
                </div>

                <div className="flex-1 overflow-hidden mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev, idx) => {
                    let pillClass = 'bg-indigo-50 text-indigo-700';
                    if (isToday) pillClass = 'bg-white/25 text-white';
                    else if (ev.type === 'DEADLINE') pillClass = 'bg-rose-50 text-rose-700';
                    else if (ev.type === 'OFFLINE') pillClass = 'bg-emerald-50 text-emerald-700';
                    
                    return (
                      <div key={idx} className={`text-[8px] md:text-[9px] font-bold px-1 py-0.5 rounded truncate ${pillClass}`}>
                        {ev.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

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
                      onChange={e => setFormData({ ...formData, useRepeat: e.target.checked })}
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
                        value={formData.repeat_weeks}
                        onChange={e => setFormData({ ...formData, repeat_weeks: Math.max(2, Number(e.target.value) || 2) })}
                        className="w-full px-5 py-3 bg-white border border-gray-100 focus:border-[#5A4BFF] rounded-2xl outline-none font-bold"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Ссылка (Zoom/YouTube)</label>
                  <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-medium transition-all" placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Описание (необязательно)</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-medium transition-all resize-none" placeholder="Что нужно подготовить к уроку..." rows={2} />
                </div>
                </div>

                <div className="shrink-0 px-8 py-5 border-t border-gray-100 bg-white">
                  <button type="submit" className="w-full py-4 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
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