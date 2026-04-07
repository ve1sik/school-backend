import { useState, useEffect } from 'react';
import { BookOpen, Users, Settings, Plus, Loader2, CheckCircle, GraduationCap, X, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Базовый URL твоего бэкенда
const API_URL = 'https://9bd56d0b1eef2b86-141-105-25-14.serveousercontent.com';

export default function AdminCourses() {
  // Состояния для создания курса
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Состояния для уведомлений
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Готово!');

  // Состояния для тем
  const [selectedCourseForThemes, setSelectedCourseForThemes] = useState<any | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [newThemeTitle, setNewThemeTitle] = useState('');
  const [themeCreationError, setThemeCreationError] = useState('');

  // Состояния для уроков
  const [selectedThemeForLesson, setSelectedThemeForLesson] = useState<any | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');

  // Функция получения конфига с токеном (паспортом) для бэкенда
  const getTokenConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // 1. Получение всех курсов
  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_URL}/courses`, getTokenConfig());
      setCourses(res.data);
    } catch (err: any) {
      console.error('Ошибка при загрузке курсов:', err);
      if (err.response?.status === 401) {
        alert("Брат, сессия истекла или ты не вошел. Перезайди в аккаунт!");
      }
    }
  };

  // 2. Создание нового курса
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setIsLoading(true);
    try {
      // Собираем данные для отправки
      const courseData = { 
        title: title, 
        description: description,
        cover_url: "" // Можно оставить пустым
      };

      await axios.post(`${API_URL}/courses`, courseData, getTokenConfig());
      
      setTitle('');
      setDescription('');
      await fetchCourses(); // Обновляем список
      
      setToastMessage('Курс успешно добавлен!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Ошибка: ${err.response?.data?.message || 'Не удалось создать курс'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Создание темы внутри курса
  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForThemes || !newThemeTitle) return;

    try {
      const res = await axios.post(
        `${API_URL}/courses/${selectedCourseForThemes.id}/themes`, 
        {
          title: newThemeTitle,
          order_index: (selectedCourseForThemes.themes?.length || 0) + 1,
        },
        getTokenConfig()
      );

      // Локально обновляем состояние, чтобы сразу увидеть результат
      const updatedThemes = [...(selectedCourseForThemes.themes || []), res.data];
      setSelectedCourseForThemes({ ...selectedCourseForThemes, themes: updatedThemes });
      setNewThemeTitle(''); 
      fetchCourses();
    } catch (err: any) {
      setThemeCreationError(err.response?.data?.message || 'Ошибка создания темы');
    }
  };

  // 4. Создание урока внутри темы
  const handleCreateLesson = async (theme: any) => {
    if (!selectedCourseForThemes || !newLessonTitle || !theme) return;
    try {
      const res = await axios.post(
        `${API_URL}/courses/themes/${theme.id}/lessons`, 
        {
          title: newLessonTitle,
          video_url: newLessonVideoUrl,
          order_index: (theme.lessons?.length || 0) + 1,
        },
        getTokenConfig()
      );

      const updatedLessons = [...(theme.lessons || []), res.data];
      const updatedTheme = { ...theme, lessons: updatedLessons };
      const updatedThemes = selectedCourseForThemes.themes.map((t: any) => t.id === theme.id ? updatedTheme : t);
      
      setSelectedCourseForThemes({ ...selectedCourseForThemes, themes: updatedThemes });
      setSelectedThemeForLesson(null); 
      setNewLessonTitle('');
      setNewLessonVideoUrl('');
      fetchCourses();
    } catch (err: any) {
      alert(`Ошибка урока: ${err.response?.data?.message || err.message}`);
    }
  };

  const openThemeModal = (course: any) => {
    setSelectedCourseForThemes(course);
    setShowThemeModal(true);
  };

  const closeThemeModal = () => {
    setShowThemeModal(false);
    setSelectedCourseForThemes(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex text-gray-900">
      {/* Боковое меню */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">МГУ<span className="text-indigo-600">.Admin</span></span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
            <BookOpen className="w-5 h-5" /> Контент
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl font-semibold transition-colors">
            <Users className="w-5 h-5" /> Ученики
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl font-semibold transition-colors">
            <Settings className="w-5 h-5" /> Настройки
          </a>
        </nav>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">Управление контентом</h1>
              <p className="text-gray-500 font-medium mt-1">Создание программ обучения напрямую в базу</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">Администратор</p>
                <p className="text-xs text-green-500 font-medium">В сети (Local)</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center font-bold">А</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Форма создания */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 sticky top-28">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" /> Новый курс
                </h2>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Название</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр: История России" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 transition-all" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Описание</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Кратко о курсе..." rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-600 resize-none" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Создать курс'}
                  </button>
                </form>
              </div>
            </div>

            {/* Список курсов */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 px-2">Всего курсов: {courses.length}</h2>
              {courses.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100">
                  <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">В базе пока нет курсов</p>
                </div>
              ) : (
                [...courses].reverse().map((course) => (
                  <motion.div key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-indigo-200 transition-all">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{course.description || 'Без описания'}</p>
                    </div>
                    <div className="text-center px-4 hidden md:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Темы</p>
                        <p className="text-lg font-black text-gray-900">{course.themes?.length || 0}</p>
                    </div>
                    <button onClick={() => openThemeModal(course)} className="px-5 py-2.5 bg-gray-50 hover:bg-indigo-600 hover:text-white text-gray-700 rounded-xl font-bold transition-all flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Настроить
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Модалка для Тем и Уроков */}
      <AnimatePresence>
        {showThemeModal && selectedCourseForThemes && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
              <button onClick={closeThemeModal} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all">
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-8 border-b border-gray-100 bg-indigo-50/30">
                <h2 className="text-2xl font-black text-gray-900">Управление контентом: <span className="text-indigo-600">{selectedCourseForThemes.title}</span></h2>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex gap-8">
                {/* Список существующих тем */}
                <div className="flex-1 space-y-6">
                  {selectedCourseForThemes.themes?.length === 0 && <p className="text-gray-400 text-center py-10">Тем еще нет. Добавь первую!</p>}
                  {selectedCourseForThemes.themes?.map((theme: any) => (
                    <div key={theme.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-900">#{theme.order_index} {theme.title}</h4>
                        <button onClick={() => setSelectedThemeForLesson(theme)} className="text-xs font-bold text-indigo-600 hover:underline">+ Добавить урок</button>
                      </div>

                      {/* Уроки в теме */}
                      <div className="space-y-2">
                        {theme.lessons?.map((lesson: any) => (
                          <div key={lesson.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3 text-sm font-medium">
                            <PlayCircle className="w-4 h-4 text-indigo-400" />
                            {lesson.title}
                          </div>
                        ))}
                      </div>

                      {/* Форма добавления урока */}
                      {selectedThemeForLesson?.id === theme.id && (
                        <div className="mt-4 p-4 bg-white rounded-xl border-2 border-indigo-100 space-y-3">
                          <input type="text" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="Название урока" className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-600" />
                          <input type="text" value={newLessonVideoUrl} onChange={(e) => setNewLessonVideoUrl(e.target.value)} placeholder="Ссылка на видео (YouTube)" className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-600" />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setSelectedThemeForLesson(null)} className="px-3 py-1.5 text-xs font-bold text-gray-400">Отмена</button>
                            <button onClick={() => handleCreateLesson(theme)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Сохранить</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Форма создания темы */}
                <div className="w-80 shrink-0">
                  <div className="bg-gray-900 rounded-3xl p-6 text-white sticky top-0">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Новая тема</h3>
                    <form onSubmit={handleCreateTheme} className="space-y-4">
                      <input type="text" value={newThemeTitle} onChange={(e) => setNewThemeTitle(e.target.value)} placeholder="Название раздела" className="w-full p-3 bg-white/10 border border-white/10 rounded-xl text-sm outline-none focus:border-indigo-400" required />
                      {themeCreationError && <p className="text-red-400 text-xs">{themeCreationError}</p>}
                      <button type="submit" className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 rounded-xl font-bold text-sm transition-all">Создать тему</button>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Всплывающее уведомление */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 right-10 bg-white border border-green-100 p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[200]">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <p className="font-bold text-gray-900">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}