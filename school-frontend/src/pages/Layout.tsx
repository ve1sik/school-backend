import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  ShieldCheck,
  Bell,
  GraduationCap,
  User,
  ShoppingCart,
  Users,
  Layers,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';

const API_URL = 'https://prepodmgy.ru/api';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [userData, setUserData] = useState<any>(null);
  
  const [unreadCount, setUnreadCount] = useState(0);

  // Уведомления
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<{id: string; type: 'message'|'graded'|'deadline'|'cards'; text: string; sub?: string; link?: string}[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Закрытие панели кликом вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      if (payload.role === 'ADMIN' || payload.role === 'CURATOR') {
        setIsAdmin(true);
      }
    } catch (e) {
      console.error("Ошибка парсинга токена");
    }

    const fetchUserData = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(res.data);
      } catch (err) {
        console.error("Ошибка загрузки данных пользователя в шапку");
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  // Поллинг: сообщения + сборка всех уведомлений
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const lastSeen = localStorage.getItem('notif_last_seen') || '0';

        const [unreadRes, schedRes, subsRes, cardsRes] = await Promise.all([
          axios.get(`${API_URL}/messages/unread`, { headers }).catch(() => ({ data: { count: 0 } })),
          axios.get(`${API_URL}/schedule`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/submissions/my`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/flashcards/stats`, { headers }).catch(() => ({ data: { dueTodayCount: 0, newCount: 0 } })),
        ]);

        setUnreadCount(unreadRes.data.count || 0);

        const notifs: typeof notifications = [];

        // 1. Непрочитанные сообщения
        if (unreadRes.data.count > 0) {
          notifs.push({ id: 'msg', type: 'message', text: `${unreadRes.data.count} новых сообщений`, sub: 'от куратора', link: '/messages' });
        }

        // 2. Проверенные домашки (с момента lastSeen)
        const graded = (subsRes.data as any[]).filter(
          s => s.status === 'GRADED' && new Date(s.updated_at || s.created_at).getTime() > parseInt(lastSeen)
        );
        if (graded.length > 0) {
          notifs.push({ id: 'graded', type: 'graded', text: `${graded.length} домашних работ проверено`, sub: 'Посмотреть оценку', link: '/homework' });
        }

        // 3. Дедлайны завтра
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toDateString();
        const deadlines = (schedRes.data as any[]).filter(
          e => e.type === 'DEADLINE' && new Date(e.date).toDateString() === tomorrowStr
        );
        deadlines.forEach(d => {
          notifs.push({ id: `dl-${d.id}`, type: 'deadline', text: `Дедлайн завтра: ${d.title}`, sub: new Date(d.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), link: '/schedule' });
        });

        // 4. Занятие сегодня с ссылкой
        const todayStr = new Date().toDateString();
        const todayEvents = (schedRes.data as any[]).filter(
          e => e.type === 'WEBINAR' && new Date(e.date).toDateString() === todayStr && e.link
        );
        todayEvents.forEach(e => {
          notifs.push({ id: `ev-${e.id}`, type: 'deadline', text: `Занятие сегодня: ${e.title}`, sub: `в ${new Date(e.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, link: e.link });
        });

        // 5. Карточки на повтор
        const cardsDue = (cardsRes.data.dueTodayCount || 0) + (cardsRes.data.newCount || 0);
        if (cardsDue > 0) {
          notifs.push({ id: 'cards', type: 'cards', text: `${cardsDue} карточек ждут повторения`, sub: 'Учить сейчас', link: '/flashcards' });
        }

        setNotifications(notifs);
      } catch { /* silent */ }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('demo_answers');
    localStorage.removeItem('demo_results');
    localStorage.removeItem('demo_attempts');
    navigate('/login');
  };

  const getDisplayName = () => {
    if (userData?.name) {
      return `${userData.name} ${userData.surname || ''}`;
    }
    return 'Студент';
  };

  const getInitials = () => {
    if (userData?.name && userData?.surname) {
      return (userData.name[0] + userData.surname[0]).toUpperCase();
    }
    if (userData?.email) {
      return userData.email.substring(0, 2).toUpperCase();
    }
    return 'СТ';
  };

  const menuItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/schedule', icon: Calendar, label: 'Расписание' },
    { path: '/homework', icon: FileText, label: 'Домашнее задание' },
    { path: '/flashcards', icon: Layers, label: 'Флеш-карточки' },
    { path: '/messages', icon: MessageSquare, label: 'Сообщения' },
    { path: '/shop', icon: ShoppingCart, label: 'Магазин курсов' },
    { path: '/profile', icon: User, label: 'Мой профиль' },
    { path: '/settings', icon: Settings, label: 'Настройки' },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(i => i.path === location.pathname);
    if (item) return item.label;
    if (location.pathname === '/admin') return 'Управление курсами';
    if (location.pathname === '/admin/groups') return 'Управление потоками';
    if (location.pathname === '/admin/users') return 'Управление пользователями';
    if (location.pathname === '/admin/decks') return 'Флеш-карточки';
    if (location.pathname === '/flashcards') return 'Флеш-карточки';
    if (location.pathname.startsWith('/curator')) return 'Кабинет куратора';
    if (location.pathname.includes('/mistakes')) return 'Разбор полетов';
    return 'Платформа';
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans">
      
      {/* АВТОМАТИЧЕСКАЯ ВЫДВИЖНАЯ ПАНЕЛЬ */}
      {/* 🔥 ИЗМЕНЕНО: Ширина при наведении стала w-[320px] вместо w-72 */}
      <aside className="group w-[92px] hover:w-[320px] bg-white border-r border-gray-100 flex flex-col shadow-sm shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-20">
        {/* 🔥 ИЗМЕНЕНО: Внутренний контейнер тоже стал w-[320px] */}
        <div className="p-5 flex flex-col h-full w-[320px]">
          
          <div className="flex items-center gap-4 mb-8 pl-1.5">
            <div className="w-10 h-10 bg-[#5A4BFF] rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Препод из <span className="text-[#5A4BFF]">МГУ</span>
            </span>
          </div>

          <nav className="space-y-1.5 w-full flex-1 pr-5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isShop = item.path === '/shop';
              const isMessages = item.path === '/messages';
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all relative ${
                    isActive 
                      ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm' 
                      : isShop 
                        ? 'text-purple-500 hover:bg-purple-50' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-[#5A4BFF]' : isShop ? 'text-purple-400' : 'text-gray-400'}`} />
                    
                    {isMessages && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                    {item.label}
                    {isMessages && unreadCount > 0 && (
                       <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                         {unreadCount}
                       </span>
                    )}
                  </span>
                </Link>
              );
            })}

            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-gray-50 space-y-1.5">
                {/* 🔥 ИЗМЕНЕНО: Стили активных админских кнопок теперь такие же, как у обычных */}
                <Link
                  to="/admin"
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    location.pathname === '/admin'
                      ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className={`w-6 h-6 shrink-0 ${location.pathname === '/admin' ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Управление курсами
                  </span>
                </Link>

                <Link
                  to="/admin/users"
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    location.pathname === '/admin/users'
                      ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className={`w-6 h-6 shrink-0 ${location.pathname === '/admin/users' ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Управление пользователями
                  </span>
                </Link>

                <Link
                  to="/admin/groups"
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    location.pathname === '/admin/groups'
                      ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <ShieldCheck className={`w-6 h-6 shrink-0 ${location.pathname === '/admin/groups' ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Управление потоками
                  </span>
                </Link>

                <Link
                  to="/admin/decks"
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    location.pathname === '/admin/decks'
                      ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Layers className={`w-6 h-6 shrink-0 ${location.pathname === '/admin/decks' ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Карточки (колоды)
                  </span>
                </Link>

                <Link
                  to="/curator"
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    location.pathname.startsWith('/curator')
                      ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className={`w-6 h-6 shrink-0 ${location.pathname.startsWith('/curator') ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                  <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Кабинет куратора
                  </span>
                </Link>
              </div>
            )}
          </nav>

          <div className="mt-auto pr-5 pt-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 p-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-all group/logout"
            >
              <LogOut className="w-6 h-6 shrink-0 group-hover/logout:text-red-600" />
              <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Выйти
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* ГЛАВНАЯ ЧАСТЬ С ШАПКОЙ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <header className="h-24 bg-[#F4F7FE] flex items-center justify-between px-10 shrink-0">
          <h1 className="text-2xl font-black text-gray-900">{getPageTitle()}</h1>
          
          <div className="flex items-center gap-6">
            {/* КОЛОКОЛЬЧИК */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifPanel(v => !v); localStorage.setItem('notif_last_seen', Date.now().toString()); }}
                className="text-gray-400 hover:text-gray-700 transition-colors relative p-1"
              >
                <Bell className="w-6 h-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full px-1 border-2 border-[#F4F7FE]">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <span className="font-black text-gray-900">Уведомления</span>
                      <button onClick={() => setShowNotifPanel(false)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="font-bold text-sm">Всё спокойно</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {notifications.map(n => {
                          const iconMap = {
                            message: <MessageCircle className="w-4 h-4 text-indigo-500" />,
                            graded: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                            deadline: <AlertCircle className="w-4 h-4 text-rose-500" />,
                            cards: <Clock className="w-4 h-4 text-amber-500" />,
                          };
                          const bgMap = { message: 'bg-indigo-50', graded: 'bg-emerald-50', deadline: 'bg-rose-50', cards: 'bg-amber-50' };
                          const isExternal = n.link?.startsWith('http');
                          const Wrapper = isExternal
                            ? ({ children }: any) => <a href={n.link} target="_blank" rel="noreferrer" className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">{children}</a>
                            : ({ children }: any) => <div onClick={() => { navigate(n.link!); setShowNotifPanel(false); }} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">{children}</div>;
                          return (
                            <Wrapper key={n.id}>
                              <div className={`w-8 h-8 ${bgMap[n.type]} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                                {iconMap[n.type]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm leading-snug">{n.text}</p>
                                {n.sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{n.sub}</p>}
                              </div>
                            </Wrapper>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Link to="/profile" className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {getDisplayName()}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-[#5A4BFF] transition-colors">
                  Студент PRO
                </p>
              </div>

              <div className="w-10 h-10 bg-[#0A0A0A] border border-gray-800 rounded-full flex items-center justify-center text-[#00FFCC] font-black shadow-[0_0_10px_rgba(0,255,204,0.3)] text-sm tracking-wider overflow-hidden">
                {userData?.avatar ? (
                  <img src={userData.avatar.startsWith('http') ? userData.avatar : `${API_URL.replace('/api', '')}/${userData.avatar}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-10 pb-10">
          <Outlet />
        </main>
      </div>

    </div>
  );
}