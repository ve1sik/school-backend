import { useState, useEffect } from 'react';
import { GraduationCap, X, PlayCircle, Trash2, ArrowLeft, FileText, CheckSquare, Eye, EyeOff, Pencil, Type, PenTool, CheckCircle2, ArrowUp, ArrowDown, Image as ImageIcon, UploadCloud, Plus, FileDown, Link2, BookOpen, Loader2, FileSignature, SaveAll } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Импортируем Ворд-редактор и его стили
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API_URL = 'https://prepodmgy.ru/api';

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('vk.com/video_ext.php')) return url;
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
  return url;
};

const getFullUrl = (url: string) => {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) {
    finalUrl = finalUrl.replace('http://', 'https://');
  }
  if (finalUrl.startsWith('http')) return finalUrl;
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (cleanPath.startsWith('uploads/')) {
    return `https://prepodmgy.ru/${cleanPath}`;
  }
  return `${API_URL}/${cleanPath}`;
};

function ExpandableImage({ src, alt, className = '' }: { src: string, alt?: string, className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className={`relative ${className} w-full flex justify-start`}>
      <img 
        src={src} 
        alt={alt || "Изображение"} 
        onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
        className={`bg-white cursor-pointer transition-all duration-500 ease-in-out origin-top-left rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:ring-2 hover:ring-indigo-300/50 ${
          isExpanded 
            ? 'w-full max-h-[85vh] object-contain object-left' 
            : 'max-w-[280px] sm:max-w-sm max-h-[300px] object-contain object-left'
        }`} 
        title={isExpanded ? "Нажмите, чтобы уменьшить" : "Нажмите, чтобы увеличить"}
      />
    </div>
  );
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ],
};

