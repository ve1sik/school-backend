import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, BookOpen, Loader2, Save, X, Edit3, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

export default function AdminGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  
  // Для модалки редактирования
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [groupsRes, coursesRes] = await Promise.all([
        axios.get(`${API_URL}/groups`, getTokenConfig()),
        axios.get(`${API_URL}/courses`, getTokenConfig())
      ]);
      setGroups(groupsRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error("Ошибка загрузки данных", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupTitle.trim()) return;
    try {
      await axios.post(`${API_URL}/groups`, { title: newGroupTitle }, getTokenConfig());
      setNewGroupTitle('');
      fetchData();
    } catch (error) {
      console.error("Ошибка создания группы", error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Точно удалить эту группу? Все студенты потеряют к ней доступ.')) return;
    try {
      await axios.delete(`${API_URL}/groups/${id}`, getTokenConfig());
      fetchData();
    } catch (error) {
      console.error("Ошибка удаления", error);
    }
  };

  const openGroupModal = async (groupId: string) => {
    try {
      const res = await axios.get(`${API_URL}/groups/${groupId}`, getTokenConfig());
      setSelectedGroup(res.data);
      setSelectedCourseIds(res.data.courses?.map((c: any) => c.id) || []);
      setShowModal(true);
    } catch (error) {
      console.error("Ошибка загрузки группы", error);
    }
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSaveGroupCourses = async () => {
    if (!selectedGroup) return;
    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.id}/courses`, { courseIds: selectedCourseIds }, getTokenConfig());
      setShowModal(false);
      fetchData(); // Обновляем список, чтобы счетчики обновились
    } catch (error) {
      console.error("Ошибка сохранения курсов", error);
    }
  };

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Потоки и Группы</h1>
          <p className="text-gray-500 font-medium">Управляй учебными потоками, привязывай курсы и назначай кураторов.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ЛЕВАЯ КОЛОНКА: Создание группы */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Users className="w-6 h-6 text-[#5A4BFF]" /> Новая группа</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input 
                type="text" 
                value={newGroupTitle} 
                onChange={(e) => setNewGroupTitle(e.target.value)} 
                placeholder="Напр: ОГЭ История - Сентябрь" 
                className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all font-bold text-gray-700" 
                required 
              />
              <button type="submit" className="w-full py-4 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-500/20">
                <Plus className="w-5 h-5" /> Создать поток
              </button>
            </form>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Список групп */}
        <div className="lg:col-span-2 space-y-4">
          {groups.length === 0 ? (
            <div className="bg-white p-10 rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
              <Users className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-black text-gray-400">Групп пока нет</h3>
              <p className="text-gray-400 font-medium mt-2">Создай первую группу, чтобы распределять учеников.</p>
            </div>
          ) : (
            groups.map(group => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={group.id} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group/card">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">{group.title}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                      <Users className="w-4 h-4" /> Студентов: {group._count?.students || 0}
                    </span>
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Доступно курсов: {group._count?.courses || 0}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => openGroupModal(group.id)} className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Настроить
                  </button>
                  <button onClick={() => handleDeleteGroup(group.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* МОДАЛКА НАСТРОЙКИ ГРУППЫ */}
      <AnimatePresence>
        {showModal && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm cursor-pointer"></motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-gray-100 max-h-[90vh] flex flex-col">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              
              <h3 className="text-3xl font-black text-gray-900 mb-2">{selectedGroup.title}</h3>
              <p className="text-gray-500 font-medium mb-8 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Настройка доступов</p>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8 space-y-6">
                
                {/* БЛОК КУРСОВ */}
                <div>
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Какие курсы видят ученики этой группы?</h4>
                  <div className="space-y-3">
                    {courses.map(course => {
                      const isSelected = selectedCourseIds.includes(course.id);
                      return (
                        <div 
                          key={course.id} 
                          onClick={() => handleToggleCourse(course.id)}
                          className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'border-[#5A4BFF] bg-indigo-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#5A4BFF] border-[#5A4BFF]' : 'border-gray-300'}`}>
                              {isSelected && <ShieldCheck className="w-4 h-4 text-white" />}
                            </div>
                            <span className={`font-bold ${isSelected ? 'text-[#5A4BFF]' : 'text-gray-700'}`}>{course.title}</span>
                          </div>
                        </div>
                      )
                    })}
                    {courses.length === 0 && <p className="text-sm text-gray-400 font-medium">Нет созданных курсов. Сначала создайте курс.</p>}
                  </div>
                </div>

                {/* БЛОК СТУДЕНТОВ (Пока просто заглушка-инфо) */}
                <div>
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Ученики в группе ({selectedGroup.students?.length || 0})</h4>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                    <p className="text-sm text-gray-500 font-medium">Модуль добавления учеников по спискам/Email будет добавлен на следующем этапе разработки.</p>
                  </div>
                </div>

              </div>

              <button onClick={handleSaveGroupCourses} className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 shrink-0">
                <Save className="w-5 h-5" /> Сохранить изменения
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}