import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, User, ShieldCheck, Inbox, X, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${API_URL.replace('/api', '')}/${cleanPath}`;
};

export default function CuratorMessages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeChatId, setActiveChatId] = useState<string | null>(searchParams.get('student'));
  const [contacts, setContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [myId, setMyId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const initChat = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const payload = JSON.parse(window.atob(token.split('.')[1]));
        setMyId(payload.sub || payload.id);

        const res = await axios.get(`${API_URL}/messages/contacts`, getTokenConfig());
        setContacts(res.data);
      } catch (err) {
        console.error('Ошибка загрузки контактов', err);
      } finally {
        setIsLoadingContacts(false);
      }
    };
    initChat();
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

  const activeStudent = contacts.find(c => c.id === activeChatId);

  // 🔥 УМНЫЙ ПОИСК (Ищет по имени, фамилии и почте)
  const filteredContacts = contacts.filter(c => {
    const searchStr = `${c.name || ''} ${c.surname || ''} ${c.email || ''}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
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
    <div className="flex h-[calc(100vh-40px)] bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden rounded-[3rem] shadow-2xl border border-white/50">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК УЧЕНИКОВ */}
      <aside className="w-full max-w-[380px] bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20">
        <div className="p-8 border-b border-gray-50">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-purple-600 text-[10px] font-black uppercase tracking-widest transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight">Студенты</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Проверка связи</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text" 
              placeholder="Поиск по имени или почте..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:bg-white focus:border-purple-400 transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/30">
          <div className="px-4 mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Доступные диалоги</span>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-md">{filteredContacts.length}</span>
          </div>

          <AnimatePresence>
            {filteredContacts.map(contact => (
              <motion.button
                key={contact.id}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setActiveChatId(contact.id)}
                className={`w-full text-left p-5 rounded-3xl transition-all flex items-center gap-4 relative overflow-hidden border ${
                  activeChatId === contact.id ? 'bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-500/20' : 'bg-white border-transparent hover:border-purple-200 text-gray-900 shadow-sm'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-inner overflow-hidden ${activeChatId === contact.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {contact.avatar ? <img src={getFullUrl(contact.avatar)} className="w-full h-full object-cover" alt="ava"/> : <User className="w-5 h-5" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm truncate">{contact.name ? `${contact.name} ${contact.surname || ''}` : contact.email}</h4>
                  <p className={`text-xs truncate font-medium mt-0.5 ${activeChatId === contact.id ? 'text-purple-200' : 'text-gray-500'}`}>Студент</p>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </aside>

      {/* ПРАВАЯ ПАНЕЛЬ: ЧАТ */}
      <main className="flex-1 overflow-hidden relative bg-white flex flex-col">
        {activeStudent && activeChatId ? (
          <>
            <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-inner overflow-hidden">
                  {activeStudent.avatar ? <img src={getFullUrl(activeStudent.avatar)} className="w-full h-full object-cover" alt="ava"/> : <User className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900">{activeStudent.name ? `${activeStudent.name} ${activeStudent.surname || ''}` : activeStudent.email}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[10px] font-black text-gray-500 uppercase tracking-wider">Студент</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveChatId(null)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F8FAFC]/50 custom-scrollbar flex flex-col">
              <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                   <div className="m-auto text-center text-gray-400 font-medium">Здесь пока нет сообщений.<br/>Напишите первым!</div>
                ) : (
                  messages.map((msg: any) => {
                    const isMe = msg.sender_id === myId;
                    const timeString = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[65%] p-5 rounded-3xl shadow-sm relative ${isMe ? 'bg-purple-600 text-white rounded-br-none shadow-purple-500/10' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                          <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <span className={`text-[10px] font-black mt-3 block text-right uppercase tracking-widest ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>{timeString}</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-8 bg-white border-t border-gray-50">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
                <div className="relative flex-1">
                  <input 
                    type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение ученику..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-5 px-6 outline-none focus:bg-white focus:border-purple-400 transition-all text-gray-900 font-bold"
                  />
                </div>
                <button type="submit" disabled={!newMessage.trim()} className="shrink-0 w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale">
                  <Send className="w-6 h-6 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-12">
            <div className="max-w-xs">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                <Inbox className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Выберите чат</h3>
              <p className="text-gray-400 font-medium">Начните общение с учеником, чтобы помочь ему с обучением.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}