import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, User, ShieldCheck, Inbox, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ДЕМО-ДАННЫЕ СТУДЕНТОВ (Для демонстрации работы)
const MOCK_STUDENTS = [
  { id: 's1', name: 'Михаил Романов', course: 'История ЕГЭ', isOnline: true },
  { id: 's2', name: 'Анна Смирнова', course: 'Обществознание', isOnline: false },
  { id: 's3', name: 'Артем Волков', course: 'История ЕГЭ', isOnline: true },
  { id: 's4', name: 'Елена Кузнецова', course: 'Русский язык', isOnline: false },
];

const MOCK_MESSAGES: Record<string, any[]> = {
  's1': [
    { id: 'm1', senderId: 'student', text: 'Здравствуйте! А когда будет проверка моего эссе по Петру I?', time: '12:00' },
    { id: 'm2', senderId: 'curator', text: 'Привет, Михаил! Проверю сегодня до вечера, ожидай уведомления.', time: '12:05' }
  ],
  's2': [
    { id: 'm3', senderId: 'student', text: 'Брат, не могу понять 5-е задание в тесте, подскажи!', time: 'Вчера' }
  ],
  's3': [],
  's4': []
};

export default function CuratorMessages() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  // 🔥 Читаем id студента из URL, если мы перешли из проверки ДЗ
  const [activeStudentId, setActiveStudentId] = useState<string | null>(searchParams.get('student'));
  const [newMessage, setNewMessage] = useState('');
  const [chatData, setChatData] = useState<Record<string, any[]>>(MOCK_MESSAGES);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatData, activeStudentId]);

  const activeStudent = MOCK_STUDENTS.find(s => s.id === activeStudentId);

  const filteredStudents = MOCK_STUDENTS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeStudentId) return;

    const newMsgObj = {
      id: Date.now().toString(),
      senderId: 'curator',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatData(prev => ({
      ...prev,
      [activeStudentId]: [...(prev[activeStudentId] || []), newMsgObj]
    }));
    
    setNewMessage('');
  };

  return (
    <div className="flex h-[calc(100vh-40px)] bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden rounded-[3rem] shadow-2xl border border-white/50">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК УЧЕНИКОВ */}
      <aside className="w-full max-w-[380px] bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-20">
        <div className="p-8 border-b border-gray-50">
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
              placeholder="Поиск по имени или курсу..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:bg-white focus:border-purple-400 transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/30">
          <div className="px-4 mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Активные диалоги</span>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-md">{filteredStudents.length}</span>
          </div>

          <AnimatePresence>
            {filteredStudents.map(student => {
              const msgs = chatData[student.id] || [];
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

              return (
                <motion.button
                  key={student.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setActiveStudentId(student.id)}
                  className={`w-full text-left p-5 rounded-3xl transition-all flex items-center gap-4 relative overflow-hidden border ${
                    activeStudentId === student.id 
                      ? 'bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-500/20' 
                      : 'bg-white border-transparent hover:border-purple-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-inner ${activeStudentId === student.id ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    {student.isOnline && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-black text-sm truncate">{student.name}</h4>
                      {lastMsg && <span className={`text-[9px] font-bold ${activeStudentId === student.id ? 'text-purple-200' : 'text-gray-400'}`}>{lastMsg.time}</span>}
                    </div>
                    <p className={`text-xs truncate font-medium ${activeStudentId === student.id ? 'text-purple-100' : 'text-gray-500'}`}>
                      {lastMsg ? lastMsg.text : student.course}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </aside>

      {/* ПРАВАЯ ПАНЕЛЬ: ЧАТ */}
      <main className="flex-1 overflow-hidden relative bg-white flex flex-col">
        {activeStudent && activeStudentId ? (
          <>
            {/* ШАПКА ЧАТА */}
            <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-inner">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900">{activeStudent.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[10px] font-black text-gray-500 uppercase tracking-wider">{activeStudent.course}</span>
                    {activeStudent.isOnline && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-xs font-bold text-emerald-500">Онлайн</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveStudentId(null)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* СООБЩЕНИЯ */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F8FAFC]/50 custom-scrollbar">
              {(chatData[activeStudentId] || []).map((msg: any) => {
                const isCurator = msg.senderId === 'curator';
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex w-full ${isCurator ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[65%] p-5 rounded-3xl shadow-sm relative ${
                      isCurator 
                        ? 'bg-purple-600 text-white rounded-br-none shadow-purple-500/10' 
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                    }`}>
                      <p className="text-[15px] font-medium leading-relaxed">{msg.text}</p>
                      <span className={`text-[10px] font-black mt-3 block text-right uppercase tracking-widest ${isCurator ? 'text-purple-200' : 'text-gray-400'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ПОЛЕ ВВОДА */}
            <div className="p-8 bg-white border-t border-gray-50">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение ученику..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-5 px-6 outline-none focus:bg-white focus:border-purple-400 transition-all text-gray-900 font-bold"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="shrink-0 w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
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