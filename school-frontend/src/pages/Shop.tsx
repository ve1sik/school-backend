import { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, Sparkles, GraduationCap, CreditCard, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

export default function Shop() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<string[]>([]); // Чтобы знать, что уже куплено

  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, profileRes] = await Promise.all([
        axios.get(`${API_URL}/groups/shop`, getTokenConfig()),
        axios.get(`${API_URL}/auth/profile`, getTokenConfig())
      ]);
      
      // Фильтруем только публичные (где цена > 0)
      setGroups(groupsRes.data.filter((g: any) => g.price > 0));
      // Запоминаем ID групп, в которых студент уже состоит
      setUserGroups(profileRes.data.groups?.map((g: any) => g.id) || []);
    } catch (error) {
      console.error("Ошибка загрузки магазина", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = (group: any) => {
    // 🔥 СЮДА МЫ ПОТОМ ВШЬЕМ ПЕРЕХОД НА КАССУ
    alert(`Брат, скоро тут будет переход на оплату ${group.title} за ${group.price}₽!`);
  };

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-gray-900 mb-4 flex items-center gap-4">
          <ShoppingCart className="w-10 h-10 text-[#5A4BFF]" /> Магазин курсов
        </h1>
        <p className="text-xl text-gray-500 font-medium">Выбирай направление и начни путь к высокому баллу прямо сейчас! 🚀</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groups.map((group) => {
          const isOwned = userGroups.includes(group.id);
          
          return (
            <motion.div 
              whileHover={{ y: -10 }}
              key={group.id} 
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col group transition-all hover:shadow-2xl hover:border-indigo-100"
            >
              {/* Верхняя часть карточки (Визуал) */}
              <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-widest w-fit">
                  {group.title.split(' ')[0]} {/* Первое слово названия как категория */}
                </div>
                <h3 className="text-2xl font-black text-white leading-tight">{group.title}</h3>
              </div>

              {/* Контент карточки */}
              <div className="p-8 flex-1 flex flex-col">
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-600 font-bold">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Доступ ко всем урокам модуля</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 font-bold">
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                    <span>Проверка ДЗ куратором</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Авторские конспекты и тесты</span>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Стоимость</span>
                    <span className="text-3xl font-black text-gray-900">{group.price} ₽</span>
                  </div>
                  
                  {isOwned ? (
                    <div className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> КУПЛЕНО
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleBuy(group)}
                      className="px-8 py-4 bg-[#5A4BFF] hover:bg-black text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" /> КУПИТЬ
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}