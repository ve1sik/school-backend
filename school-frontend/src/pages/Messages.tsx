import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, User, ShieldCheck, Inbox, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${API_URL.replace('/api', '')}/${cleanPath}`;
};

export default function Messages() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(searchParams.get('student'));
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

  const activeUser = contacts.find(c => c.id === activeChatId);

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
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-6 pt-4">
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-tight text-gray-900">Сообщения</h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК ЧАТОВ */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
          className="w-full max-w-[320px] bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden shrink-0"
        >
          <div className="p-6 border-b border-gray-50">
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
              {filteredContacts.map(contact => (
                <motion.button
                  key={contact.id}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setActiveChatId(contact.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 ${
                    activeChatId === contact.id ? 'bg-indigo-50 border border-indigo-100 shadow-sm' : 'bg-transparent border border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 bg-[#5A4BFF] rounded-full flex items-center justify-center text-white shadow-md overflow-hidden">
                      {contact.avatar ? <img src={getFullUrl(contact.avatar)} className="w-full h-full object-cover" alt="ava"/> : <User className="w-5 h-5" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{contact.name ? `${contact.name} ${contact.surname || ''}` : contact.email}</h4>
                    <p className={`text-xs truncate mt-0.5 ${activeChatId === contact.id ? 'text-[#5A4BFF]' : 'text-gray-500'}`}>
                      {contact.role === 'CURATOR' ? 'Куратор' : contact.role === 'ADMIN' ? 'Администратор' : 'Студент'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ПРАВАЯ ПАНЕЛЬ: ОКНО ПЕРЕПИСКИ */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} 
          className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden"
        >
          {activeUser && activeChatId ? (
            <>
              <div className="p-6 border-b border-gray-50 bg-white flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#5A4BFF] rounded-full flex items-center justify-center text-white overflow-hidden">
                    {activeUser.avatar ? <img src={getFullUrl(activeUser.avatar)} className="w-full h-full object-cover" alt="ava"/> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900">{activeUser.name ? `${activeUser.name} ${activeUser.surname || ''}` : activeUser.email}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-gray-400">{activeUser.role === 'CURATOR' ? 'Куратор' : activeUser.role === 'ADMIN' ? 'Администратор' : 'Студент'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveChatId(null)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] custom-scrollbar flex flex-col">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                     <div className="m-auto text-center text-gray-400 font-medium">Здесь пока нет сообщений.<br/>Напишите первым!</div>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.sender_id === myId;
                      const timeString = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                      
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

              <div className="p-6 bg-white border-t border-gray-50">
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