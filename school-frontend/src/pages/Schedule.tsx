import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Video, Clock, Link as LinkIcon, Plus, X, Trash2, CalendarDays, Loader2, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'http://85.193.89.154:3000';

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔥 БРОНЕБОЙНАЯ ПРОВЕРКА НА АДМИНА (читаем прямо из токена)
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Расшифровываем payload из JWT токена
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'ADMIN') {
          setIsAdmin(true);
        }
      }
    } catch (e) {
      console.error('Ошибка расшифровки токена');
    }
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDateTitle, setSelectedDateTitle] = useState('');

  const [formData, setFormData] = useState({
    title: '', date: '', time: '', type: 'WEBINAR', link: '', description: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/schedule`, { headers: { Authorization: `Bearer ${token}` } });
      setEvents(res.data);
    } catch (err) { console.error('Ошибка загрузки расписания', err); }
    finally { setIsLoading(false); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const eventDateTime = new Date(`${formData.date}T${formData.time}:00`).toISOString();
      
      await axios.post(`${API_URL}/schedule`, {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        type: formData.type,
        link: formData.link
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setShowAddModal(false);
      setFormData({ title: '', date: '', time: '', type: 'WEBINAR', link: '', description: '' });
      fetchEvents();
    } catch (err) { console.error('Ошибка создания', err); }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
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
    const dayEvents = events.filter(e => new Date(e.date).toDateString() === clickedDate);
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setSelectedDateTitle(`${day} ${monthNames[currentDate.getMonth()].toLowerCase()}`);
      setShowDayModal(true);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F4F7FE]"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 px-6 pt-8 relative min-h-screen">
      
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#5A4BFF]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-2 flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
              <CalendarDays className="w-8 h-8 text-[#5A4BFF]" />
            </div>
            Расписание
          </h1>
          <p className="text-gray-500 font-medium text-lg ml-1">Планируй своё время и не пропускай дедлайны. ⏳</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-gray-900/20 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> ДОБАВИТЬ СОБЫТИЕ
          </button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl shadow-indigo-500/5 border border-white p-8 relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 capitalize tracking-tight flex items-center gap-3">
            {monthNames[currentDate.getMonth()]} <span className="text-gray-400 font-bold">{currentDate.getFullYear()}</span>
          </h2>
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button onClick={prevMonth} className="p-3 bg-transparent hover:bg-white rounded-xl transition-all hover:shadow-sm"><ChevronLeft className="w-6 h-6 text-gray-700" /></button>
            <button onClick={nextMonth} className="p-3 bg-transparent hover:bg-white rounded-xl transition-all hover:shadow-sm"><ChevronRight className="w-6 h-6 text-gray-700" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center font-black text-gray-400 text-xs uppercase tracking-widest">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3 md:gap-4">
          {Array(firstDayOfMonth).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="h-32 rounded-[1.5rem] bg-gray-50/50 border border-gray-100/50 border-dashed"></div>
          ))}
          
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday = thisDate.toDateString() === new Date().toDateString();
            const dayEvents = events.filter(e => new Date(e.date).toDateString() === thisDate.toDateString());
            
            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day, thisDate)}
                className={`h-32 rounded-[1.5rem] p-3 transition-all duration-300 flex flex-col relative group overflow-hidden
                  ${isToday 
                    ? 'bg-gradient-to-br from-[#5A4BFF] to-[#8c52ff] shadow-xl shadow-indigo-500/30 scale-[1.02] cursor-pointer' 
                    : dayEvents.length > 0 
                      ? 'bg-white border-2 border-gray-100 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-[#5A4BFF] cursor-pointer' 
                      : 'bg-white border-2 border-transparent hover:bg-gray-50'}`}
              >
                <div className={`font-black text-xl mb-2 ${isToday ? 'text-white' : 'text-gray-900 group-hover:text-[#5A4BFF] transition-colors'}`}>
                  {day}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {dayEvents.map((ev, idx) => {
                    let pillClass = 'bg-indigo-50 text-indigo-700 border border-indigo-100';
                    
                    if (isToday) {
                      pillClass = 'bg-white/20 text-white border border-white/30 backdrop-blur-md';
                    } else {
                      if (ev.type === 'DEADLINE') pillClass = 'bg-rose-50 text-rose-700 border border-rose-100';
                      if (ev.type === 'OFFLINE') pillClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                    }
                    
                    return (
                      <div key={idx} className={`text-[10px] font-bold px-2 py-1.5 rounded-lg truncate transition-all ${pillClass}`}>
                        {new Date(ev.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} • {ev.title}
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
                    {isAdmin && (
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-6 right-6 p-2 text-gray-300 hover:bg-rose-50 hover:text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5"/></button>
                    )}
                    
                    <div className="flex items-center gap-2 mb-4">
                      {ev.type === 'WEBINAR' && <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-purple-100 flex items-center gap-1.5"><Video className="w-3.5 h-3.5"/> Вебинар</span>}
                      {ev.type === 'DEADLINE' && <span className="px-3 py-1.5 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-100 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Дедлайн</span>}
                      {ev.type === 'OFFLINE' && <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Офлайн</span>}
                      <span className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {new Date(ev.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
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
        {showAddModal && isAdmin && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-md flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative p-8 md:p-10 border border-white/20">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
              
              <h3 className="text-3xl font-black mb-8 text-gray-900">Новое событие</h3>
              
              <form onSubmit={handleCreateEvent} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Название</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all text-lg" placeholder="Разбор варианта №5" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Дата</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Время</label>
                    <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Тип события</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-bold cursor-pointer transition-all appearance-none">
                    <option value="WEBINAR">📹 Вебинар (Онлайн)</option>
                    <option value="DEADLINE">🚨 Дедлайн (Сдача работ)</option>
                    <option value="OFFLINE">📍 Офлайн занятие</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Ссылка (Zoom/YouTube)</label>
                  <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-medium transition-all" placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Описание (необязательно)</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 focus:border-[#5A4BFF] focus:bg-white rounded-2xl outline-none font-medium transition-all resize-none" placeholder="Что нужно подготовить к уроку..." rows={2} />
                </div>

                <button type="submit" className="w-full py-5 mt-2 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-500/20 active:scale-95">СОХРАНИТЬ В КАЛЕНДАРЬ</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}