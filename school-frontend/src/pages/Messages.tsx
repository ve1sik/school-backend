import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, User, Loader2, ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { decodeToken, getToken, getTokenConfig } from '../lib/auth';
import { parseSafeDate } from '../lib/parseDate';
import { API_URL, SITE_ORIGIN } from '../lib/api';
import { design } from '../lib/designTokens';

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${SITE_ORIGIN}/${cleanPath}`;
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

/** Figma pdf-page-06 — Messages 1:1 */
function Avatar({ contact, size = 'md' }: { contact: any; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  return (
    <div
      className={`${cls} rounded-full bg-[#F3F4F6] flex items-center justify-center text-gray-400 overflow-hidden shrink-0 border border-[#E5E7EB]`}
    >
      {contact?.avatar ? (
        <img src={getFullUrl(contact.avatar)} className="w-full h-full object-cover" alt="" />
      ) : (
        <User className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={1.75} />
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
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: design.ink }} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col font-[Golos_Text,system-ui,sans-serif]">
      <div className="flex-1 min-h-0 flex gap-3 md:gap-4 overflow-hidden">
        {/* Left — chat list (Figma) */}
        <aside
          className={`w-full md:w-[300px] lg:w-[320px] xl:w-[340px] bg-white rounded-[16px] border flex-col overflow-hidden shrink-0 ${
            activeChatId ? 'hidden md:flex' : 'flex'
          }`}
          style={{ borderColor: design.border }}
        >
          <div className="px-5 pt-5 pb-4 shrink-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] hover:text-gray-700 transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              Назад
            </button>
            <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#111827] mb-3.5 tracking-tight">
              Чаты
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={2} />
              <input
                type="text"
                placeholder="поиск диалога"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border rounded-full py-2.5 pl-10 pr-4 outline-none transition-all text-[13px] text-[#111827] placeholder:text-[#9CA3AF] placeholder:lowercase focus:ring-2"
                style={{
                  borderColor: design.border,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = design.brandPurple;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${design.brandPurple}26`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = design.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
            {filteredAndSortedContacts.length === 0 ? (
              <p className="p-6 text-sm text-[#9CA3AF] font-medium text-center">Диалоги не найдены</p>
            ) : (
              filteredAndSortedContacts.map((contact) => {
                const isActive = String(activeChatId) === String(contact.id);
                const hasUnread = contact.unreadCount > 0 && !isActive;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setActiveChatId(contact.id)}
                    className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors rounded-[12px] border ${
                      isActive
                        ? 'bg-[#EEF2FF] border-[#C7D2FE]'
                        : 'bg-white border-[#E5E7EB] hover:bg-gray-50'
                    }`}
                  >
                    <Avatar contact={contact} />
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`truncate text-[13px] md:text-[14px] font-bold uppercase tracking-wide ${
                          isActive || hasUnread ? 'text-[#3B5BDB]' : 'text-[#3B5BDB]'
                        }`}
                      >
                        {displayName(contact)}
                      </h4>
                      <p className="text-[12px] text-[#9CA3AF] font-medium mt-0.5 truncate">
                        {hasUnread ? 'Новое сообщение' : roleLabel(contact.role)}
                      </p>
                    </div>
                    {hasUnread && (
                      <span
                        className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                        style={{ backgroundColor: design.ink }}
                      >
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right — conversation (Figma) */}
        <section
          className={`flex-1 bg-white rounded-[16px] border flex-col overflow-hidden min-w-0 ${
            activeChatId ? 'flex' : 'hidden md:flex'
          }`}
          style={{ borderColor: design.border }}
        >
          {activeUser && activeChatId ? (
            <>
              <div
                className="px-4 md:px-5 py-3.5 md:py-4 flex items-center justify-between gap-3 shrink-0 border-b"
                style={{ borderColor: design.border }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-900 shrink-0"
                    aria-label="К списку чатов"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar contact={activeUser} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-[14px] md:text-[15px] text-[#3B5BDB] truncate uppercase tracking-wide">
                      {displayName(activeUser)}
                    </h3>
                    <p className="text-[12px] text-[#9CA3AF] font-medium">{roleLabel(activeUser.role)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveChatId(null)}
                  className="hidden md:flex w-8 h-8 items-center justify-center rounded-[8px] text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: design.ink }}
                  aria-label="Закрыть чат"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 custom-scrollbar flex flex-col bg-white">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <div className="m-auto text-center text-[#9CA3AF] font-medium text-[14px] leading-relaxed px-4">
                      Здесь пока нет сообщений. Напишите первым!
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
                            className={`max-w-[75%] px-4 py-3 rounded-[14px] ${
                              isMe
                                ? 'text-white rounded-br-md'
                                : 'bg-[#F9FAFB] text-[#111827] rounded-bl-md border border-[#E5E7EB]'
                            }`}
                            style={isMe ? { backgroundColor: design.ink } : undefined}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span
                              className={`text-[10px] font-bold mt-1.5 block text-right ${
                                isMe ? 'text-white/50' : 'text-[#9CA3AF]'
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

              <div className="p-4 md:p-5 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2.5 md:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение"
                    className="flex-1 bg-white border rounded-[12px] py-3.5 px-4 outline-none transition-all text-[#111827] font-medium text-[15px] placeholder:text-[#9CA3AF]"
                    style={{ borderColor: design.border }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = design.brandPurple;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = design.border;
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-12 h-12 shrink-0 rounded-[10px] text-white flex items-center justify-center transition-all disabled:opacity-40 active:scale-95 hover:opacity-90"
                    style={{ backgroundColor: design.ink }}
                    aria-label="Отправить"
                  >
                    <Send className="w-5 h-5 ml-0.5" strokeWidth={2} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-[#9CA3AF] flex-col px-6">
              <p className="font-medium text-[14px] text-center">Выберите чат из списка слева</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
