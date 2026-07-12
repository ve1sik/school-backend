import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, User, ShieldCheck, Inbox, X, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { decodeToken, getToken, getTokenConfig } from '../lib/auth';
import { parseSafeDate } from '../lib/parseDate';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${API_URL.replace('/api', '')}/${cleanPath}`;
};

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(searchParams.get('curator'));
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [myId, setMyId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const curatorFromUrl = searchParams.get('curator');
    if (curatorFromUrl) {
      setActiveChatId(curatorFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const prefill = searchParams.get('prefill');
    if (prefill && activeChatId) {
      setNewMessage(decodeURIComponent(prefill));
    }
  }, [searchParams, activeChatId]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const payload = decodeToken();
        if (!payload) return;
        setMyId(payload.sub || '');

        const res = await axios.get(`${API_URL}/messages/contacts`, getTokenConfig());
        const role: string = payload.role || '';
        
        // Для студентов — только кураторы и преподаватели из их группы
        if (role === 'STUDENT') {
          const filtered = (res.data as any[]).filter(
            (c: any) => c.role === 'CURATOR' || c.role === 'TEACHER' || c.role === 'ADMIN'
          );
          setContacts(filtered);
        } else {
          setContacts(res.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки контактов', err);
      } finally {
        setIsLoadingContacts(false);
      }
    };
    
    fetchContacts();
    const interval = setInterval(fetchContacts, 3000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchHistory = async () => {
      if (!activeChatId) return;
      try {
        const res = await axios.get(`${API_URL}/messages/${activeChatId}`, getTokenConfig());
        setMessages(res.data);
      } catch (err) {
        console.error('Ошибка загрузки истории', err);
      }
    };

    if (activeChatId) {
      fetchHistory(); 
      interval = setInterval(fetchHistory, 3000); 
    } else {
      setMessages([]);
    }
    return () => clearInterval(interval);
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeUser = contacts.find(c => String(c.id) === String(activeChatId));

  // 🔥 МАГИЯ СОРТИРОВКИ: Сначала фильтруем по поиску, потом сортируем (непрочитанные сверху!)
  const filteredAndSortedContacts = contacts
    .filter(c => {
      const searchStr = `${c.name || ''} ${c.surname || ''} ${c.email || ''}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const unreadA = a.unreadCount || 0;
      const unreadB = b.unreadCount || 0;
      return unreadB - unreadA; // У кого больше непрочитанных, тот выше!
    });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const textToSend = newMessage;
    setNewMessage(''); 

    try {
      await axios.post(`${API_URL}/messages/${activeChatId}`, { text: textToSend }, getTokenConfig());
      const res = await axios.get(`${API_URL}/messages/${activeChatId}`, getTokenConfig());
      setMessages(res.data);
    } catch (err) {
      alert('Ошибка при отправке');
    }
  };

  if (isLoadingContacts) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-5rem)] flex flex-col min-h-0">
      <div className="shrink-0 mb-2 md:mb-3">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Сообщения</h1>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 md:gap-4 overflow-hidden">
        
        {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК ЧАТОВ */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
          className={`w-full md:max-w-[320px] bg-white rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 flex-col overflow-hidden shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="p-6 border-b border-gray-50">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 text-gray-400 hover:text-purple-600 text-[10px] font-black uppercase tracking-widest transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Назад
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              Чат <span className="text-[#5A4BFF] text-2xl">💬</span>
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Поиск диалога..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#5A4BFF] transition-all font-medium text-sm text-gray-700"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/30">
            <AnimatePresence>
              {filteredAndSortedContacts.map(contact => {
                const isActive = String(activeChatId) === String(contact.id);
                const hasUnread = contact.unreadCount > 0 && !isActive;

                return (
                  <motion.button
                    key={contact.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => setActiveChatId(contact.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 ${
                      isActive ? 'bg-indigo-50 border border-indigo-100 shadow-sm' : hasUnread ? 'bg-white border border-indigo-100 shadow-sm' : 'bg-transparent border border-transparent hover:bg-gray-50'
                    }`}
                  >
                    {/* Аватарка */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 bg-[#5A4BFF] rounded-full flex items-center justify-center text-white shadow-md overflow-hidden">
                        {contact.avatar ? <img src={getFullUrl(contact.avatar)} className="w-full h-full object-cover" alt="ava"/> : <User className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Текстовая часть */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`truncate ${hasUnread ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                        {contact.name ? `${contact.name} ${contact.surname || ''}` : contact.email}
                      </h4>
                      <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-[#5A4BFF] font-bold' : hasUnread ? 'text-[#5A4BFF] font-black' : 'text-gray-500 font-medium'}`}>
                        {hasUnread ? 'Новое сообщение!' : (contact.role === 'CURATOR' ? 'Куратор' : contact.role === 'ADMIN' ? 'Администратор' : 'Студент')}
                      </p>
                    </div>

                    {/* 🔥 БЕЙДЖИК КАК В ТЕЛЕГРАМЕ (СПРАВА) */}
                    {hasUnread && (
                      <div className="shrink-0 pl-2">
                        <div className="bg-[#5A4BFF] text-white text-[11px] font-black min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center shadow-md">
                          {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                        </div>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ПРАВАЯ ПАНЕЛЬ: ОКНО ПЕРЕПИСКИ */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} 
          className={`flex-1 bg-white rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 flex-col overflow-hidden ${activeChatId ? 'flex' : 'hidden md:flex'}`}
        >
          {activeUser && activeChatId ? (
            <>
              <div className="p-4 md:p-6 border-b border-gray-50 bg-white flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <button onClick={() => setActiveChatId(null)} className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-900 shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#5A4BFF] rounded-full flex items-center justify-center text-white overflow-hidden shrink-0">
                    {activeUser.avatar ? <img src={getFullUrl(activeUser.avatar)} className="w-full h-full object-cover" alt="ava"/> : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base md:text-lg text-gray-900 truncate">{activeUser.name ? `${activeUser.name} ${activeUser.surname || ''}` : activeUser.email}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-gray-400">{activeUser.role === 'CURATOR' ? 'Куратор' : activeUser.role === 'ADMIN' ? 'Администратор' : 'Студент'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveChatId(null)} className="hidden md:block p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-[#F8FAFC] custom-scrollbar flex flex-col">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                     <div className="m-auto text-center text-gray-400 font-medium">Здесь пока нет сообщений.<br/>Напишите первым!</div>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.sender_id === myId;
                      const timeString = parseSafeDate(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-4 relative ${isMe ? 'bg-[#5A4BFF] text-white rounded-2xl rounded-br-sm shadow-md shadow-indigo-500/20' : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm'}`}>
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span className={`text-[10px] font-bold mt-2 block text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{timeString}</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 md:p-6 bg-white border-t border-gray-50">
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                  <input 
                    type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напиши сообщение..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-6 pr-16 outline-none focus:bg-white focus:border-[#5A4BFF] transition-all text-gray-900 font-medium"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="absolute right-3 w-10 h-10 bg-[#5A4BFF] rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/30 hover:bg-[#4a3dec] transition-all disabled:opacity-50 disabled:shadow-none active:scale-95">
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-bold text-lg text-gray-500">Выберите чат из списка слева</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}