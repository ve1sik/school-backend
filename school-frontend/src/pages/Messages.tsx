import { useState, useEffect, useRef } from 'react';
import { Search, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ДЕМО-ДАННЫЕ (Пока бэкенд не отдаст реальную базу кураторов)
const MOCK_TEACHERS = [
  { id: 't1', name: 'Куратор МГУ', role: 'Поддержка', isOnline: true, avatar: null },
  { id: 't2', name: 'Николай Шалдин', role: 'Преподаватель', isOnline: false, avatar: null },
  { id: 't3', name: 'Анна Смирнова', role: 'Проверка эссе', isOnline: true, avatar: null },
];

const MOCK_CHAT_HISTORY: Record<string, any[]> = {
  't1': [
    { id: 'm1', senderId: 't1', text: 'Здравствуйте! Добро пожаловать на платформу. Если будут вопросы по темам или домашкам — пиши сюда, разберем вместе! 🚀', time: '10:00' },
    { id: 'm2', senderId: 'me', text: 'Понял, спасибо! Пока всё ясно, прохожу первый модуль.', time: '10:15' }
  ],
  't2': [
    { id: 'm3', senderId: 't2', text: 'Привет! Обрати внимание на ошибки в последнем тесте.', time: 'Вчера' }
  ],
  't3': []
};

export default function Messages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatId, setActiveChatId] = useState<string>('t1');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Record<string, any[]>>(MOCK_CHAT_HISTORY);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл вниз при новых сообщениях
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChatId]);

  const activeTeacher = MOCK_TEACHERS.find(t => t.id === activeChatId);

  // Логика живого поиска по преподам
  const filteredTeachers = MOCK_TEACHERS.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const newMsgObj = {
      id: Date.now().toString(),
      senderId: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsgObj]
    }));
    
    setNewMessage('');
    
    // Имитация ответа от куратора (для вау-эффекта на презентации)
    if (activeChatId === 't1') {
      setTimeout(() => {
        const replyObj = {
          id: Date.now().toString() + 'reply',
          senderId: 't1',
          text: 'Принято! Буду на связи. 😎',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => ({
          ...prev,
          ['t1']: [...(prev['t1'] || []), replyObj]
        }));
      }, 1500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-6 pt-4">
      
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-tight text-gray-900">Сообщения</h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК ЧАТОВ */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
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
            {filteredTeachers.map(teacher => {
              const chatMsgs = messages[teacher.id] || [];
              const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;

              return (
                <button
                  key={teacher.id}
                  onClick={() => setActiveChatId(teacher.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 ${
                    activeChatId === teacher.id 
                      ? 'bg-indigo-50 border border-indigo-100 shadow-sm' 
                      : 'bg-transparent border border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 bg-[#5A4BFF] rounded-full flex items-center justify-center text-white shadow-md">
                      <User className="w-5 h-5" />
                    </div>
                    {teacher.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{teacher.name}</h4>
                    <p className={`text-xs truncate mt-0.5 ${activeChatId === teacher.id ? 'text-[#5A4BFF]' : 'text-gray-500'}`}>
                      {lastMsg ? lastMsg.text : <span className="italic">Нет сообщений</span>}
                    </p>
                  </div>
                </button>
              );
            })}
            
            {filteredTeachers.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <p className="font-bold text-sm">Никого не найдено</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ПРАВАЯ ПАНЕЛЬ: ОКНО ПЕРЕПИСКИ */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden"
        >
          {activeTeacher ? (
            <>
              {/* ШАПКА ЧАТА */}
              <div className="p-6 border-b border-gray-50 bg-white flex items-center gap-4 z-10 shadow-sm">
                <div className="w-12 h-12 bg-[#5A4BFF] rounded-full flex items-center justify-center text-white">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900">{activeTeacher.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {activeTeacher.isOnline ? (
                      <><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span className="text-xs font-bold text-emerald-600">В сети</span></>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-gray-300"></span><span className="text-xs font-bold text-gray-400">Был(а) недавно</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* ИСТОРИЯ СООБЩЕНИЙ */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] custom-scrollbar flex flex-col">
                <AnimatePresence initial={false}>
                  {(messages[activeChatId] || []).map((msg) => {
                    const isMe = msg.senderId === 'me';
                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] p-4 relative ${
                          isMe 
                            ? 'bg-[#5A4BFF] text-white rounded-2xl rounded-br-sm shadow-md shadow-indigo-500/20' 
                            : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm'
                        }`}>
                          <p className="text-[15px] leading-relaxed">{msg.text}</p>
                          <span className={`text-[10px] font-bold mt-2 block text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {msg.time}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* ПОЛЕ ВВОДА */}
              <div className="p-6 bg-white border-t border-gray-50">
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напиши сообщение..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-6 pr-16 outline-none focus:bg-white focus:border-[#5A4BFF] transition-all text-gray-900 font-medium"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-3 w-10 h-10 bg-[#5A4BFF] rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/30 hover:bg-[#4a3dec] transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                  >
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