export default function AdminCourses() {
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
  const [hwBlocks, setHwBlocks] = useState<any[]>([]);
  const [hasHomeworkSection, setHasHomeworkSection] = useState(false);

  // 🔥 Стейты для новых фич
  const [shortAnswerInputs, setShortAnswerInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [hasDraft, setHasDraft] = useState(false);

  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = useNavigate();
  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchItems();
    setShowThemeModal(false);
    setSelectedCourseForThemes(null);
    // Проверяем, есть ли сохраненный черновик
    if (localStorage.getItem('lesson_draft')) {
      setHasDraft(true);
    }
  }, []);

  // 🔥 АВТОСОХРАНЕНИЕ ЧЕРНОВИКА
  useEffect(() => {
    if (selectedThemeForLesson && (newLessonTitle || blocks.length > 0 || hwBlocks.length > 0)) {
      const draft = { newLessonTitle, blocks, hwBlocks, hasHomeworkSection, editingLessonId };
      localStorage.setItem('lesson_draft', JSON.stringify(draft));
    }
  }, [newLessonTitle, blocks, hwBlocks, hasHomeworkSection, editingLessonId, selectedThemeForLesson]);

  const restoreDraft = () => {
    try {
      const draftStr = localStorage.getItem('lesson_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setNewLessonTitle(draft.newLessonTitle || '');
        setBlocks(draft.blocks || []);
        setHwBlocks(draft.hwBlocks || []);
        setHasHomeworkSection(draft.hasHomeworkSection || false);
        setEditingLessonId(draft.editingLessonId || null);
        showToast('Черновик успешно восстановлен!');
      }
    } catch (e) {
      showToast('Не удалось восстановить черновик', 'error');
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/courses`, getTokenConfig());
      setItems(res.data);
      setSelectedCourseForThemes((prev: any) => prev ? (res.data.find((c: any) => c.id === prev.id) || null) : null);
    } catch (err) { 
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
      setTitle(''); fetchItems(); showToast('Программа успешно создана!');
    } catch (err) { showToast('Ошибка при создании', 'error'); } finally { setIsLoading(false); }
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/themes`, { courseId: selectedCourseForThemes.id, title: newThemeTitle, order_index: ((selectedCourseForThemes.themes || []).length) + 1 }, getTokenConfig());
      setNewThemeTitle(''); fetchItems(); showToast('Новый модуль добавлен!');
    } catch (err) { showToast('Ошибка при добавлении', 'error'); }
  };

  const saveItemTitle = async (id: string) => {
    if (!editCourseTitle.trim()) { setEditingCourseId(null); return; }
    setItems(prev => prev.map(c => c.id === id ? { ...c, title: editCourseTitle } : c));
    setEditingCourseId(null);
    try { await axios.patch(`${API_URL}/courses/${id}`, { title: editCourseTitle }, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); }
  };

  const saveThemeTitle = async (id: string) => {
    if (!editThemeTitle.trim()) { setEditingThemeId(null); return; }
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: (prev.themes || []).map((t: any) => t.id === id ? { ...t, title: editThemeTitle } : t) } : null);
    setEditingThemeId(null);
    try { await axios.patch(`${API_URL}/themes/${id}`, { title: editThemeTitle }, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); }
  };

  const saveLessonTitle = async (id: string) => {
    if (!editLessonInlineTitle.trim()) { setEditingLessonTitleId(null); return; }
    setSelectedCourseForThemes((prev: any) => prev ? {
      ...prev, themes: (prev.themes || []).map((t: any) => ({ ...t, lessons: (t.lessons || []).map((l: any) => l.id === id ? { ...l, title: editLessonInlineTitle } : l) }))
    } : null);
    setEditingLessonTitleId(null);
    try { await axios.patch(`${API_URL}/lessons/${id}`, { title: editLessonInlineTitle }, getTokenConfig()); fetchItems(); } catch (err) { fetchItems(); }
  };

  const addBlock = (type: string, isHw: boolean) => {
    const newBlock: any = { id: Date.now().toString(), type };
    if (type === 'video') { newBlock.url = ''; newBlock.title = 'Видео'; }
    if (type === 'text') { newBlock.content = ''; newBlock.title = 'Текст'; }
    if (type === 'image') { newBlock.url = ''; newBlock.title = 'Изображение'; }
    if (type === 'video_file') { newBlock.url = ''; newBlock.title = 'Видео-файл'; }
    if (type === 'file') { newBlock.url = ''; newBlock.title = 'Файл для скачивания'; }
    if (type === 'link') { newBlock.url = ''; newBlock.buttonText = 'Перейти'; newBlock.title = 'Ссылка / Кнопка'; }
    if (type === 'test') { newBlock.question = ''; newBlock.maxAttempts = 3; newBlock.options = [{ text: '', isCorrect: false }]; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Тест'; }
    if (type === 'test_short') { newBlock.question = ''; newBlock.correctAnswers = []; newBlock.ignoreTypos = true; newBlock.maxAttempts = 3; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Тест с кратким ответом'; }
    if (type === 'written') { newBlock.question = ''; newBlock.maxScore = 3; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Развернутый ответ'; }
    
    if (isHw) { setHwBlocks(prev => [...prev, newBlock]); setTimeout(() => document.getElementById('hw-section-end')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); } 
    else { setBlocks(prev => [...prev, newBlock]); setTimeout(() => document.getElementById('theory-section-end')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }
  };

  const updateBlock = (id: string, data: any, isHw: boolean) => { 
    if (isHw) setHwBlocks(hwBlocks.map(b => b.id === id ? { ...b, ...data } : b));
    else setBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b));
    
    // Снимаем ошибку при изменении
    if (errors[id]) {
      const newErr = {...errors};
      delete newErr[id];
      setErrors(newErr);
    }
  };

  const removeBlock = (id: string, isHw: boolean) => { 
    if (isHw) setHwBlocks(hwBlocks.filter(b => b.id !== id));
    else setBlocks(blocks.filter(b => b.id !== id));
  };
  const moveBlockUp = (index: number, isHw: boolean) => { 
    if (index === 0) return; const arr = isHw ? [...hwBlocks] : [...blocks]; [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; 
    if (isHw) setHwBlocks(arr); else setBlocks(arr); 
  };
  const moveBlockDown = (index: number, isHw: boolean) => { 
    const arr = isHw ? [...hwBlocks] : [...blocks]; if (index === arr.length - 1) return; [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]]; 
    if (isHw) setHwBlocks(arr); else setBlocks(arr); 
  };

  const handleFileUpload = async (blockId: string, event: React.ChangeEvent<HTMLInputElement>, isHw: boolean, targetUrlField = 'url', targetNameField = 'fileName') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast(`Загрузка файла ${file.name}...`, 'success');
      const res = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } });
      updateBlock(blockId, { [targetUrlField]: res.data.url, [targetNameField]: res.data.fileName || file.name }, isHw);
      showToast(`Файл успешно загружен!`);
    } catch (err) { showToast('Ошибка при загрузке файла', 'error'); }
  };

  const startEditingLesson = (theme: any, lesson: any) => {
    setSelectedThemeForLesson(theme);
    setEditingLessonId(lesson.id);
    setNewLessonTitle(lesson.title);
    setErrors({});
    
    let initialBlocks: any[] = [];
    let initialHwBlocks: any[] = [];
    
    if (lesson.content) {
      const trimmed = lesson.content.trim();
      if (trimmed.startsWith('[')) {
        try { 
          const parsed = JSON.parse(trimmed); 
          initialBlocks = parsed.filter((b: any) => !b.isHomework);
          initialHwBlocks = parsed.filter((b: any) => b.isHomework);
        } catch (e) {}
      } else {
        initialBlocks.push({ id: 'text-legacy', type: 'text', content: lesson.content, title: 'Текст' });
      }
    }
    
    setBlocks(initialBlocks);
    setHwBlocks(initialHwBlocks);
    setHasHomeworkSection(initialHwBlocks.length > 0);
    setTimeout(() => document.getElementById('lesson-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // 🔥 ПРОВЕРКА ПУСТЫХ ПОЛЕЙ (ВАЛИДАЦИЯ)
  const isQuillEmpty = (html: string) => !html || html.replace(/<[^>]*>?/gm, '').trim().length === 0;

  const handleSaveLesson = async (theme: any) => {
    let newErrors: Record<string, boolean> = {};

    if (!newLessonTitle.trim()) newErrors['lessonTitle'] = true;

    const validateArr = (arr: any[]) => {
      arr.forEach(b => {
        if (['test', 'test_short', 'written'].includes(b.type)) {
          if (isQuillEmpty(b.question)) newErrors[b.id] = true;
          
          if (b.type === 'test') {
            if (!b.options || b.options.length === 0) newErrors[b.id] = true;
            b.options?.forEach((opt: any) => { if (!opt.text.trim()) newErrors[b.id] = true; });
            if (!b.options?.some((opt: any) => opt.isCorrect)) newErrors[b.id] = true;
          }
          if (b.type === 'test_short') {
            if (!b.correctAnswers || b.correctAnswers.length === 0) newErrors[b.id] = true;
          }
        }
      });
    };

    validateArr(blocks);
    validateArr(hwBlocks);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Заполните все выделенные красным поля!', 'error');
      setTimeout(() => {
        const errorEl = document.querySelector('.border-red-500');
        if (errorEl) errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setErrors({});
    
    const cleanedBlocks = blocks.map(b => ({ ...b, isHomework: false }));
    const cleanedHwBlocks = hwBlocks.map(b => ({ ...b, isHomework: true }));

    const payload = { 
      themeId: theme.id, 
      title: newLessonTitle, 
      type: 'TEXT', 
      content: JSON.stringify([...cleanedBlocks, ...cleanedHwBlocks]), 
      is_homework: false 
    };

    try {
      if (editingLessonId) {
        await axios.patch(`${API_URL}/lessons/${editingLessonId}`, payload, getTokenConfig());
        showToast('Изменения сохранены!');
      } else {
        await axios.post(`${API_URL}/lessons`, { ...payload, order_index: ((theme.lessons || []).length) + 1 }, getTokenConfig());
        showToast('Успешно создано!');
      }
      localStorage.removeItem('lesson_draft'); // Успешно сохранили - удаляем черновик
      setHasDraft(false);
      resetLessonForm(); fetchItems();
    } catch (err) { showToast('Ошибка сохранения', 'error'); }
  };

  const resetLessonForm = () => { setSelectedThemeForLesson(null); setEditingLessonId(null); setNewLessonTitle(''); setBlocks([]); setHwBlocks([]); setHasHomeworkSection(false); setErrors({}); };

  const handleDeleteItem = async (id: string) => {
    setItems(prev => prev.filter(c => c.id !== id));
    if (selectedCourseForThemes?.id === id) { setShowThemeModal(false); setSelectedCourseForThemes(null); }
    showToast('Удалено');
    try { await axios.delete(`${API_URL}/courses/${id}`, getTokenConfig()); } catch (err) { fetchItems(); showToast('Ошибка удаления', 'error'); }
  };

  const handleDeleteTheme = async (id: string) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: (prev.themes || []).filter((t: any) => t.id !== id) } : null);
    try { await axios.delete(`${API_URL}/themes/${id}`, getTokenConfig()); fetchItems(); } catch (err) {}
  };

  const handleDeleteLesson = async (id: string) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: (prev.themes || []).map((t: any) => ({ ...t, lessons: (t.lessons || []).filter((l: any) => l.id !== id) })) } : null);
    if (editingLessonId === id) resetLessonForm();
    try { await axios.delete(`${API_URL}/lessons/${id}`, getTokenConfig()); fetchItems(); } catch (err) {}
  };

  const handleToggleThemeVisibility = async (id: string, status: boolean) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: (prev.themes || []).map((t: any) => t.id === id ? { ...t, is_visible: !status } : t) } : null);
    try { await axios.patch(`${API_URL}/themes/${id}`, { is_visible: !status }, getTokenConfig()); fetchItems(); } catch (err) {}
  };

  const handleToggleLessonVisibility = async (id: string, status: boolean) => {
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, themes: (prev.themes || []).map((t: any) => ({ ...t, lessons: (t.lessons || []).map((l: any) => l.id === id ? { ...l, is_visible: !status } : l) })) } : null);
    try { await axios.patch(`${API_URL}/lessons/${id}`, { is_visible: !status }, getTokenConfig()); fetchItems(); } catch (err) {}
  };

  const renderBlocksList = (blockArray: any[], isHw: boolean) => {
    return (
      <div className="space-y-6">
        {blockArray.map((block, index) => {
          const isError = errors[block.id];
          
          return (
          <div key={block.id} className={`relative p-6 pt-16 rounded-[2rem] border-2 bg-white group shadow-sm hover:shadow-md transition-all ${isError ? 'border-red-500 shadow-red-500/20' : isHw ? 'border-purple-100' : 'border-gray-100'}`}>
            
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <button type="button" onClick={() => moveBlockUp(index, isHw)} disabled={index === 0} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button type="button" onClick={() => moveBlockDown(index, isHw)} disabled={index === blockArray.length - 1} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              <button type="button" onClick={() => removeBlock(block.id, isHw)} className="p-2 bg-white rounded-lg shadow-sm text-rose-500 hover:text-rose-700 ml-2"><Trash2 className="w-4 h-4" /></button>
            </div>
            
            {block.type === 'video' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-indigo-50 p-4 rounded-xl">
                  <PlayCircle className="w-6 h-6 text-indigo-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Видео'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-indigo-300 focus:border-indigo-600 outline-none font-black text-xl transition-all text-indigo-900 placeholder:text-indigo-300" placeholder="Заголовок блока..." />
                </div>
                <input value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value }, isHw)} placeholder="Вставьте ссылку на YouTube/VK/Яндекс.Диск..." className="w-full p-4 rounded-xl border border-gray-200 outline-none mb-4 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
            )}

            {block.type === 'text' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 group/header bg-emerald-50 p-4 rounded-xl">
                  <FileText className="w-6 h-6 text-emerald-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Текст'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-emerald-300 focus:border-emerald-600 outline-none font-black text-xl transition-all text-emerald-900 placeholder:text-emerald-300" placeholder="Заголовок блока..." />
                </div>
                
                <div className="bg-white rounded-2xl overflow-visible border border-gray-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all z-10 relative">
                  <ReactQuill theme="snow" modules={quillModules} value={block.content || ''} onChange={(val) => updateBlock(block.id, { content: val }, isHw)} placeholder="Введите текст лекции..." className="min-h-[200px] pb-12" />
                </div>
                
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 mt-2">
                  <label className="cursor-pointer px-5 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-400 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm">
                    <UploadCloud className="w-4 h-4" /> Прикрепить картинку
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw, 'image', 'imageName')} />
                  </label>
                  {block.imageName && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4" /> {block.imageName}</span>}
                  {block.image && <button type="button" onClick={() => updateBlock(block.id, { image: '', imageName: '' }, isHw)} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div>
                {block.image && <ExpandableImage src={getFullUrl(block.image)} className="mt-4" />}
              </div>
            )}

            {block.type === 'image' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-blue-50 p-4 rounded-xl">
                  <ImageIcon className="w-6 h-6 text-blue-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Изображение'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-blue-300 focus:border-blue-600 outline-none font-black text-xl transition-all text-blue-900 placeholder:text-blue-300" placeholder="Заголовок блока..." />
                </div>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer px-6 py-4 bg-white border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-500 transition-all flex items-center gap-3 font-bold text-blue-600">
                    <UploadCloud className="w-5 h-5" /> Выбрать картинку
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw)} />
                  </label>
                  {block.fileName && <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4" /> {block.fileName}</span>}
                </div>
                {block.url && <ExpandableImage src={getFullUrl(block.url)} className="mt-6" />}
              </div>
            )}

            {block.type === 'video_file' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-indigo-50 p-4 rounded-xl">
                  <PlayCircle className="w-6 h-6 text-indigo-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Видео-файл'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-indigo-300 focus:border-indigo-600 outline-none font-black text-xl transition-all text-indigo-900 placeholder:text-indigo-300" placeholder="Заголовок блока..." />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <label className="cursor-pointer px-6 py-4 bg-white border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-500 transition-all flex items-center gap-3 font-bold text-indigo-600">
                    <UploadCloud className="w-5 h-5" /> Загрузить видео (MP4)
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw)} />
                  </label>
                  {block.fileName && <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4" /> {block.fileName}</span>}
                </div>
              </div>
            )}

            {block.type === 'file' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-cyan-50 p-4 rounded-xl">
                  <FileDown className="w-6 h-6 text-cyan-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Файл для скачивания'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-cyan-300 focus:border-cyan-600 outline-none font-black text-xl transition-all text-cyan-900 placeholder:text-cyan-300" placeholder="Заголовок блока..." />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <label className="cursor-pointer px-6 py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 transition-colors flex items-center gap-2 font-bold text-gray-600">
                    <UploadCloud className="w-5 h-5" /> Загрузить файл (PDF/Word)
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw)} />
                  </label>
                  {block.fileName && <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4" /> {block.fileName}</span>}
                </div>
                <textarea value={block.content || ''} onChange={(e) => updateBlock(block.id, { content: e.target.value }, isHw)} placeholder="Краткое описание файла (необязательно)..." rows={2} className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-cyan-400 transition-all" />
              </div>
            )}

            {block.type === 'link' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-pink-50 p-4 rounded-xl">
                  <Link2 className="w-6 h-6 text-pink-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Ссылка / Кнопка'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-pink-300 focus:border-pink-600 outline-none font-black text-xl transition-all text-pink-900 placeholder:text-pink-300" placeholder="Заголовок блока..." />
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Текст на кнопке</label>
                    <input value={block.buttonText || ''} onChange={(e) => updateBlock(block.id, { buttonText: e.target.value }, isHw)} placeholder="Например: Подключиться к трансляции" className="w-full p-4 rounded-xl border border-gray-200 outline-none font-bold focus:border-pink-400 transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">URL ссылки (Zoom, Яндекс.Диск и тд)</label>
                    <input value={block.url || ''} onChange={(e) => updateBlock(block.id, { url: e.target.value }, isHw)} placeholder="https://..." className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-pink-400 transition-all font-medium text-pink-600" />
                  </div>
                </div>
              </div>
            )}

            {/* 🔥 ОБЩАЯ ВЕРХУШКА ДЛЯ ИНТЕРАКТИВНЫХ БЛОКОВ (Тест, Краткий ответ, Развернутый ответ) */}
            {['test', 'test_short', 'written'].includes(block.type) && (
              <>
                <div className={`flex items-center gap-3 mb-6 group/header p-4 rounded-xl ${block.type === 'test' ? 'bg-rose-50' : block.type === 'test_short' ? 'bg-amber-50' : 'bg-purple-50'}`}>
                  {block.type === 'test' ? <CheckSquare className="w-6 h-6 text-rose-600 shrink-0" /> : block.type === 'test_short' ? <Type className="w-6 h-6 text-amber-600 shrink-0" /> : <PenTool className="w-6 h-6 text-purple-600 shrink-0" />}
                  <input value={block.title !== undefined ? block.title : (block.type === 'test' ? 'Тест' : block.type === 'test_short' ? 'Краткий ответ' : 'Развернутый ответ')} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className={`flex-1 bg-transparent border-b-2 border-dashed border-transparent outline-none font-black text-xl transition-all ${block.type === 'test' ? 'hover:border-rose-300 focus:border-rose-600 text-rose-900 placeholder:text-rose-300' : block.type === 'test_short' ? 'hover:border-amber-300 focus:border-amber-600 text-amber-900 placeholder:text-amber-300' : 'hover:border-purple-300 focus:border-purple-600 text-purple-900 placeholder:text-purple-300'}`} placeholder="Заголовок блока..." />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Текст задания {isError && isQuillEmpty(block.question) && <span className="text-red-500">* Обязательное поле</span>}
                    </label>
                    <div className={`bg-white rounded-2xl overflow-visible border transition-all z-10 relative ${isError && isQuillEmpty(block.question) ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'}`}>
                      <ReactQuill theme="snow" modules={quillModules} value={block.question || ''} onChange={(val) => updateBlock(block.id, { question: val }, isHw)} placeholder="Введите вопрос или текст задания..." className="min-h-[120px] pb-12" />
                    </div>
                  </div>
                  <div className="w-full sm:w-32 shrink-0">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{block.type === 'written' ? 'Макс. балл' : 'Попыток'}</label>
                    <input type="number" min="1" max="100" value={block.type === 'written' ? (block.maxScore || 3) : (block.maxAttempts || 3)} onChange={(e) => updateBlock(block.id, block.type === 'written' ? { maxScore: parseInt(e.target.value) || '' } : { maxAttempts: parseInt(e.target.value) || '' }, isHw)} className={`w-full p-4 rounded-xl border border-gray-200 outline-none font-black text-center transition-all ${block.type === 'test' ? 'text-rose-600 focus:border-rose-400' : block.type === 'test_short' ? 'text-amber-600 focus:border-amber-400' : 'text-purple-600 focus:border-purple-400'}`} />
                  </div>
                </div>

                <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest sm:mb-0 block shrink-0">Картинка к вопросу:</label>
                  <div className="flex items-center gap-4 flex-1">
                    <label className="cursor-pointer px-5 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm">
                      <UploadCloud className="w-4 h-4" /> Прикрепить
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw, 'questionImage', 'questionImageName')} />
                    </label>
                    {block.questionImageName && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4" /> {block.questionImageName}</span>}
                    {block.questionImage && <button type="button" onClick={() => updateBlock(block.id, { questionImage: '', questionImageName: '' }, isHw)} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                {block.questionImage && <ExpandableImage src={getFullUrl(block.questionImage)} className="mb-6" />}
              </>
            )}

            {/* СПЕЦИФИКА ТЕСТА С ВАРИАНТАМИ */}
            {block.type === 'test' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Варианты ответов {isError && (!block.options || block.options.length === 0 || !block.options.some((o:any)=>o.isCorrect)) && <span className="text-red-500">* Добавьте хотя бы один правильный</span>}</label>
                {block.options?.map((opt: any, optIdx: number) => (
                  <div key={optIdx} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-emerald-400 bg-emerald-50 shadow-sm' : isError && !opt.text.trim() ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <label className="flex items-center justify-center cursor-pointer relative w-8 h-8 shrink-0">
                      <input type="checkbox" checked={opt.isCorrect} onChange={(e) => { const newOpts = [...block.options]; newOpts[optIdx].isCorrect = e.target.checked; updateBlock(block.id, { options: newOpts }, isHw); }} className="sr-only" />
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-100 border-gray-300'}`}>
                        {opt.isCorrect && <CheckSquare className="w-4 h-4 text-white" />}
                      </div>
                    </label>
                    <input value={opt.text} onChange={(e) => { const newOpts = [...block.options]; newOpts[optIdx].text = e.target.value; updateBlock(block.id, { options: newOpts }, isHw); }} placeholder={`Вариант ${optIdx + 1}`} className="flex-1 p-2 bg-transparent outline-none font-bold text-gray-800" />
                    <button type="button" onClick={() => { const newOpts = block.options.filter((_:any, i:number) => i !== optIdx); updateBlock(block.id, { options: newOpts }, isHw); }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => { updateBlock(block.id, { options: [...(block.options || []), { text: '', isCorrect: false }] }, isHw); }} className="mt-4 px-5 py-4 w-full border-2 border-dashed border-rose-300 text-rose-600 hover:bg-rose-50 rounded-2xl font-black transition-all flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> ДОБАВИТЬ ВАРИАНТ
                </button>
              </div>
            )}

            {/* 🔥 СПЕЦИФИКА ТЕСТА С КРАТКИМ ОТВЕТОМ (С тегами) */}
            {block.type === 'test_short' && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                  Правильные ответы (Ученик может ввести любой из них) {isError && (!block.correctAnswers || block.correctAnswers.length === 0) && <span className="text-red-500">* Добавьте хотя бы один</span>}
                </label>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(block.correctAnswers || []).map((ans: string, idx: number) => (
                    <span key={idx} className="px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm">
                      {ans}
                      <button type="button" onClick={() => { const newAns = block.correctAnswers.filter((_:any, i:number) => i !== idx); updateBlock(block.id, { correctAnswers: newAns }, isHw); }} className="hover:text-red-500 bg-white/50 rounded-md p-0.5 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input 
                    type="text" 
                    value={shortAnswerInputs[block.id] || ''} 
                    onChange={(e) => setShortAnswerInputs({ ...shortAnswerInputs, [block.id]: e.target.value })} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = shortAnswerInputs[block.id]?.trim();
                        if (val) { updateBlock(block.id, { correctAnswers: [...(block.correctAnswers || []), val] }, isHw); setShortAnswerInputs({ ...shortAnswerInputs, [block.id]: '' }); }
                      }
                    }}
                    placeholder="Например: Москва" 
                    className={`flex-1 p-4 rounded-xl border-2 outline-none font-bold transition-colors ${isError && (!block.correctAnswers || block.correctAnswers.length === 0) ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-amber-400'}`} 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      const val = shortAnswerInputs[block.id]?.trim();
                      if (val) { updateBlock(block.id, { correctAnswers: [...(block.correctAnswers || []), val] }, isHw); setShortAnswerInputs({ ...shortAnswerInputs, [block.id]: '' }); }
                    }} 
                    className="px-6 py-4 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-black transition-all shrink-0 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Добавить
                  </button>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors w-max">
                  <input type="checkbox" checked={block.ignoreTypos !== false} onChange={(e) => updateBlock(block.id, { ignoreTypos: e.target.checked }, isHw)} className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
                  <span className="text-sm font-bold text-gray-700">Игнорировать опечатки, регистр и букву Ё при проверке</span>
                </label>
              </div>
            )}

            {/* 🔥 ОБЩИЙ ПОДВАЛ (ИСТОЧНИК И РАЗБОР) ДЛЯ ИНТЕРАКТИВНЫХ БЛОКОВ */}
            {['test', 'test_short', 'written'].includes(block.type) && (
              <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Источник / Тип задания (необязательно)</label>
                  <input value={block.source || ''} onChange={(e) => updateBlock(block.id, { source: e.target.value }, isHw)} placeholder="Например: Тип 5 №2 (Решу ЕГЭ)" className="w-full p-4 rounded-xl border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-gray-700 bg-gray-50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-2"><BookOpen className="w-3.5 h-3.5" /> Пояснение / Разбор задания (покажется ученику после ответа)</label>
                  <div className="bg-indigo-50/30 rounded-2xl overflow-hidden border-2 border-indigo-100 focus-within:border-indigo-400 focus-within:shadow-md transition-all relative z-0">
                    <ReactQuill theme="snow" modules={quillModules} value={block.explanation || ''} onChange={(val) => updateBlock(block.id, { explanation: val }, isHw)} placeholder="Напишите подробное правило или разбор..." className="min-h-[140px] pb-12" />
                  </div>
                </div>
              </div>
            )}

          </div>
        )})}
      </div>
    );
  };

  const renderSidebarToolbar = (isHw: boolean) => {
    const color = isHw ? 'purple' : 'indigo';
    const bgClass = isHw ? 'bg-purple-50/50 border-purple-200' : 'bg-white border-indigo-100';
    const titleColor = isHw ? 'text-purple-600' : 'text-indigo-600';
    
    const btnClass = `flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-gray-100 hover:border-${color}-300 hover:shadow-md transition-all gap-2 text-[11px] font-bold text-gray-700 text-center active:scale-95`;

    return (
      <div className={`p-6 rounded-[2rem] border-2 shadow-xl flex flex-col gap-4 shadow-${color}-500/10 ${bgClass}`}>
        <h4 className={`font-black text-xs uppercase tracking-widest text-center ${titleColor}`}>Добавить {isHw ? 'в домашку' : 'в теорию'}</h4>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => addBlock('text', isHw)} className={btnClass}><FileText className="w-5 h-5 text-emerald-500" /> Текст</button>
          <button type="button" onClick={() => addBlock('image', isHw)} className={btnClass}><ImageIcon className="w-5 h-5 text-blue-500" /> Картинка</button>
          <button type="button" onClick={() => addBlock('video', isHw)} className={btnClass}><PlayCircle className="w-5 h-5 text-indigo-500" /> Видео-ссылка</button>
          <button type="button" onClick={() => addBlock('video_file', isHw)} className={btnClass}><UploadCloud className="w-5 h-5 text-indigo-400" /> Видео-файл</button>
          <button type="button" onClick={() => addBlock('file', isHw)} className={btnClass}><FileDown className="w-5 h-5 text-cyan-500" /> Файл</button>
          <button type="button" onClick={() => addBlock('link', isHw)} className={btnClass}><Link2 className="w-5 h-5 text-pink-500" /> Ссылка</button>
        </div>
        <div className="w-full h-px bg-gray-200/50 my-1"></div>
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={() => addBlock('test', isHw)} className={`${btnClass} !flex-row !justify-start px-4`}><CheckSquare className="w-5 h-5 text-rose-500" /> Тест (Варианты)</button>
          <button type="button" onClick={() => addBlock('test_short', isHw)} className={`${btnClass} !flex-row !justify-start px-4`}><Type className="w-5 h-5 text-amber-500" /> Краткий ответ</button>
          <button type="button" onClick={() => addBlock('written', isHw)} className={`${btnClass} !flex-row !justify-start px-4`}><PenTool className="w-5 h-5 text-purple-500" /> Развернутый ответ</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex text-gray-900">
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-10 shadow-xl shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center"><GraduationCap className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-black tracking-tight">Admin<span className="text-indigo-600">Pro</span></span>
        </div>
        <div className="flex-1 px-4 py-8 space-y-3">
          <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Разделы управления</h3>
          <button type="button" className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20"><BookOpen className="w-5 h-5" /> Курсы и Уроки</button>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 px-5 py-4 w-full text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-colors"><ArrowLeft className="w-5 h-5" /> На портал</button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto relative scroll-smooth min-w-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black">Создание контента</h1>
            {hasDraft && !showThemeModal && (
               <button onClick={() => { setShowThemeModal(true); setTimeout(restoreDraft, 500); }} className="px-6 py-3 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
                 <SaveAll className="w-5 h-5" /> Восстановить незаконченный урок
               </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm sticky top-8 border border-gray-100">
                <h2 className="text-xl font-black mb-6">Создать новую программу</h2>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название курса..." className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all font-medium" required />
                  <button type="submit" disabled={isLoading} className="w-full py-4 text-white rounded-xl font-black transition-colors bg-[#5A4BFF] hover:bg-[#4a3dec] flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Добавить'}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} onClick={() => { setSelectedCourseForThemes(item); setShowThemeModal(true); }} className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-gray-200 border border-transparent transition-all group">
                  <div className="flex-1 mr-4 min-w-0">
                    {editingCourseId === item.id ? (
                      <input autoFocus value={editCourseTitle} onChange={(e) => setEditCourseTitle(e.target.value)} onBlur={() => saveItemTitle(item.id)} onKeyDown={(e) => e.key === 'Enter' && saveItemTitle(item.id)} onClick={(e) => e.stopPropagation()} className="text-xl font-black px-4 py-2 border-2 rounded-xl outline-none w-full bg-indigo-50 border-[#5A4BFF]" />
                    ) : (
                      <h3 className="text-xl font-black cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-3 min-w-0" onClick={(e) => { e.stopPropagation(); setEditingCourseId(item.id); setEditCourseTitle(item.title); }}>
                        <span className="truncate">{item.title}</span> <Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </h3>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" className="px-6 py-2.5 bg-gray-50 group-hover:bg-[#5A4BFF] group-hover:text-white text-gray-600 rounded-xl font-bold text-sm transition-colors">Модули и Уроки</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-10"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showThemeModal && selectedCourseForThemes && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4 lg:p-8">
            <motion.div className="bg-[#F8FAFC] rounded-[2.5rem] w-full max-w-[1400px] max-h-[95vh] overflow-hidden flex flex-col relative shadow-2xl">
              <button type="button" onClick={() => { setShowThemeModal(false); resetLessonForm(); }} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full z-10 shadow-sm transition-colors"><X className="w-5 h-5" /></button>
              
              <div className="p-8 pb-6 bg-white border-b border-gray-100 flex items-center shrink-0">
                <div className="flex-1 mr-12 min-w-0">
                  {editingCourseId === selectedCourseForThemes.id ? (
                    <input autoFocus value={editCourseTitle} onChange={(e) => setEditCourseTitle(e.target.value)} onBlur={() => saveItemTitle(selectedCourseForThemes.id)} onKeyDown={(e) => e.key === 'Enter' && saveItemTitle(selectedCourseForThemes.id)} className="text-3xl font-black px-4 py-2 border-2 rounded-xl outline-none w-full max-w-2xl bg-indigo-50 border-[#5A4BFF]" />
                  ) : (
                    <h2 className="text-3xl font-black cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-3 group min-w-0" onClick={() => { setEditingCourseId(selectedCourseForThemes.id); setEditCourseTitle(selectedCourseForThemes.title); }}>
                      <span className="truncate">{selectedCourseForThemes.title}</span> <Pencil className="w-6 h-6 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h2>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 flex flex-col lg:flex-row gap-8 scroll-smooth relative items-start">
                <div className="flex-1 space-y-6 min-w-0 pb-20">
                  {(selectedCourseForThemes.themes || []).map((theme: any) => {
                    const visibleLessons = theme.lessons || [];

                    return (
                      <div key={theme.id} className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
                          <div className="flex-1 min-w-0">
                            {editingThemeId === theme.id ? (
                              <input autoFocus value={editThemeTitle} onChange={(e) => setEditThemeTitle(e.target.value)} onBlur={() => saveThemeTitle(theme.id)} onKeyDown={(e) => e.key === 'Enter' && saveThemeTitle(theme.id)} className="font-black text-2xl px-3 py-1.5 bg-indigo-50 border-2 border-[#5A4BFF] rounded-xl outline-none w-full" />
                            ) : (
                              <h4 className="font-black text-xl lg:text-2xl cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2 group min-w-0" onClick={() => { setEditingThemeId(theme.id); setEditThemeTitle(theme.title); }}>
                                <span className="truncate">Модуль {theme.order_index}. {theme.title}</span> <Pencil className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </h4>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0 bg-gray-50 p-1.5 rounded-2xl">
                            <button type="button" onClick={() => handleToggleThemeVisibility(theme.id, theme.is_visible)} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 hover:text-gray-900 transition-colors">{theme.is_visible === false ? (<EyeOff className="w-5 h-5" />) : (<Eye className="w-5 h-5" />)}</button>
                            <button type="button" onClick={() => handleDeleteTheme(theme.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            <button type="button" onClick={() => { resetLessonForm(); setSelectedThemeForLesson(theme); setTimeout(() => document.getElementById('lesson-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="px-5 py-2.5 ml-2 bg-[#5A4BFF] text-white rounded-xl text-sm font-black shadow-md transition-colors">+ Новый урок</button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {visibleLessons.map((lesson: any) => {
                            let hasVideo = false; let hasText = false; let hasTest = false; let hasShort = false; let hasHomework = false; let hasWritten = false;
                            let hasImage = false; let hasVideoFile = false; let hasFile = false; let hasLink = false;
                            
                            if (lesson.content) {
                              try {
                                const parsed = JSON.parse(lesson.content.trim());
                                hasVideo = parsed.some((b:any) => b.type === 'video'); hasText = parsed.some((b:any) => b.type === 'text');
                                hasTest = parsed.some((b:any) => b.type === 'test'); hasShort = parsed.some((b:any) => b.type === 'test_short');
                                hasWritten = parsed.some((b:any) => b.type === 'written'); hasHomework = parsed.some((b:any) => b.isHomework); 
                                hasImage = parsed.some((b:any) => b.type === 'image'); hasVideoFile = parsed.some((b:any) => b.type === 'video_file');
                                hasFile = parsed.some((b:any) => b.type === 'file'); hasLink = parsed.some((b:any) => b.type === 'link');
                              } catch(e) { hasText = true; }
                            }
                            
                            return (
                              <div key={lesson.id} className="bg-gray-50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all">
                                <div className="flex-1 flex items-center gap-4 font-bold text-base text-gray-700 min-w-0">
                                  <div className="px-3 py-2.5 bg-white rounded-xl shadow-sm flex gap-2 border border-gray-100 shrink-0">
                                    {(hasVideo || hasVideoFile) && <PlayCircle className="w-4 h-4 text-indigo-500" />}
                                    {hasImage && <ImageIcon className="w-4 h-4 text-blue-500" />}
                                    {hasText && <FileText className="w-4 h-4 text-emerald-500" />}
                                    {hasFile && <FileDown className="w-4 h-4 text-cyan-500" />}
                                    {hasLink && <Link2 className="w-4 h-4 text-pink-500" />}
                                    {hasTest && <CheckSquare className="w-4 h-4 text-rose-500" />}
                                    {hasShort && <Type className="w-4 h-4 text-amber-500" />}
                                    {hasWritten && <PenTool className="w-4 h-4 text-purple-500" />}
                                    {hasHomework && <FileSignature className="w-4 h-4 text-purple-500" />}
                                  </div>
                                  
                                  {editingLessonTitleId === lesson.id ? (
                                    <input autoFocus value={editLessonInlineTitle} onChange={(e) => setEditLessonInlineTitle(e.target.value)} onBlur={() => saveLessonTitle(lesson.id)} onKeyDown={(e) => e.key === 'Enter' && saveLessonTitle(lesson.id)} className="flex-1 px-3 py-1.5 border-2 rounded-lg outline-none font-bold bg-indigo-50 border-[#5A4BFF] min-w-0" />
                                  ) : (
                                    <span className="cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2 group/title min-w-0" onClick={() => { setEditingLessonTitleId(lesson.id); setEditLessonInlineTitle(lesson.title); }}>
                                      <span className="truncate">{lesson.title}</span> <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                                   <button type="button" onClick={() => startEditingLesson(theme, lesson)} className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-gray-50"><Pencil className="w-4 h-4" /></button>
                                   <button type="button" onClick={() => handleToggleLessonVisibility(lesson.id, lesson.is_visible)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-gray-900">{lesson.is_visible === false ? (<EyeOff className="w-4 h-4" />) : (<Eye className="w-4 h-4" />)}</button>
                                   <button type="button" onClick={() => handleDeleteLesson(lesson.id)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {visibleLessons.length === 0 && <p className="text-gray-400 text-sm font-bold pl-4 py-2 border border-dashed border-gray-200 rounded-xl">В этом модуле пока пусто.</p>}
                        </div>

                        {selectedThemeForLesson?.id === theme.id && (
                          <div id="lesson-form" className="mt-8 p-6 lg:p-8 bg-white rounded-[2rem] border-[4px] border-[#5A4BFF] shadow-2xl relative">
                            <button type="button" onClick={resetLessonForm} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:text-gray-900 transition-colors"><X className="w-5 h-5" /></button>
                            <h5 className="font-black text-2xl mb-8">{editingLessonId ? 'Редактирование' : 'Создание'} урока</h5>
                            
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                              Название урока {errors['lessonTitle'] && <span className="text-red-500">* Обязательное поле</span>}
                            </label>
                            <input 
                              type="text" 
                              value={newLessonTitle} 
                              onChange={(e) => { setNewLessonTitle(e.target.value); if(errors['lessonTitle']) setErrors({...errors, lessonTitle: false}); }} 
                              placeholder="Например: Введение в историю..." 
                              className={`w-full px-6 py-5 bg-gray-50 rounded-2xl font-black text-lg outline-none mb-6 border-2 transition-all ${errors['lessonTitle'] ? 'border-red-400 bg-red-50' : 'border-transparent focus:bg-white focus:border-[#5A4BFF]'}`} 
                            />

                            {/* РЕНДЕР ОСНОВНЫХ БЛОКОВ */}
                            {renderBlocksList(blocks, false)}
                            <div id="theory-section-end"></div>

                            <div className="w-full h-px border-t border-dashed border-gray-300 my-10"></div>

                            {/* БЛОК УПРАВЛЕНИЯ ДОМАШНИМ ЗАДАНИЕМ */}
                            {!hasHomeworkSection ? (
                              <div className="flex justify-center mb-8">
                                <button type="button" onClick={(e) => { e.preventDefault(); setHasHomeworkSection(true); setTimeout(() => document.getElementById('hw-section-admin')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }} className="px-8 py-5 bg-purple-600 text-white rounded-2xl font-black shadow-lg hover:bg-purple-700 hover:-translate-y-1 transition-all flex items-center gap-3 text-lg border border-purple-700">
                                  <FileSignature className="w-6 h-6" /> ДОБАВИТЬ ДОМАШНЕЕ ЗАДАНИЕ
                                </button>
                              </div>
                            ) : (
                              <div id="hw-section-admin" className="bg-purple-50/30 p-6 lg:p-8 rounded-[2rem] border-2 border-purple-200 shadow-inner mb-8">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                                  <h3 className="text-2xl font-black text-purple-700 flex items-center gap-3"><FileSignature className="w-6 h-6" /> Домашнее задание</h3>
                                  <button type="button" onClick={() => { setHasHomeworkSection(false); setHwBlocks([]); }} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100">
                                     <Trash2 className="w-4 h-4" /> Удалить ДЗ
                                  </button>
                                </div>
                                {renderBlocksList(hwBlocks, true)}
                                <div id="hw-section-end"></div>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-8 mt-8">
                                <button type="button" onClick={() => handleSaveLesson(theme)} className="flex-1 py-5 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2">
                                  {editingLessonId ? 'Сохранить изменения' : 'Создать урок'}
                                </button>
                                {editingLessonId && (
                                    <button type="button" onClick={resetLessonForm} className="px-10 py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-lg transition-colors">Отмена</button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="w-full lg:w-[320px] shrink-0 sticky top-0 flex flex-col gap-6 pb-8 z-30">
                  <div className="bg-gray-900 rounded-[2rem] p-8 text-white shadow-2xl">
                    <h3 className="font-black text-2xl mb-6">Новый модуль</h3>
                    <form onSubmit={handleCreateTheme} className="space-y-4">
                      <input type="text" value={newThemeTitle} onChange={(e) => setNewThemeTitle(e.target.value)} placeholder="Название модуля" className="w-full p-4 bg-white/10 rounded-xl outline-none focus:bg-white/20 focus:ring-2 focus:ring-indigo-400/50 transition-all font-medium text-white placeholder:text-gray-400" required />
                      <button type="submit" className="w-full py-4 bg-[#5A4BFF] hover:bg-[#4a3dec] rounded-xl font-black transition-colors">Добавить</button>
                    </form>
                  </div>
                  {selectedThemeForLesson && (
                    <>
                      {renderSidebarToolbar(false)}
                      {hasHomeworkSection && renderSidebarToolbar(true)}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.3 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} className={`fixed bottom-10 right-10 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}