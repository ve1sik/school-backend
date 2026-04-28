import { useState, useEffect } from 'react';
import { GraduationCap, X, PlayCircle, Trash2, ArrowLeft, FileText, CheckSquare, FileBadge, Eye, EyeOff, Pencil, Type, PenTool, CheckCircle2, ArrowUp, ArrowDown, Image as ImageIcon, UploadCloud, Plus, FileDown, Link2, BookOpen, FileEdit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://prepodmgy.ru/api';

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('vk.com/video_ext.php')) return url;
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
  return url;
};

export default function AdminCourses() {
  const [activeSection, setActiveSection] = useState<'courses' | 'homework'>('courses');

  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedCourseForThemes, setSelectedCourseForThemes] = useState<any | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [newThemeTitle, setNewThemeTitle] = useState('');
  const [selectedThemeForLesson, setSelectedThemeForLesson] = useState<any | null>(null);
  
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editThemeTitle, setEditThemeTitle] = useState('');

  const [editingLessonTitleId, setEditingLessonTitleId] = useState<string | null>(null);
  const [editLessonInlineTitle, setEditLessonInlineTitle] = useState('');

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);

  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navigate = useNavigate();
  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchItems();
    setShowThemeModal(false);
    setSelectedCourseForThemes(null);
  }, [activeSection]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/courses`, getTokenConfig());
      setItems(res.data);
      
      setSelectedCourseForThemes((prev: any) => {
        if (!prev) return null;
        const updated = res.data.find((c: any) => c.id === prev.id);
        return updated || null;
      });
    } catch (err) { 
      console.error('Ошибка загрузки данных', err);
      setItems([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/courses`, { title, description: '', cover_url: "" }, getTokenConfig());
      setTitle(''); 
      fetchItems();
      showToast('Программа успешно создана!');
    } catch (err) { 
      showToast('Ошибка при создании', 'error'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/themes`, { courseId: selectedCourseForThemes.id, title: newThemeTitle, order_index: (selectedCourseForThemes.themes?.length || 0) + 1 }, getTokenConfig());
      setNewThemeTitle(''); fetchItems();
      showToast('Новый модуль добавлен!');
    } catch (err) { showToast('Ошибка при добавлении', 'error'); }
  };

  const saveItemTitle = async (id: string) => {
    if (!editCourseTitle.trim()) { setEditingCourseId(null); return; }
    setItems(prev => prev.map(c => c.id === id ? { ...c, title: editCourseTitle } : c));
    setEditingCourseId(null);
    try { 
      await axios.patch(`${API_URL}/courses/${id}`, { title: editCourseTitle }, getTokenConfig()); 
      fetchItems(); 
      showToast('Название сохранено');
    } catch (err) { fetchItems(); showToast('Ошибка сохранения', 'error'); }
  };

  const saveThemeTitle = async (id: string) => {
    if (!editThemeTitle.trim()) { setEditingThemeId(null); return; }
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: prev.themes.map((t: any) => t.id === id ? { ...t, title: editThemeTitle } : t) } : null);
    setEditingThemeId(null);
    try { 
      await axios.patch(`${API_URL}/themes/${id}`, { title: editThemeTitle }, getTokenConfig()); 
      fetchItems(); 
      showToast('Название сохранено');
    } catch (err) { fetchItems(); showToast('Ошибка сохранения', 'error'); }
  };

  const saveLessonTitle = async (id: string) => {
    if (!editLessonInlineTitle.trim()) { setEditingLessonTitleId(null); return; }
    setSelectedCourseForThemes((prev: any) => prev ? {
      ...prev, themes: prev.themes.map((t: any) => ({
        ...t, lessons: t.lessons.map((l: any) => l.id === id ? { ...l, title: editLessonInlineTitle } : l)
      }))
    } : null);
    setEditingLessonTitleId(null);
    try { 
      await axios.patch(`${API_URL}/lessons/${id}`, { title: editLessonInlineTitle }, getTokenConfig()); 
      fetchItems(); 
      showToast('Название сохранено');
    } catch (err) { fetchItems(); showToast('Ошибка сохранения', 'error'); }
  };

  const addBlock = (type: 'video' | 'text' | 'test' | 'test_short' | 'written' | 'image' | 'video_file' | 'file' | 'link') => {
    const newBlock: any = { id: Date.now().toString(), type };
    if (type === 'video') { newBlock.url = ''; newBlock.title = 'Видео'; }
    if (type === 'text') { newBlock.content = ''; newBlock.title = 'Текст лекции'; newBlock.image = ''; newBlock.imageName = ''; }
    if (type === 'image') { newBlock.url = ''; newBlock.fileName = ''; newBlock.title = 'Изображение'; }
    if (type === 'video_file') { newBlock.url = ''; newBlock.fileName = ''; newBlock.title = 'Видео-файл'; }
    if (type === 'file') { newBlock.url = ''; newBlock.fileName = ''; newBlock.content = ''; newBlock.title = 'Файл для скачивания'; }
    if (type === 'link') { newBlock.url = ''; newBlock.buttonText = 'Перейти'; newBlock.title = 'Ссылка / Кнопка'; }
    if (type === 'test') { newBlock.question = ''; newBlock.maxAttempts = 3; newBlock.options = [{ text: '', isCorrect: false }]; newBlock.explanation = ''; newBlock.questionImage = ''; newBlock.questionImageName = ''; newBlock.title = 'Тест'; }
    if (type === 'test_short') { newBlock.question = ''; newBlock.correctAnswer = ''; newBlock.maxAttempts = 3; newBlock.explanation = ''; newBlock.questionImage = ''; newBlock.questionImageName = ''; newBlock.title = 'Тест с кратким ответом'; }
    if (type === 'written') { newBlock.question = ''; newBlock.maxScore = 3; newBlock.questionImage = ''; newBlock.questionImageName = ''; newBlock.title = 'Тест с развернутым ответом'; }
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, data: any) => { setBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b)); };
  const removeBlock = (id: string) => { setBlocks(blocks.filter(b => b.id !== id)); };
  const moveBlockUp = (index: number) => { if (index === 0) return; const newBlocks = [...blocks]; [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]; setBlocks(newBlocks); };
  const moveBlockDown = (index: number) => { if (index === blocks.length - 1) return; const newBlocks = [...blocks]; [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]]; setBlocks(newBlocks); };

  const handleFileUpload = async (blockId: string, event: React.ChangeEvent<HTMLInputElement>, targetUrlField = 'url', targetNameField = 'fileName') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast(`Загрузка файла ${file.name}...`, 'success');
      const res = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } });
      updateBlock(blockId, { [targetUrlField]: res.data.url, [targetNameField]: res.data.fileName || file.name });
      showToast(`Файл успешно загружен!`);
    } catch (err) { showToast('Ошибка при загрузке файла', 'error'); }
  };

  const startEditingLesson = (theme: any, lesson: any) => {
    setSelectedThemeForLesson(theme);
    setEditingLessonId(lesson.id);
    setNewLessonTitle(lesson.title);
    let initialBlocks = [];
    if (lesson.content && lesson.content.startsWith('[')) {
      try { initialBlocks = JSON.parse(lesson.content); } catch (e) {}
    } else {
      if (lesson.video_url) initialBlocks.push({ id: 'v1', type: 'video', url: lesson.video_url, title: 'Видео' });
      if (lesson.content) initialBlocks.push({ id: 't1', type: 'text', content: lesson.content, title: 'Текст', image: '', imageName: '' });
      if (lesson.test_data) initialBlocks.push({ id: 'ts1', type: 'test', question: lesson.test_data.question, maxAttempts: lesson.test_data.maxAttempts || 3, options: lesson.test_data.options, title: 'Тест' });
    }
    setBlocks(initialBlocks);
    setTimeout(() => document.getElementById('lesson-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSaveLesson = async (theme: any) => {
    if (!newLessonTitle || !theme) return;
    const cleanedBlocks = blocks.map(b => {
      if (b.type === 'test' || b.type === 'test_short') return { ...b, maxAttempts: b.maxAttempts === '' ? 1 : b.maxAttempts };
      if (b.type === 'written') return { ...b, maxScore: b.maxScore === '' ? 3 : b.maxScore };
      return b;
    });

    const payload = { 
      themeId: theme.id, 
      title: newLessonTitle, 
      type: 'TEXT', 
      content: JSON.stringify(cleanedBlocks), 
      video_url: null, 
      test_data: null,
      is_homework: activeSection === 'homework' 
    };

    try {
      if (editingLessonId) {
        await axios.patch(`${API_URL}/lessons/${editingLessonId}`, payload, getTokenConfig());
        showToast('Изменения сохранены!');
      } else {
        await axios.post(`${API_URL}/lessons`, { ...payload, order_index: (theme.lessons?.length || 0) + 1 }, getTokenConfig());
        showToast('Успешно создано!');
      }
      resetLessonForm(); fetchItems();
    } catch (err) { showToast('Ошибка сохранения', 'error'); }
  };

  const resetLessonForm = () => { setSelectedThemeForLesson(null); setEditingLessonId(null); setNewLessonTitle(''); setBlocks([]); };

  const handleDeleteItem = async (id: string) => {
    setItems(prev => prev.filter(c => c.id !== id));
    if (selectedCourseForThemes?.id === id) { setShowThemeModal(false); setSelectedCourseForThemes(null); }
    showToast('Удалено');
    try { await axios.delete(`${API_URL}/courses/${id}`, getTokenConfig()); } catch (err) { fetchItems(); showToast('Ошибка удаления', 'error'); }
  };

  const handleDeleteTheme = async (id: string) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: prev.themes.filter((t: any) => t.id !== id) } : null);
    showToast('Удалено');
    try { await axios.delete(`${API_URL}/themes/${id}`, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); showToast('Ошибка удаления', 'error'); }
  };

  const handleDeleteLesson = async (id: string) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: prev.themes.map((t: any) => ({ ...t, lessons: t.lessons.filter((l: any) => l.id !== id) })) } : null);
    if (editingLessonId === id) resetLessonForm();
    showToast('Удалено');
    try { await axios.delete(`${API_URL}/lessons/${id}`, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); showToast('Ошибка удаления', 'error'); }
  };

  const handleToggleThemeVisibility = async (id: string, status: boolean) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: prev.themes.map((t: any) => t.id === id ? { ...t, is_visible: !status } : t) } : null);
    try { await axios.patch(`${API_URL}/themes/${id}`, { is_visible: !status }, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); }
  };

  const handleToggleLessonVisibility = async (id: string, status: boolean) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: prev.themes.map((t: any) => ({ ...t, lessons: t.lessons.map((l: any) => l.id === id ? { ...l, is_visible: !status } : l) })) } : null);
    try { await axios.patch(`${API_URL}/lessons/${id}`, { is_visible: !status }, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); }
  };

  const ui = {
    title: activeSection === 'courses' ? 'Теория и Уроки' : 'Домашние задания',
    createLabel: 'Создать новую программу',
    inputPlaceholder: 'Название курса (общая база)...',
    themeLabel: 'Модуль',
    primaryColor: activeSection === 'courses' ? 'bg-[#5A4BFF]' : 'bg-purple-600',
    primaryHover: activeSection === 'courses' ? 'hover:bg-[#4a3dec]' : 'hover:bg-purple-700',
    lightColor: activeSection === 'courses' ? 'bg-indigo-50' : 'bg-purple-50',
    textColor: activeSection === 'courses' ? 'text-indigo-600' : 'text-purple-600',
    borderColor: activeSection === 'courses' ? 'border-[#5A4BFF]' : 'border-purple-600',
    newLessonBtn: activeSection === 'courses' ? '+ Новый урок' : '+ Новое задание',
    lessonEditTitle: activeSection === 'courses' ? 'Редактирование урока' : 'Редактирование задания',
    lessonCreateTitle: activeSection === 'courses' ? 'Создание урока' : 'Создание задания',
    lessonPlaceholder: activeSection === 'courses' ? 'Название урока' : 'Название задания',
    lessonSaveBtn: activeSection === 'courses' ? 'Создать урок' : 'Создать задание',
    emptyModuleText: activeSection === 'courses' ? 'В этом модуле пока нет уроков.' : 'В этом модуле пока нет заданий.',
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex text-gray-900">
      
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-10 shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center"><GraduationCap className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-black tracking-tight">Admin<span className="text-indigo-600">Pro</span></span>
        </div>

        <div className="flex-1 px-4 py-8 space-y-3">
          <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Разделы управления</h3>
          
          <button 
            onClick={() => setActiveSection('courses')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
              activeSection === 'courses' ? 'bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-5 h-5" /> Курсы и Уроки
          </button>
          
          <button 
            onClick={() => setActiveSection('homework')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
              activeSection === 'homework' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileEdit className="w-5 h-5" /> Домашние задания
          </button>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 px-5 py-4 w-full text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-colors">
            <ArrowLeft className="w-5 h-5" /> На портал
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-black mb-8">{ui.title}</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm sticky top-8 border border-gray-100">
                <h2 className="text-xl font-black mb-6">{ui.createLabel}</h2>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder={ui.inputPlaceholder} 
                    className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all font-medium" 
                    required 
                  />
                  <button type="submit" disabled={isLoading} className={`w-full py-4 text-white rounded-xl font-black transition-colors ${ui.primaryColor} ${ui.primaryHover} flex items-center justify-center gap-2`}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Добавить'}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => { setSelectedCourseForThemes(item); setShowThemeModal(true); }}
                  className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-gray-200 border border-transparent transition-all group"
                >
                  <div className="flex-1 mr-4 min-w-0">
                    {editingCourseId === item.id ? (
                      <input 
                        autoFocus 
                        value={editCourseTitle} 
                        onChange={(e) => setEditCourseTitle(e.target.value)} 
                        onBlur={() => saveItemTitle(item.id)} 
                        onKeyDown={(e) => e.key === 'Enter' && saveItemTitle(item.id)} 
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xl font-black px-4 py-2 ${ui.lightColor} border-2 ${ui.borderColor} rounded-xl outline-none w-full`}
                      />
                    ) : (
                      <h3 
                        className={`text-xl font-black cursor-pointer hover:${ui.textColor} transition-colors flex items-center gap-3 min-w-0`}
                        onClick={(e) => { 
                          e.stopPropagation();
                          setEditingCourseId(item.id); 
                          setEditCourseTitle(item.title); 
                        }}
                      >
                        <span className="truncate">{item.title}</span> <Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </h3>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button className={`px-6 py-2.5 bg-gray-50 group-hover:${ui.primaryColor} group-hover:text-white text-gray-600 rounded-xl font-bold text-sm transition-colors`}>
                      Редактор
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }} 
                      className="p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && !isLoading && (
                <div className="p-10 text-center bg-gray-50 border border-dashed border-gray-200 rounded-[2rem]">
                  <p className="text-gray-400 font-bold text-lg">Список пуст. Создайте первую запись.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showThemeModal && selectedCourseForThemes && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex justify-center p-4">
            <motion.div className="bg-[#F8FAFC] rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col relative">
              <button onClick={() => setShowThemeModal(false)} className="absolute top-6 right-6 p-2 bg-white rounded-full z-10 shadow-sm"><X className="w-5 h-5" /></button>
              
              <div className="p-8 pb-6 bg-white border-b border-gray-100 flex items-center">
                <div className="flex-1 mr-4 min-w-0">
                  {editingCourseId === selectedCourseForThemes.id ? (
                    <input 
                      autoFocus 
                      value={editCourseTitle} 
                      onChange={(e) => setEditCourseTitle(e.target.value)} 
                      onBlur={() => saveItemTitle(selectedCourseForThemes.id)} 
                      onKeyDown={(e) => e.key === 'Enter' && saveItemTitle(selectedCourseForThemes.id)} 
                      className={`text-3xl font-black px-4 py-2 ${ui.lightColor} border-2 ${ui.borderColor} rounded-xl outline-none w-full max-w-2xl`}
                    />
                  ) : (
                    <h2 
                      className={`text-3xl font-black cursor-pointer hover:${ui.textColor} transition-colors flex items-center gap-3 group min-w-0`}
                      onClick={() => { setEditingCourseId(selectedCourseForThemes.id); setEditCourseTitle(selectedCourseForThemes.title); }}
                    >
                      <span className="truncate">{selectedCourseForThemes.title}</span> <Pencil className="w-6 h-6 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h2>
                  )}
                </div>
              </div>

              {/* 🔥 ВОТ ЗДЕСЬ ДОБАВИЛИ overflow-x-hidden ЧТОБЫ БОЛЬШЕ НИКОГДА НЕ ЛОМАЛОСЬ ВШИРЬ */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 flex flex-col lg:flex-row gap-8">
                
                {/* 🔥 А ЗДЕСЬ min-w-0 ЧТОБЫ БЛОК СЖИМАЛСЯ */}
                <div className="flex-1 space-y-6 min-w-0">
                  {selectedCourseForThemes.themes?.map((theme: any) => {
                    const visibleLessons = theme.lessons?.filter((l: any) => activeSection === 'homework' ? l.is_homework : !l.is_homework) || [];

                    return (
                      <div key={theme.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                          
                          {/* 🔥 И ЗДЕСЬ min-w-0 ДЛЯ НАЗВАНИЯ ТЕМЫ */}
                          <div className="flex-1 mr-4 min-w-0">
                            {editingThemeId === theme.id ? (
                              <input autoFocus value={editThemeTitle} onChange={(e) => setEditThemeTitle(e.target.value)} onBlur={() => saveThemeTitle(theme.id)} onKeyDown={(e) => e.key === 'Enter' && saveThemeTitle(theme.id)} className={`font-black text-2xl px-3 py-1.5 ${ui.lightColor} border-2 ${ui.borderColor} rounded-xl outline-none w-full`} />
                            ) : (
                              <h4 className={`font-black text-2xl cursor-pointer hover:${ui.textColor} transition-colors flex items-center gap-2 group min-w-0`} onClick={() => { setEditingThemeId(theme.id); setEditThemeTitle(theme.title); }}>
                                <span className="truncate">{ui.themeLabel} {theme.order_index}. {theme.title}</span> <Pencil className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </h4>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0 bg-gray-50 p-1.5 rounded-2xl">
                            <button onClick={() => handleToggleThemeVisibility(theme.id, theme.is_visible)} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 hover:text-gray-900 transition-colors">{theme.is_visible === false ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>
                            <button onClick={() => handleDeleteTheme(theme.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
                            <button onClick={() => { resetLessonForm(); setSelectedThemeForLesson(theme); }} className={`px-5 py-2.5 ml-2 ${ui.primaryColor} text-white rounded-xl text-sm font-black shadow-md transition-colors`}>{ui.newLessonBtn}</button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {visibleLessons.map((lesson: any) => {
                            let hasVideo = false; let hasText = false; let hasTest = false; let hasShort = false; let hasWritten = false;
                            let hasImage = false; let hasVideoFile = false; let hasFile = false; let hasLink = false;
                            if (lesson.content && lesson.content.startsWith('[')) {
                              try {
                                const parsed = JSON.parse(lesson.content);
                                hasVideo = parsed.some((b:any) => b.type === 'video');
                                hasText = parsed.some((b:any) => b.type === 'text');
                                hasTest = parsed.some((b:any) => b.type === 'test');
                                hasShort = parsed.some((b:any) => b.type === 'test_short');
                                hasWritten = parsed.some((b:any) => b.type === 'written');
                                hasImage = parsed.some((b:any) => b.type === 'image');
                                hasVideoFile = parsed.some((b:any) => b.type === 'video_file');
                                hasFile = parsed.some((b:any) => b.type === 'file');
                                hasLink = parsed.some((b:any) => b.type === 'link');
                              } catch(e) {}
                            }
                            return (
                              <div key={lesson.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all">
                                
                                {/* 🔥 И ЗДЕСЬ min-w-0 ДЛЯ НАЗВАНИЯ УРОКА */}
                                <div className="flex-1 mr-4 flex items-center gap-4 font-bold text-base text-gray-700 min-w-0">
                                  <div className="px-3 py-2.5 bg-white rounded-xl shadow-sm flex gap-2 border border-gray-100 shrink-0">
                                    {(hasVideo || hasVideoFile) && <PlayCircle className="w-4 h-4 text-indigo-500" />}
                                    {hasImage && <ImageIcon className="w-4 h-4 text-blue-500" />}
                                    {hasText && <FileText className="w-4 h-4 text-emerald-500" />}
                                    {hasFile && <FileDown className="w-4 h-4 text-cyan-500" />}
                                    {hasLink && <Link2 className="w-4 h-4 text-pink-500" />}
                                    {hasTest && <CheckSquare className="w-4 h-4 text-rose-500" />}
                                    {hasShort && <Type className="w-4 h-4 text-amber-500" />}
                                    {hasWritten && <PenTool className="w-4 h-4 text-purple-500" />}
                                  </div>
                                  
                                  {editingLessonTitleId === lesson.id ? (
                                    <input 
                                      autoFocus 
                                      value={editLessonInlineTitle} 
                                      onChange={(e) => setEditLessonInlineTitle(e.target.value)} 
                                      onBlur={() => saveLessonTitle(lesson.id)} 
                                      onKeyDown={(e) => e.key === 'Enter' && saveLessonTitle(lesson.id)} 
                                      className={`flex-1 px-3 py-1.5 ${ui.lightColor} border-2 ${ui.borderColor} rounded-lg outline-none font-bold`}
                                    />
                                  ) : (
                                    <span 
                                      className={`cursor-pointer hover:${ui.textColor} transition-colors flex items-center gap-2 group/title min-w-0`}
                                      onClick={() => { setEditingLessonTitleId(lesson.id); setEditLessonInlineTitle(lesson.title); }}
                                    >
                                      <span className="truncate">{lesson.title}</span>
                                      <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                                   <button onClick={() => startEditingLesson(theme, lesson)} className={`p-2 bg-white rounded-xl shadow-sm ${ui.textColor} hover:bg-gray-50`}><Pencil className="w-4 h-4"/></button>
                                   <button onClick={() => handleToggleLessonVisibility(lesson.id, lesson.is_visible)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-gray-900"><Eye className="w-4 h-4"/></button>
                                   <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {visibleLessons.length === 0 && (
                            <p className="text-gray-400 text-sm font-bold pl-4 py-2 border border-dashed border-gray-200 rounded-xl">{ui.emptyModuleText}</p>
                          )}
                        </div>

                        {selectedThemeForLesson?.id === theme.id && (
                          <div id="lesson-form" className={`mt-8 p-8 bg-white rounded-[2rem] border-[4px] ${ui.borderColor} shadow-2xl relative`}>
                            <button onClick={resetLessonForm} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:text-gray-900 transition-colors"><X className="w-5 h-5"/></button>
                            <h5 className="font-black text-2xl mb-8">{editingLessonId ? ui.lessonEditTitle : ui.lessonCreateTitle}</h5>
                            
                            <input type="text" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder={ui.lessonPlaceholder} className="w-full px-6 py-5 bg-gray-50 rounded-2xl font-black text-lg outline-none mb-8 border border-gray-100 focus:bg-white focus:border-gray-300 transition-all" required />

                            <div className="space-y-6 mb-8">
                              {blocks.map((block, index) => (
                                <div key={block.id} className="relative p-6 pt-16 rounded-[2rem] border-2 border-gray-100 bg-white group shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
                                  
                                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                    <button onClick={() => moveBlockUp(index)} disabled={index === 0} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                                    <button onClick={() => moveBlockDown(index)} disabled={index === blocks.length - 1} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                                    <button onClick={() => removeBlock(block.id)} className="p-2 bg-white rounded-lg shadow-sm text-rose-500 hover:text-rose-700 ml-2"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                                  
                                  {/* БЛОК: ВИДЕО */}
                                  {block.type === 'video' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-indigo-50 p-4 rounded-xl">
                                        <PlayCircle className="w-6 h-6 text-indigo-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Видео'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-indigo-300 focus:border-indigo-600 outline-none font-black text-xl transition-all text-indigo-900 placeholder:text-indigo-300" placeholder="Заголовок блока..." />
                                      </div>
                                      <input value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="Вставьте ссылку на YouTube/VK..." className="w-full p-4 rounded-xl border border-gray-200 outline-none mb-4 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
                                      {block.url && (
                                        <div className="aspect-video bg-gray-900 rounded-[1.5rem] overflow-hidden shadow-inner border border-gray-200">
                                          <iframe src={getEmbedUrl(block.url)} className="w-full h-full" allowFullScreen></iframe>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* БЛОК: ТЕКСТ + КАРТИНКА */}
                                  {block.type === 'text' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-emerald-50 p-4 rounded-xl">
                                        <FileText className="w-6 h-6 text-emerald-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Текст'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-emerald-300 focus:border-emerald-600 outline-none font-black text-xl transition-all text-emerald-900 placeholder:text-emerald-300" placeholder="Заголовок блока..." />
                                      </div>
                                      
                                      <textarea value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} placeholder="Введите текст лекции, конспект или теорию..." rows={6} className="w-full p-5 rounded-2xl border border-gray-200 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all font-medium text-gray-700 leading-relaxed custom-scrollbar" />
                                      
                                      <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Картинка к лекции (необязательно)</label>
                                        <div className="flex items-center gap-4">
                                          <label className="cursor-pointer px-5 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm">
                                            <UploadCloud className="w-4 h-4" /> Прикрепить картинку
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, 'image', 'imageName')} />
                                          </label>
                                          {block.imageName && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.imageName}</span>}
                                          {block.image && (
                                            <button type="button" onClick={() => updateBlock(block.id, { image: '', imageName: '' })} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                          )}
                                        </div>
                                        {block.image && <img src={block.image} alt="preview" className="mt-4 max-h-48 rounded-xl border border-gray-200 shadow-sm" />}
                                      </div>
                                    </div>
                                  )}

                                  {/* БЛОК: КАРТИНКА (отдельная) */}
                                  {block.type === 'image' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-blue-50 p-4 rounded-xl">
                                        <ImageIcon className="w-6 h-6 text-blue-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Изображение'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-blue-300 focus:border-blue-600 outline-none font-black text-xl transition-all text-blue-900 placeholder:text-blue-300" placeholder="Заголовок блока..." />
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <label className="cursor-pointer px-6 py-4 bg-white border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3 font-bold text-blue-600">
                                          <UploadCloud className="w-5 h-5" /> Выбрать картинку
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e)} />
                                        </label>
                                        {block.fileName && <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.fileName}</span>}
                                      </div>
                                      {block.url && <img src={block.url} alt="preview" className="mt-6 max-h-64 rounded-[1.5rem] shadow-sm border border-gray-100" />}
                                    </div>
                                  )}

                                  {/* БЛОК: ВИДЕО-ФАЙЛ */}
                                  {block.type === 'video_file' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-indigo-50 p-4 rounded-xl">
                                        <PlayCircle className="w-6 h-6 text-indigo-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Видео-файл'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-indigo-300 focus:border-indigo-600 outline-none font-black text-xl transition-all text-indigo-900 placeholder:text-indigo-300" placeholder="Заголовок блока..." />
                                      </div>
                                      <div className="flex items-center gap-4 mb-4">
                                        <label className="cursor-pointer px-6 py-4 bg-white border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center gap-3 font-bold text-indigo-600">
                                          <UploadCloud className="w-5 h-5" /> Загрузить видео (MP4)
                                          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e)} />
                                        </label>
                                        {block.fileName && <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.fileName}</span>}
                                      </div>
                                      {block.url && <video src={block.url} controls className="mt-4 max-h-64 rounded-[1.5rem] shadow-sm border border-gray-100 w-full object-cover" />}
                                    </div>
                                  )}

                                  {/* БЛОК: ФАЙЛ (PDF/Doc) */}
                                  {block.type === 'file' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-cyan-50 p-4 rounded-xl">
                                        <FileDown className="w-6 h-6 text-cyan-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Файл для скачивания'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-cyan-300 focus:border-cyan-600 outline-none font-black text-xl transition-all text-cyan-900 placeholder:text-cyan-300" placeholder="Заголовок блока..." />
                                      </div>
                                      <div className="flex items-center gap-4 mb-4">
                                        <label className="cursor-pointer px-6 py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition-colors flex items-center gap-2 font-bold text-gray-600">
                                          <UploadCloud className="w-5 h-5" /> Загрузить файл (PDF/Word)
                                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(block.id, e)} />
                                        </label>
                                        {block.fileName && <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.fileName}</span>}
                                      </div>
                                      <textarea value={block.content || ''} onChange={(e) => updateBlock(block.id, { content: e.target.value })} placeholder="Краткое описание файла (необязательно)..." rows={2} className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-cyan-400 transition-all" />
                                    </div>
                                  )}

                                  {/* БЛОК: ССЫЛКА / КНОПКА */}
                                  {block.type === 'link' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-pink-50 p-4 rounded-xl">
                                        <Link2 className="w-6 h-6 text-pink-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Ссылка / Кнопка'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-pink-300 focus:border-pink-600 outline-none font-black text-xl transition-all text-pink-900 placeholder:text-pink-300" placeholder="Заголовок блока..." />
                                      </div>
                                      <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="flex-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Текст на кнопке</label>
                                          <input value={block.buttonText || ''} onChange={(e) => updateBlock(block.id, { buttonText: e.target.value })} placeholder="Например: Подключиться к трансляции" className="w-full p-4 rounded-xl border border-gray-200 outline-none font-bold focus:border-pink-400 transition-all" />
                                        </div>
                                        <div className="flex-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">URL ссылки (Zoom, Яндекс.Диск и тд)</label>
                                          <input value={block.url || ''} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="https://..." className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-pink-400 transition-all font-medium text-pink-600" />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* БЛОК: ТЕСТ (Варианты ответа) */}
                                  {block.type === 'test' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-rose-50 p-4 rounded-xl">
                                        <CheckSquare className="w-6 h-6 text-rose-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Тест'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-rose-300 focus:border-rose-600 outline-none font-black text-xl transition-all text-rose-900 placeholder:text-rose-300" placeholder="Заголовок блока..." />
                                      </div>
                                      
                                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Текст вопроса</label>
                                          <input value={block.question} onChange={(e) => updateBlock(block.id, { question: e.target.value })} placeholder="Введите вопрос..." className="w-full p-4 rounded-xl border border-gray-200 outline-none font-bold focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
                                        </div>
                                        <div className="w-full sm:w-32">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Попыток</label>
                                          <input type="number" min="1" max="99" value={block.maxAttempts === '' ? '' : (block.maxAttempts || 3)} onChange={(e) => updateBlock(block.id, { maxAttempts: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-black text-center text-rose-600 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
                                        </div>
                                      </div>

                                      <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Картинка/схема к вопросу (необязательно)</label>
                                        <div className="flex items-center gap-4">
                                          <label className="cursor-pointer px-5 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm">
                                            <UploadCloud className="w-4 h-4" /> Прикрепить картинку
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, 'questionImage', 'questionImageName')} />
                                          </label>
                                          {block.questionImageName && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.questionImageName}</span>}
                                          {block.questionImage && (
                                            <button type="button" onClick={() => updateBlock(block.id, { questionImage: '', questionImageName: '' })} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                          )}
                                        </div>
                                        {block.questionImage && <img src={block.questionImage} alt="preview" className="mt-4 max-h-48 rounded-xl border border-gray-200 shadow-sm" />}
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Варианты ответов (отметьте правильные)</label>
                                        {block.options?.map((opt: any, optIdx: number) => (
                                          <div key={optIdx} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white'}`}>
                                            <label className="flex items-center justify-center cursor-pointer relative w-8 h-8 shrink-0">
                                              <input type="checkbox" checked={opt.isCorrect} onChange={(e) => { const newOpts = [...block.options]; newOpts[optIdx].isCorrect = e.target.checked; updateBlock(block.id, { options: newOpts }); }} className="sr-only" />
                                              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-100 border-gray-300'}`}>
                                                {opt.isCorrect && <CheckSquare className="w-4 h-4 text-white" />}
                                              </div>
                                            </label>
                                            <input value={opt.text} onChange={(e) => { const newOpts = [...block.options]; newOpts[optIdx].text = e.target.value; updateBlock(block.id, { options: newOpts }); }} placeholder={`Вариант ответа ${optIdx + 1}`} className="flex-1 p-2 bg-transparent outline-none font-bold text-gray-800" />
                                            <button type="button" onClick={() => { const newOpts = block.options.filter((_:any, i:number) => i !== optIdx); updateBlock(block.id, { options: newOpts }); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                                          </div>
                                        ))}
                                        <button type="button" onClick={() => { updateBlock(block.id, { options: [...(block.options || []), { text: '', isCorrect: false }] }); }} className="mt-4 px-5 py-4 w-full border-2 border-dashed border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400 rounded-2xl font-black transition-all flex items-center justify-center gap-2">
                                          <Plus className="w-5 h-5" /> ДОБАВИТЬ ВАРИАНТ
                                        </button>
                                      </div>

                                      <div className="mt-8 pt-6 border-t border-rose-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-rose-400"></span> Пояснение к ответу (покажется, если кончатся попытки)
                                        </label>
                                        <textarea value={block.explanation || ''} onChange={(e) => updateBlock(block.id, { explanation: e.target.value })} placeholder="Например: Правильный ответ А, потому что..." rows={2} className="w-full p-4 rounded-2xl border border-gray-200 outline-none font-medium focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none bg-gray-50 focus:bg-white" />
                                      </div>
                                    </div>
                                  )}

                                  {/* БЛОК: ТЕСТ (Краткий ответ) */}
                                  {block.type === 'test_short' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-amber-50 p-4 rounded-xl">
                                        <Type className="w-6 h-6 text-amber-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Тест с кратким ответом'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-amber-300 focus:border-amber-600 outline-none font-black text-xl transition-all text-amber-900 placeholder:text-amber-300" placeholder="Заголовок блока..." />
                                      </div>
                                      
                                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Задание</label>
                                          <input value={block.question} onChange={(e) => updateBlock(block.id, { question: e.target.value })} placeholder="Например: Укажите век..." className="w-full p-4 rounded-xl border border-gray-200 outline-none font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                                        </div>
                                        <div className="w-full sm:w-32">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Попыток</label>
                                          <input type="number" min="1" max="99" value={block.maxAttempts === '' ? '' : (block.maxAttempts || 3)} onChange={(e) => updateBlock(block.id, { maxAttempts: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-black text-center text-amber-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                                        </div>
                                      </div>

                                      <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Картинка/схема к вопросу (необязательно)</label>
                                        <div className="flex items-center gap-4">
                                          <label className="cursor-pointer px-5 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-400 hover:text-amber-600 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm">
                                            <UploadCloud className="w-4 h-4" /> Прикрепить картинку
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, 'questionImage', 'questionImageName')} />
                                          </label>
                                          {block.questionImageName && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.questionImageName}</span>}
                                          {block.questionImage && (
                                            <button type="button" onClick={() => updateBlock(block.id, { questionImage: '', questionImageName: '' })} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                          )}
                                        </div>
                                        {block.questionImage && <img src={block.questionImage} alt="preview" className="mt-4 max-h-48 rounded-xl border border-gray-200 shadow-sm" />}
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Правильный ответ</label>
                                        <input value={block.correctAnswer} onChange={(e) => updateBlock(block.id, { correctAnswer: e.target.value })} placeholder="Система проверит 1в1" className="w-full p-4 rounded-2xl border-2 border-gray-200 outline-none bg-white focus:border-amber-400 transition-colors font-bold text-lg text-gray-900" />
                                      </div>
                                      
                                      <div className="mt-8 pt-6 border-t border-amber-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-amber-400"></span> Пояснение к ответу
                                        </label>
                                        <textarea value={block.explanation || ''} onChange={(e) => updateBlock(block.id, { explanation: e.target.value })} placeholder="Например: Правильный ответ 'Москва', так как..." rows={2} className="w-full p-4 rounded-2xl border border-gray-200 outline-none font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none bg-gray-50 focus:bg-white" />
                                      </div>
                                    </div>
                                  )}

                                  {/* БЛОК: ТЕСТ (Развернутый ответ / Эссе) */}
                                  {block.type === 'written' && (
                                    <div>
                                      <div className="flex items-center gap-3 mb-6 group/header bg-purple-50 p-4 rounded-xl">
                                        <PenTool className="w-6 h-6 text-purple-600 shrink-0"/>
                                        <input value={block.title !== undefined ? block.title : 'Тест с развернутым ответом'} onChange={(e) => updateBlock(block.id, { title: e.target.value })} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-purple-300 focus:border-purple-600 outline-none font-black text-xl transition-all text-purple-900 placeholder:text-purple-300" placeholder="Заголовок блока..." />
                                      </div>
                                      
                                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Задание</label>
                                          <textarea value={block.question} onChange={(e) => updateBlock(block.id, { question: e.target.value })} placeholder="Опишите развернутое задание..." rows={4} className="w-full p-5 rounded-2xl border border-gray-200 outline-none font-bold focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none leading-relaxed" />
                                        </div>
                                        <div className="w-full sm:w-40 shrink-0">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Макс. балл</label>
                                          <input type="number" min="1" max="100" value={block.maxScore === '' ? '' : (block.maxScore || 3)} onChange={(e) => updateBlock(block.id, { maxScore: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full p-5 rounded-2xl border border-gray-200 outline-none font-black text-3xl text-center text-purple-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
                                        </div>
                                      </div>

                                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Картинка/схема к вопросу (необязательно)</label>
                                        <div className="flex items-center gap-4">
                                          <label className="cursor-pointer px-5 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:text-purple-600 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm">
                                            <UploadCloud className="w-4 h-4" /> Прикрепить картинку
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, 'questionImage', 'questionImageName')} />
                                          </label>
                                          {block.questionImageName && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {block.questionImageName}</span>}
                                          {block.questionImage && (
                                            <button type="button" onClick={() => updateBlock(block.id, { questionImage: '', questionImageName: '' })} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                          )}
                                        </div>
                                        {block.questionImage && <img src={block.questionImage} alt="preview" className="mt-4 max-h-48 rounded-xl border border-gray-200 shadow-sm" />}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* ПАНЕЛЬ ДОБАВЛЕНИЯ БЛОКОВ */}
                            <div className="flex flex-wrap gap-2 mb-8 p-5 bg-gray-50 rounded-3xl justify-center border-2 border-gray-200 border-dashed">
                              <span className="text-sm font-black text-gray-400 uppercase tracking-widest w-full text-center mb-3">Добавить новый блок</span>
                              <button type="button" onClick={() => addBlock('video')} className="px-4 py-2.5 bg-white text-indigo-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><PlayCircle className="w-4 h-4"/> Видео-ссылка</button>
                              <button type="button" onClick={() => addBlock('video_file')} className="px-4 py-2.5 bg-white text-indigo-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><UploadCloud className="w-4 h-4"/> Видео-файл</button>
                              <button type="button" onClick={() => addBlock('image')} className="px-4 py-2.5 bg-white text-blue-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><ImageIcon className="w-4 h-4"/> Изображение</button>
                              <button type="button" onClick={() => addBlock('text')} className="px-4 py-2.5 bg-white text-emerald-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><FileText className="w-4 h-4"/> Текст</button>
                              <button type="button" onClick={() => addBlock('file')} className="px-4 py-2.5 bg-white text-cyan-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><FileDown className="w-4 h-4"/> Файл (PDF/Doc)</button>
                              <button type="button" onClick={() => addBlock('link')} className="px-4 py-2.5 bg-white text-pink-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><Link2 className="w-4 h-4"/> Ссылка / Кнопка</button>
                              <div className="w-full h-px bg-gray-200 my-1"></div>
                              <button type="button" onClick={() => addBlock('test')} className="px-4 py-2.5 bg-white text-rose-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><CheckSquare className="w-4 h-4"/> Тест</button>
                              <button type="button" onClick={() => addBlock('test_short')} className="px-4 py-2.5 bg-white text-amber-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><Type className="w-4 h-4"/> Тест с кратким ответом</button>
                              <button type="button" onClick={() => addBlock('written')} className="px-4 py-2.5 bg-white text-purple-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm border border-gray-100"><PenTool className="w-4 h-4"/> Тест с развернутым ответом</button>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => handleSaveLesson(theme)} className={`flex-1 py-5 ${ui.primaryColor} ${ui.primaryHover} text-white rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2`}>
                                  {editingLessonId ? ui.lessonEditTitle : ui.lessonSaveBtn}
                                </button>
                                {editingLessonId && (
                                    <button onClick={resetLessonForm} className="px-10 py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-lg transition-colors">Отмена</button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ПАНЕЛЬ СОЗДАНИЯ МОДУЛЯ (БОЛЬШЕ НЕ УБЕГАЕТ) */}
                <div className="w-full lg:w-80 shrink-0">
                  <div className="bg-gray-900 rounded-[2rem] p-8 text-white sticky top-0 shadow-2xl">
                    <h3 className="font-black text-2xl mb-6 flex items-center gap-3">
                      <FileBadge className="w-8 h-8 text-indigo-400" /> 
                      Новый {ui.themeLabel.toLowerCase()}
                    </h3>
                    <form onSubmit={handleCreateTheme} className="space-y-4">
                      <input 
                        type="text" 
                        value={newThemeTitle} 
                        onChange={(e) => setNewThemeTitle(e.target.value)} 
                        placeholder={`Название ${ui.themeLabel.toLowerCase()}а`} 
                        className="w-full p-4 bg-white/10 rounded-xl outline-none focus:bg-white/20 focus:ring-2 focus:ring-indigo-400/50 transition-all font-medium text-white placeholder:text-gray-400" 
                        required 
                      />
                      <button type="submit" className={`w-full py-4 ${ui.primaryColor} ${ui.primaryHover} rounded-xl font-black transition-colors`}>Добавить</button>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}