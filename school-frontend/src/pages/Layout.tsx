import { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_ROLE_PERMISSIONS, type AdminPermission, type Role } from '../lib/auth';
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
  X,
  Menu,
  Trophy
} from 'lucide-react';

const API_URL = 'https://prepodmgy.ru/api';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  const [userData, setUserData] = useState<any>(null);
  
  const [unreadCount, setUnreadCount] = useState(0);

  // Мобильное выдвижное меню
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Уведомления
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<{id: string; type: 'message'|'graded'|'deadline'|'cards'; text: string; sub?: string; link?: string}[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Прочитанные уведомления (по сигнатуре id+text — чтобы при изменении содержимого снова загорались)
  const [seenSignatures, setSeenSignatures] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_seen') || '[]')); }
    catch { return new Set(); }
  });
  const sigOf = (n: { id: string; text: string }) => `${n.id}::${n.text}`;

  // Кол-во НОВЫХ (непрочитанных) — только они зажигают значок
  const newNotifCount = useMemo(
    () => notifications.filter(n => !seenSignatures.has(sigOf(n))).length,
    [notifications, seenSignatures]
  );

  // Список с сортировкой: новые сверху, прочитанные — серые внизу
  const sortedNotifications = useMemo(() => {
    const isNew = (n: typeof notifications[number]) => !seenSignatures.has(sigOf(n));
    return [...notifications].sort((a, b) => Number(isNew(b)) - Number(isNew(a)));
  }, [notifications, seenSignatures]);

  const openNotifPanel = () => {
    setShowNotifPanel(true);
    // помечаем всё текущее как прочитанное
    setSeenSignatures(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(sigOf(n)));
      localStorage.setItem('notif_seen', JSON.stringify([...next]));
      return next;
    });
  };

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
      setUserRole(payload.role || '');
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

  // Поллинг: лёгкие сообщения отдельно, тяжёлые уведомления редко.
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const unreadRes = await axios.get(`${API_URL}/messages/unread`, { headers }).catch(() => ({ data: { count: 0 } }));
        setUnreadCount(unreadRes.data.count || 0);
      } catch { /* silent */ }
    };

    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const [schedRes, subsRes, cardsRes] = await Promise.all([
          axios.get(`${API_URL}/schedule`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/submissions/my`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/flashcards/stats`, { headers }).catch(() => ({ data: { dueTodayCount: 0, newCount: 0 } })),
        ]);

        const notifs: typeof notifications = [];

        // 2. Проверенные домашки (за последние 7 дней)
        const graded = (subsRes.data as any[]).filter(
          s => s.status === 'GRADED' && new Date(s.updated_at || s.created_at).getTime() > weekAgo
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

        // Чистим прочитанные сигнатуры, которых больше нет среди актуальных уведомлений
        setSeenSignatures(prev => {
          if (prev.size === 0) return prev;
          const liveSigs = new Set(notifs.map(n => `${n.id}::${n.text}`));
          const next = new Set([...prev].filter(s => liveSigs.has(s)));
          if (next.size !== prev.size) {
            localStorage.setItem('notif_seen', JSON.stringify([...next]));
            return next;
          }
          return prev;
        });
      } catch { /* silent */ }
    };

    fetchUnread();
    fetchNotifs();
    const unreadInterval = setInterval(fetchUnread, 60000);
    const notifInterval = setInterval(fetchNotifs, 5 * 60 * 1000);
    return () => {
      clearInterval(unreadInterval);
      clearInterval(notifInterval);
    };
  }, []);

  // Закрываем мобильное меню при переходе на другую страницу
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Блокируем скролл фона, пока открыт мобильный drawer
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

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

  const effectiveRole = (userData?.role || userRole) as Role | undefined;
  const effectivePermissions = new Set<AdminPermission>([
    ...((effectiveRole ? DEFAULT_ROLE_PERMISSIONS[effectiveRole] : []) || []),
    ...((userData?.admin_permissions || []) as AdminPermission[]),
  ]);
  const can = (permission: AdminPermission) => effectivePermissions.has(permission);

  const menuItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/schedule', icon: Calendar, label: 'Расписание' },
    { path: '/homework', icon: FileText, label: 'Домашнее задание' },
    { path: '/flashcards', icon: Layers, label: 'Флеш-карточки' },
    { path: '/achievements', icon: Trophy, label: 'Достижения' },
    { path: '/messages', icon: MessageSquare, label: 'Сообщения' },
    { path: '/shop', icon: ShoppingCart, label: 'Магазин курсов' },
    { path: '/profile', icon: User, label: 'Мой профиль' },
    { path: '/settings', icon: Settings, label: 'Настройки' },
  ];

  // Админ/куратор-разделы (для мобильного меню)
  const adminItems = [
    { path: '/admin', icon: BookOpen, label: 'Управление курсами', show: can('MANAGE_COURSES') },
    { path: '/admin/users', icon: Users, label: 'Управление пользователями', show: can('MANAGE_USERS') },
    { path: '/admin/groups', icon: ShieldCheck, label: 'Управление потоками', show: can('MANAGE_GROUPS') },
    { path: '/admin/decks', icon: Layers, label: 'Карточки (колоды)', show: can('MANAGE_DECKS') },
    { path: '/curator', icon: Users, label: 'Кабинет куратора', show: can('CURATOR_DASHBOARD') },
  ].filter(item => item.show);
  const hasAdminItems = adminItems.length > 0;

  // Быстрая навигация снизу на телефоне (самое частое)
  const bottomNavItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/homework', icon: FileText, label: 'ДЗ' },
    { path: '/messages', icon: MessageSquare, label: 'Чат' },
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
      <aside className="group w-[92px] hover:w-[320px] bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-20">
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

            {hasAdminItems && (
              <div className="pt-2 mt-2 border-t border-gray-50 space-y-1.5">
                {adminItems.map((item) => {
                  const isActive = item.path === '/curator'
                    ? location.pathname.startsWith('/curator')
                    : location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#EEF2FF] text-[#5A4BFF] shadow-sm'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                      <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
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
        
        <header className="h-16 md:h-24 bg-[#F4F7FE] flex items-center justify-between px-4 md:px-10 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 -ml-1 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              aria-label="Открыть меню"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 truncate">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            {/* КОЛОКОЛЬЧИК */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { showNotifPanel ? setShowNotifPanel(false) : openNotifPanel(); }}
                className="text-gray-400 hover:text-gray-700 transition-colors relative p-1"
              >
                <Bell className={`w-6 h-6 ${newNotifCount > 0 ? 'text-[#5A4BFF]' : ''}`} />
                {newNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full px-1 border-2 border-[#F4F7FE]">
                    {newNotifCount}
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
                        {sortedNotifications.map(n => {
                          const isNew = !seenSignatures.has(sigOf(n));
                          const iconMap = {
                            message: <MessageCircle className={`w-4 h-4 ${isNew ? 'text-indigo-500' : 'text-gray-400'}`} />,
                            graded: <CheckCircle2 className={`w-4 h-4 ${isNew ? 'text-emerald-500' : 'text-gray-400'}`} />,
                            deadline: <AlertCircle className={`w-4 h-4 ${isNew ? 'text-rose-500' : 'text-gray-400'}`} />,
                            cards: <Clock className={`w-4 h-4 ${isNew ? 'text-amber-500' : 'text-gray-400'}`} />,
                          };
                          const bgMap = { message: 'bg-indigo-50', graded: 'bg-emerald-50', deadline: 'bg-rose-50', cards: 'bg-amber-50' };
                          const iconBg = isNew ? bgMap[n.type] : 'bg-gray-100';
                          const rowBg = isNew ? 'bg-[#5A4BFF]/5 hover:bg-[#5A4BFF]/10' : 'hover:bg-gray-50';
                          const isExternal = n.link?.startsWith('http');
                          const Wrapper = isExternal
                            ? ({ children }: any) => <a href={n.link} target="_blank" rel="noreferrer" className={`flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer relative ${rowBg}`}>{children}</a>
                            : ({ children }: any) => <div onClick={() => { navigate(n.link!); setShowNotifPanel(false); }} className={`flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer relative ${rowBg}`}>{children}</div>;
                          return (
                            <Wrapper key={n.id}>
                              {isNew && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5A4BFF]" />}
                              <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                                {iconMap[n.type]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${isNew ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>{n.text}</p>
                                {n.sub && <p className={`text-xs font-medium mt-0.5 ${isNew ? 'text-gray-400' : 'text-gray-300'}`}>{n.sub}</p>}
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
              <div className="text-right hidden sm:block">
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

        <main className="flex-1 overflow-y-auto px-4 md:px-10 pb-24 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* ───────── МОБИЛЬНОЕ ВЫДВИЖНОЕ МЕНЮ ───────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 w-[280px] max-w-[82vw] bg-white z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#5A4BFF] rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-black text-gray-900 tracking-tight">
                    Препод из <span className="text-[#5A4BFF]">МГУ</span>
                  </span>
                </div>
                <button onClick={() => setMobileNavOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const isMessages = item.path === '/messages';
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive ? 'bg-[#EEF2FF] text-[#5A4BFF]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                        {isMessages && unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold">{item.label}</span>
                    </Link>
                  );
                })}

                {hasAdminItems && (
                  <div className="pt-2 mt-2 border-t border-gray-50 space-y-1">
                    <p className="px-3 py-1 text-[10px] font-black text-gray-300 uppercase tracking-wider">Управление</p>
                    {adminItems.map((item) => {
                      const isActive =
                        item.path === '/curator'
                          ? location.pathname.startsWith('/curator')
                          : location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                            isActive ? 'bg-[#EEF2FF] text-[#5A4BFF]' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5A4BFF]' : 'text-gray-400'}`} />
                          <span className="text-sm font-bold">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </nav>

              <div className="p-3 border-t border-gray-50">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 p-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-bold">Выйти</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ───────── МОБИЛЬНАЯ НИЖНЯЯ НАВИГАЦИЯ ───────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white/95 backdrop-blur border-t border-gray-100 flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isMessages = item.path === '/messages';
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                isActive ? 'text-[#5A4BFF]' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {isMessages && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full px-1 border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold leading-none">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-gray-400"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold leading-none">Меню</span>
        </button>
      </nav>

    </div>
  );
}