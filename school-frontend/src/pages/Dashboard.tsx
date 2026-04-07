import { useState } from 'react';
import { Home, BookOpen, Calendar, FileText, LayoutGrid, MessageSquare, Settings, GraduationCap, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  // Состояние, чтобы понимать, наведена ли мышка на панель
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Главная', active: true },
    { icon: BookOpen, label: 'Курсы', active: false },
    { icon: Calendar, label: 'Расписание', active: false },
    { icon: FileText, label: 'Домашнее задание', active: false },
    { icon: LayoutGrid, label: 'Карточки', active: false },
    { icon: MessageSquare, label: 'Сообщения', active: false },
    { icon: Settings, label: 'Настройки', active: false },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-hidden">
      
      {/* УМНАЯ БОКОВАЯ ПАНЕЛЬ (Сворачивается и разворачивается) */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-100 flex flex-col z-50 transition-all duration-300 ease-in-out shadow-xl shadow-brand/5 ${isHovered ? 'w-64' : 'w-20'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Логотип */}
        <div className="h-20 flex items-center px-6 border-b border-gray-50 shrink-0">
          <div className="w-8 h-8 bg-[#3b1c94] rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className={`ml-3 text-lg font-extrabold text-gray-900 transition-opacity duration-300 whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0 hidden'}`}>
            Study<span className="text-[#3b1c94]">Platform</span>
          </span>
        </div>

        {/* Навигация */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item, idx) => (
            <a 
              key={idx} 
              href="#" 
              className={`flex items-center px-3 py-3.5 rounded-xl transition-all whitespace-nowrap group ${item.active ? 'bg-[#3b1c94]/10 text-[#3b1c94]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${item.active ? 'text-[#3b1c94]' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className={`ml-4 text-sm font-bold transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                {item.label}
              </span>
            </a>
          ))}
        </nav>

        {/* Кнопка выхода внизу */}
        <div className="p-4 border-t border-gray-50 shrink-0">
          <button onClick={handleLogout} className="flex items-center px-3 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`ml-4 text-sm font-bold transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
              Выйти из аккаунта
            </span>
          </button>
        </div>
      </aside>

      {/* ГЛАВНЫЙ КОНТЕНТ (Сдвигается вправо, чтобы не перекрываться панелью) */}
      <main className="flex-1 ml-20 transition-all duration-300 p-8 lg:p-12 overflow-y-auto h-screen relative">
        
        {/* Шапка профиля */}
        <div className="max-w-4xl mx-auto bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#3b1c94]/10 to-purple-500/5 rounded-bl-full pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8 w-full text-left">Профиль</h1>
            
            <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-white shadow-lg mb-4 flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              Уровень 1
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">Ученик Учеников</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">student@example.com</p>
            
            <button className="px-6 py-2.5 bg-[#0077FF] hover:bg-[#0066DD] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
              <span className="font-extrabold">VK</span> Связать аккаунт
            </button>
          </div>
        </div>

        {/* ВРЕМЕННАЯ КНОПКА ДЛЯ АДМИНА */}
        <button
          onClick={() => navigate('/admin/courses')}
          className="fixed bottom-8 right-8 z-40 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 hover:-translate-y-1 transition-all border border-gray-700 group"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="font-bold text-sm">В Админку</span>
        </button>

      </main>
    </div>
  );
}