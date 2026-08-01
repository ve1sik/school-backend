import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, User, Loader2, ArrowLeft, X } from 'lucide-react';
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

const roleLabel = (role?: string) => {
  if (role === 'CURATOR') return 'Куратор';
  if (role === 'TEACHER') return 'Преподаватель';
  if (role === 'ADMIN') return 'Администратор';
  if (role === 'PARENT') return 'Родитель';
  return 'Студент';
};

const displayName = (c: any) =>
  c?.name ? `${c.name} ${c.surname || ''}`.trim() : c?.email || 'Без имени';

function Avatar({ contact, size = 'md' }: { contact: any; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  return (
    <div className={`${cls} rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden shrink-0 border border-gray-100`}>
      {contact?.avatar ? (
        <img src={getFullUrl(contact.avatar)} className="w-full h-full object-cover" alt="" />
      ) : (
        <User className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      )}
    </div>
  );
}

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(searchParams.get('curator'));
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [myId, setMyId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const curatorFromUrl = searchParams.get('curator');
    if (curatorFromUrl) setActiveChatId(curatorFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const prefill = searchParams.get('prefill');
    if (prefill && activeChatId) setNewMessage(decodeURIComponent(prefill));
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
        if (role === 'STUDENT') {
          setContacts(
            (res.data as any[]).filter(
              (c: any) => c.role === 'CURATOR' || c.role === 'TEACHER' || c.role === 'ADMIN',
            ),
          );
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
    let interval: ReturnType<typeof setInterval>;
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeUser = contacts.find((c) => String(c.id) === String(activeChatId));

  const filteredAndSortedContacts = contacts
    .filter((c) => {
      const searchStr = `${c.name || ''} ${c.surname || ''} ${c.email || ''}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    const textToSend = newMessage;
    setNewMessage('');
    try {
      await axios.post(`${API_URL}/messages/${activeChatId}`, { text: textToSend }, getTokenConfig());
      const res = await axios.get(`${API_URL}/messages/${activeChatId}`, getTokenConfig());
      setMessages(res.data);
    } catch {
      alert('Ошибка при отправке');
    }
  };

  if (isLoadingContacts) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A1D26]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-5rem)] flex flex-col min-h-0">
      <div className="shrink-0 mb-3 md:mb-4">
        <h1 className="text-2xl md:text-[28px] font-black tracking-tight text-gray-900">Сообщения</h1>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 md:gap-4 overflow-hidden">
        {/* Список чатов */}
        <div
          className={`w-full md:w-[340px] lg:w-[360px] bg-white rounded-2xl border border-gray-200 flex-col overflow-hidden shrink-0 ${
            activeChatId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-5 md:p-6 border-b border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-[11px] font-black uppercase tracking-wider transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Назад
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-4">Чаты</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск диалога"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 outline-none focus:bg-white focus:border-[#6C63FF] transition-all font-medium text-sm text-gray-700 placeholder:text-gray-400 placeholder:uppercase placeholder:text-[11px] placeholder:tracking-wide"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredAndSortedContacts.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 font-medium text-center">Диалоги не найдены</p>
            ) : (
              filteredAndSortedContacts.map((contact) => {
                const isActive = String(activeChatId) === String(contact.id);
                const hasUnread = contact.unreadCount > 0 && !isActive;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setActiveChatId(contact.id)}
                    className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors border-b border-gray-50 ${
                      isActive ? 'bg-[#EEF4FF]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Avatar contact={contact} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`truncate text-[15px] ${isActive || hasUnread ? 'font-bold text-[#3B5BDB]' : 'font-semibold text-gray-800'}`}>
                        {displayName(contact).toUpperCase()}
                      </h4>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">
                        {hasUnread ? 'Новое сообщение' : roleLabel(contact.role)}
                      </p>
                    </div>
                    {hasUnread && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#1A1D26] text-white text-[10px] font-black flex items-center justify-center">
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Окно переписки */}
        <div
          className={`flex-1 bg-white rounded-2xl border border-gray-200 flex-col overflow-hidden min-w-0 ${
            activeChatId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeUser && activeChatId ? (
            <>
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-900 shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar contact={activeUser} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-[15px] text-[#3B5BDB] truncate uppercase tracking-wide">
                      {displayName(activeUser)}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">{roleLabel(activeUser.role)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveChatId(null)}
                  className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 custom-scrollbar flex flex-col bg-white">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <div className="m-auto text-center text-gray-400 font-medium text-sm leading-relaxed px-4">
                      Здесь пока нет сообщений.
                      <br />
                      Напишите первым!
                    </div>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.sender_id === myId;
                      const timeString = parseSafeDate(msg.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex w-full mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-3 ${
                              isMe
                                ? 'bg-[#1A1D26] text-white rounded-2xl rounded-br-md'
                                : 'bg-gray-50 text-gray-800 rounded-2xl rounded-bl-md border border-gray-100'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span
                              className={`text-[10px] font-bold mt-1.5 block text-right ${
                                isMe ? 'text-white/50' : 'text-gray-400'
                              }`}
                            >
                              {timeString}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 md:p-5 border-t border-gray-100 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение"
                    className="flex-1 bg-white border border-gray-200 rounded-xl py-3.5 px-4 outline-none focus:border-[#6C63FF] transition-all text-gray-900 font-medium text-[15px] placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-12 h-12 shrink-0 rounded-full bg-[#1A1D26] hover:bg-black text-white flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
                    aria-label="Отправить"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <Search className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-base text-gray-500 text-center">
                Выберите чат из списка слева
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
