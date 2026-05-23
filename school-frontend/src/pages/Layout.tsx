import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  Users
} from 'lucide-react';

const API_URL = 'https://prepodmgy.ru/api';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [userData, setUserData] = useState<any>(null);
  
  // 🔥 СТЕЙТ ДЛЯ НЕПРОЧИТАННЫХ СООБЩЕНИЙ
  const [unreadCount, setUnreadCount] = useState(0);

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

  // 🔥 ПОЛЛИНГ НЕПРОЧИТАННЫХ СООБЩЕНИЙ (раз в 5 секунд)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_URL}/messages/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCount(res.data.count);
      } catch (e) {
        // Тихо гасим ошибку, чтобы не засорять консоль
      }
    };

    fetchUnread(); // Сразу при загрузке
    const interval = setInterval(fetchUnread, 5000); // И потом каждые 5 сек
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
            <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F4F7FE]"></span>
            </button>
            
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