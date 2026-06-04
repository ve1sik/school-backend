import { useState, useEffect } from 'react';
import { GraduationCap, X, PlayCircle, Trash2, ArrowLeft, FileText, CheckSquare, Eye, EyeOff, Pencil, Type, PenTool, CheckCircle2, ArrowUp, ArrowDown, Image as ImageIcon, UploadCloud, Plus, FileDown, Link2, BookOpen, Loader2, FileSignature, SaveAll, List, Copy, Search, Folder, ArrowRight, ChevronDown, ChevronsUp, ChevronUp, ChevronsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'align': [] }], 
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
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
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingLessonTitleId, setEditingLessonTitleId] = useState<string | null>(null);

  const [editTitleValue, setEditTitleValue] = useState("");

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  
  const [blocks, setBlocks] = useState<any[]>([]);
  const [hwBlocks, setHwBlocks] = useState<any[]>([]);
  const [hasHomeworkSection, setHasHomeworkSection] = useState(false);

  const [shortAnswerInputs, setShortAnswerInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [hasDraft, setHasDraft] = useState(false);

  // Стейты категорий и фильтров
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [newCourseCategoryId, setNewCourseCategoryId] = useState('');
  
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  // СТЕЙТЫ ДЛЯ КОПИРОВАНИЯ УРОКА
  const [copyLessonData, setCopyLessonData] = useState<{lesson: any, currentTheme: any} | null>(null);
  const [targetCourseIdForCopy, setTargetCourseIdForCopy] = useState<string>('');
  const [targetThemeIdForCopy, setTargetThemeIdForCopy] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);

  // СТЕЙТЫ ДЛЯ НАСТРОЕК ДОСТУПА (старый модал по группам)
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalCourse, setAccessModalCourse] = useState<any | null>(null);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [accessGroupId, setAccessGroupId] = useState<string>('');
  const [themeAccessMap, setThemeAccessMap] = useState<Record<string, { unlock_date: string; deadline: string }>>({});
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // СТЕЙТЫ ДЛЯ ИНЛАЙН-ДАТ МОДУЛЕЙ
  const [expandedThemeDates, setExpandedThemeDates] = useState<Record<string, boolean>>({});
  const [themeDatesMap, setThemeDatesMap] = useState<Record<string, { unlock_date: string; deadline: string }>>({});

  // СТЕЙТЫ ДЛЯ ДАТ УРОКА (в форме создания/редактирования)
  const [lessonUnlockDate, setLessonUnlockDate] = useState('');
  const [lessonDeadline, setLessonDeadline] = useState('');

  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = useNavigate();
  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const handleSaveThemeDates = async (themeId: string, themeTitle: string) => {
    const row = themeDatesMap[themeId] || { unlock_date: '', deadline: '' };
    try {
      await axios.patch(`${API_URL}/themes/${themeId}`, {
        unlock_date: row.unlock_date || null,
        deadline: row.deadline || null,
      }, getTokenConfig());

      if (row.deadline) {
        try {
          await axios.post(`${API_URL}/schedule`, {
            title: `Дедлайн: ${themeTitle}`,
            date: row.deadline,
            type: 'DEADLINE',
            description: `Срок сдачи заданий модуля «${themeTitle}»`,
          }, getTokenConfig());
        } catch { /* не критично если расписание не создалось */ }
      }
      if (row.unlock_date) {
        try {
          await axios.post(`${API_URL}/schedule`, {
            title: `Открытие модуля: ${themeTitle}`,
            date: row.unlock_date,
            type: 'WEBINAR',
            description: `Открытие модуля «${themeTitle}»`,
          }, getTokenConfig());
        } catch { /* не критично */ }
      }

      showToast('Даты модуля сохранены!');
      fetchItems();
    } catch {
      showToast('Ошибка сохранения дат', 'error');
    }
  };

  const openAccessModal = async (course: any) => {
    setAccessModalCourse(course);
    setShowAccessModal(true);
    setThemeAccessMap({});
    setAccessGroupId('');
    try {
      const res = await axios.get(`${API_URL}/groups`, getTokenConfig());
      setAllGroups(res.data);
    } catch {
      setAllGroups([]);
    }
  };

  const loadGroupAccess = async (groupId: string) => {
    if (!groupId) return;
    setIsAccessLoading(true);
    try {
      const res = await axios.get(`${API_URL}/groups/${groupId}/theme-access`, getTokenConfig());
      const map: Record<string, { unlock_date: string; deadline: string }> = {};
      for (const item of res.data) {
        map[item.theme_id] = {
          unlock_date: item.unlock_date ? item.unlock_date.slice(0, 16) : '',
          deadline: item.deadline ? item.deadline.slice(0, 16) : '',
        };
      }
      setThemeAccessMap(map);
    } catch {
      setThemeAccessMap({});
    }
    setIsAccessLoading(false);
  };

  const handleSaveThemeAccess = async (themeId: string) => {
    if (!accessGroupId || !accessModalCourse) return;
    setIsSavingAccess(true);
    const row = themeAccessMap[themeId] || { unlock_date: '', deadline: '' };
    try {
      await axios.post(`${API_URL}/groups/${accessGroupId}/theme-access`, {
        themeId,
        unlock_date: row.unlock_date || null,
        deadline: row.deadline || null,
      }, getTokenConfig());
      showToast('Настройки доступа сохранены!');
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
    setIsSavingAccess(false);
  };

  const handleSaveAllAccess = async () => {
    if (!accessGroupId || !accessModalCourse) return;
    setIsSavingAccess(true);
    const themes = accessModalCourse.themes || [];
    try {
      for (const theme of themes) {
        const row = themeAccessMap[theme.id] || { unlock_date: '', deadline: '' };
        await axios.post(`${API_URL}/groups/${accessGroupId}/theme-access`, {
          themeId: theme.id,
          unlock_date: row.unlock_date || null,
          deadline: row.deadline || null,
        }, getTokenConfig());
      }
      showToast('Все настройки сохранены!');
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
    setIsSavingAccess(false);
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
    setShowThemeModal(false);
    setSelectedCourseForThemes(null);
    if (localStorage.getItem('lesson_draft')) {
      setHasDraft(true);
    }
  }, []);

  useEffect(() => {
    if (selectedThemeForLesson && (newLessonTitle || blocks.length > 0 || hwBlocks.length > 0)) {
      const draft = { newLessonTitle, blocks, hwBlocks, hasHomeworkSection, editingLessonId };
      localStorage.setItem('lesson_draft', JSON.stringify(draft));
    }
  }, [newLessonTitle, blocks, hwBlocks, hasHomeworkSection, editingLessonId, selectedThemeForLesson]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`, getTokenConfig());
      setCategories(res.data);
    } catch (err) {
      const localCats = JSON.parse(localStorage.getItem('temp_categories') || '[]');
      setCategories(localCats);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/categories`, { name: newCategoryName.trim() }, getTokenConfig());
      setCategories([...categories, res.data]);
      showToast('Раздел добавлен!');
    } catch (err) {
      const newCat = { id: `cat-${Date.now()}`, name: newCategoryName.trim() };
      const localCats = [...categories, newCat];
      setCategories(localCats);
      localStorage.setItem('temp_categories', JSON.stringify(localCats));
      showToast('Раздел добавлен (локально)!');
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/categories/${id}`, getTokenConfig());
      setCategories(categories.filter(c => c.id !== id));
      if (selectedFilterCategory === id) setSelectedFilterCategory(null);
      showToast('Раздел удален!');
    } catch (err) {
      const localCats = JSON.parse(localStorage.getItem('temp_categories') || '[]');
      const newLocalCats = localCats.filter((c: any) => c.id !== id);
      setCategories(newLocalCats);
      localStorage.setItem('temp_categories', JSON.stringify(newLocalCats));
      if (selectedFilterCategory === id) setSelectedFilterCategory(null);
      showToast('Раздел удален (локально)!');
    }
  };

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
      const localCourseCats = JSON.parse(localStorage.getItem('temp_course_categories') || '{}');
      
      const mergedCourses = res.data.map((c: any) => ({
        ...c,
        categoryId: c.categoryId || localCourseCats[c.id] || null
      }));

      setItems(mergedCourses);
      if (selectedCourseForThemes) {
        setSelectedCourseForThemes(mergedCourses.find((c: any) => c.id === selectedCourseForThemes.id) || null);
      }
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
      const payload: any = { title, description: '', cover_url: "" };
      if (newCourseCategoryId) payload.categoryId = newCourseCategoryId;

      let res;
      try {
        res = await axios.post(`${API_URL}/courses`, payload, getTokenConfig());
      } catch (err: any) {
        if (err.response?.status === 500 && newCourseCategoryId) {
          res = await axios.post(`${API_URL}/courses`, { title, description: '', cover_url: "" }, getTokenConfig());
          const localCourseCats = JSON.parse(localStorage.getItem('temp_course_categories') || '{}');
          localCourseCats[res.data.id] = newCourseCategoryId;
          localStorage.setItem('temp_course_categories', JSON.stringify(localCourseCats));
        } else {
          throw err;
        }
      }

      setTitle(''); 
      setNewCourseCategoryId('');
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
      await axios.post(`${API_URL}/themes`, { courseId: selectedCourseForThemes.id, title: newThemeTitle, order_index: ((selectedCourseForThemes.themes || []).length) + 1 }, getTokenConfig());
      setNewThemeTitle(''); fetchItems(); showToast('Новый модуль добавлен!');
    } catch (err) { showToast('Ошибка при добавлении', 'error'); }
  };

  const handleSaveCourseTitle = async (id: string, newTitle: string) => {
    const finalTitle = newTitle.trim();
    if (!finalTitle || editingCourseId !== id) {
      setEditingCourseId(null);
      return;
    }
    
    setEditingCourseId(null);
    setItems(prev => prev.map(c => c.id === id ? { ...c, title: finalTitle } : c));
    if (selectedCourseForThemes && selectedCourseForThemes.id === id) {
      setSelectedCourseForThemes((prev: any) => ({ ...prev, title: finalTitle }));
    }
    
    try { 
      await axios.patch(`${API_URL}/courses/${id}`, { title: finalTitle }, getTokenConfig()); 
      showToast('Название сохранено!', 'success');
    } catch (err: any) { 
      try {
        await axios.put(`${API_URL}/courses/${id}`, { title: finalTitle }, getTokenConfig());
        showToast('Название сохранено!', 'success');
      } catch (putErr: any) {
        showToast('Ошибка сохранения', 'error'); 
        fetchItems();
      }
    }
  };

  const handleUpdateCourseCategory = async (courseId: string, categoryId: string) => {
    const finalCategoryId = categoryId || null;
    
    setSelectedCourseForThemes((prev: any) => prev ? { ...prev, categoryId: finalCategoryId } : null);
    setItems(prev => prev.map(c => c.id === courseId ? { ...c, categoryId: finalCategoryId } : c));
    
    const localCourseCats = JSON.parse(localStorage.getItem('temp_course_categories') || '{}');
    if (finalCategoryId) {
      localCourseCats[courseId] = finalCategoryId;
    } else {
      delete localCourseCats[courseId];
    }
    localStorage.setItem('temp_course_categories', JSON.stringify(localCourseCats));

    try {
      await axios.patch(`${API_URL}/courses/${courseId}`, { categoryId: finalCategoryId }, getTokenConfig());
      showToast('Раздел курса обновлен');
    } catch (err) {
      showToast('Раздел привязан (локально)', 'success');
    }
  };

  const handleSaveThemeTitle = async (id: string, newTitle: string) => {
    const finalTitle = newTitle.trim();
    if (!finalTitle || editingThemeId !== id) {
      setEditingThemeId(null);
      return;
    }

    setEditingThemeId(null);
    
    setItems(prev => prev.map(course => ({
      ...course,
      themes: (course.themes || []).map((t: any) => t.id === id ? { ...t, title: finalTitle } : t)
    })));

    if (selectedCourseForThemes) {
      setSelectedCourseForThemes((prev: any) => ({ 
        ...prev, 
        themes: (prev.themes || []).map((t: any) => t.id === id ? { ...t, title: finalTitle } : t) 
      }));
    }
    
    try { 
      await axios.patch(`${API_URL}/themes/${id}`, { title: finalTitle }, getTokenConfig()); 
      showToast('Название модуля сохранено!', 'success');
    } catch (err: any) { 
      try {
        await axios.put(`${API_URL}/themes/${id}`, { title: finalTitle }, getTokenConfig());
        showToast('Название модуля сохранено!', 'success');
      } catch (putErr: any) {
        showToast('Ошибка сохранения', 'error'); 
        fetchItems(); 
      }
    }
  };

  const handleSaveLessonTitle = async (id: string, newTitle: string) => {
    const finalTitle = newTitle.trim();
    if (!finalTitle || editingLessonTitleId !== id) {
      setEditingLessonTitleId(null);
      return;
    }

    setEditingLessonTitleId(null);
    
    setSelectedCourseForThemes((prev: any) => prev ? {
      ...prev, themes: (prev.themes || []).map((t: any) => ({
        ...t, lessons: (t.lessons || []).map((l: any) => l.id === id ? { ...l, title: finalTitle } : l)
      }))
    } : null);
    
    setItems(prev => prev.map(course => {
      if (course.id === selectedCourseForThemes?.id) {
        return { ...course, themes: (course.themes || []).map((t:any) => ({
          ...t, lessons: (t.lessons || []).map((l:any) => l.id === id ? { ...l, title: finalTitle } : l)
        }))};
      }
      return course;
    }));
    
    try { 
      await axios.patch(`${API_URL}/lessons/${id}`, { title: finalTitle }, getTokenConfig()); 
      showToast('Название урока сохранено!', 'success');
    } catch (err: any) { 
      try {
        await axios.put(`${API_URL}/lessons/${id}`, { title: finalTitle }, getTokenConfig());
        showToast('Название урока сохранено!', 'success');
      } catch (putErr: any) {
        showToast('Ошибка сохранения', 'error'); 
        fetchItems(); 
      }
    }
  };

  const handleMoveTheme = async (themeIndex: number, direction: 'up' | 'down') => {
    if (!selectedCourseForThemes) return;

    const themesCopy = JSON.parse(JSON.stringify(selectedCourseForThemes.themes || []));
    const targetIndex = direction === 'up' ? themeIndex - 1 : themeIndex + 1;
    if (targetIndex < 0 || targetIndex >= themesCopy.length) return;

    const themeToMove = themesCopy[themeIndex];
    themesCopy.splice(themeIndex, 1);
    themesCopy.splice(targetIndex, 0, themeToMove);
    themesCopy.forEach((t: any, i: number) => { t.order_index = i + 1; });

    setSelectedCourseForThemes((prev: any) => ({ ...prev, themes: themesCopy }));

    try {
      await axios.patch(`${API_URL}/themes/${themeToMove.id}/reorder`, {
        newOrderIndex: targetIndex + 1,
      }, getTokenConfig());
      showToast('Порядок сохранен!', 'success');
    } catch (err) {
      showToast('Ошибка сохранения порядка', 'error');
      fetchItems();
    }
  };

  // 🔥 НАДЕЖНАЯ ФУНКЦИЯ ДЛЯ ПЕРЕМЕЩЕНИЯ УРОКОВ СТРЕЛОЧКАМИ
  const handleMoveLesson = async (themeIndex: number, lessonIndex: number, direction: 'up' | 'down', type: 'step' | 'module') => {
    if (!selectedCourseForThemes) return;
    
    const themesCopy = JSON.parse(JSON.stringify(selectedCourseForThemes.themes));
    const currentTheme = themesCopy[themeIndex];
    const lessonToMove = currentTheme.lessons[lessonIndex];

    let targetThemeIndex = themeIndex;
    let targetLessonIndex = lessonIndex;

    if (type === 'step') {
      if (direction === 'up') {
        if (lessonIndex > 0) targetLessonIndex = lessonIndex - 1;
        else return; 
      } else {
        if (lessonIndex < currentTheme.lessons.length - 1) targetLessonIndex = lessonIndex + 1;
        else return; 
      }
      currentTheme.lessons.splice(lessonIndex, 1);
      currentTheme.lessons.splice(targetLessonIndex, 0, lessonToMove);
    } 
    else if (type === 'module') {
      if (direction === 'up') {
        if (themeIndex > 0) {
          targetThemeIndex = themeIndex - 1;
          if (!themesCopy[targetThemeIndex].lessons) themesCopy[targetThemeIndex].lessons = [];
          targetLessonIndex = themesCopy[targetThemeIndex].lessons.length; 
        } else return;
      } else {
        if (themeIndex < themesCopy.length - 1) {
          targetThemeIndex = themeIndex + 1;
          targetLessonIndex = 0; 
        } else return;
      }
      currentTheme.lessons.splice(lessonIndex, 1);
      if (!themesCopy[targetThemeIndex].lessons) themesCopy[targetThemeIndex].lessons = [];
      themesCopy[targetThemeIndex].lessons.splice(targetLessonIndex, 0, lessonToMove);
    }

    themesCopy[themeIndex].lessons.forEach((l: any, i: number) => l.order_index = i + 1);
    if (themeIndex !== targetThemeIndex) {
      themesCopy[targetThemeIndex].lessons.forEach((l: any, i: number) => l.order_index = i + 1);
    }

    setSelectedCourseForThemes((prev: any) => ({ ...prev, themes: themesCopy }));

    try {
      await axios.patch(`${API_URL}/lessons/${lessonToMove.id}/reorder`, {
        themeId: themesCopy[targetThemeIndex].id,
        newOrderIndex: targetLessonIndex + 1
      }, getTokenConfig());
      showToast('Порядок сохранен!', 'success');
    } catch (err) {
      showToast('Ошибка сохранения порядка', 'error');
      fetchItems(); 
    }
  };

  const addBlock = (type: string, isHw: boolean) => {
    const newBlock: any = { id: Date.now().toString(), type };
    if (type === 'video') { newBlock.url = ''; newBlock.title = 'Видео'; }
    if (type === 'text') { newBlock.content = ''; newBlock.title = 'Текст'; }
    if (type === 'image') { newBlock.url = ''; newBlock.title = 'Изображение'; }
    if (type === 'video_file') { newBlock.url = ''; newBlock.title = 'Видео-файл'; }
    if (type === 'file') { newBlock.url = ''; newBlock.title = 'Файл для скачивания'; }
    if (type === 'link') { newBlock.url = ''; newBlock.buttonText = 'Перейти'; newBlock.title = 'Ссылка / Кнопка'; }
    
    if (type === 'test') { newBlock.question = ''; newBlock.maxAttempts = 3; newBlock.maxScore = 3; newBlock.options = [{ text: '', isCorrect: false }]; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Тест'; }
    if (type === 'test_short') { newBlock.question = ''; newBlock.correctAnswers = []; newBlock.ignoreTypos = true; newBlock.maxAttempts = 3; newBlock.maxScore = 3; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Тест с кратким ответом'; }
    if (type === 'written') { newBlock.question = ''; newBlock.maxScore = 3; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Развернутый ответ'; }
    if (type === 'matching') { newBlock.question = ''; newBlock.maxAttempts = 3; newBlock.maxScore = 3; newBlock.pairs = [{ left: '', right: '' }]; newBlock.explanation = ''; newBlock.source = ''; newBlock.title = 'Таблица (Впиши ответ)'; }
    
    if (isHw) { setHwBlocks(prev => [...prev, newBlock]); setTimeout(() => document.getElementById('hw-section-end')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); } 
    else { setBlocks(prev => [...prev, newBlock]); setTimeout(() => document.getElementById('theory-section-end')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }
  };

  const updateBlock = (id: string, data: any, isHw: boolean) => { 
    if (isHw) setHwBlocks(hwBlocks.map(b => b.id === id ? { ...b, ...data } : b));
    else setBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b));
    
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

  const handleFileUpload = async (blockId: string, event: any, isHw: boolean, targetUrlField = 'url', targetNameField = 'fileName') => {
    let file = null;
    if (event.target && event.target.files) file = event.target.files[0];
    else if (event.dataTransfer && event.dataTransfer.files) file = event.dataTransfer.files[0];
    
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (blockId: string, e: React.DragEvent, isHw: boolean, targetUrlField = 'url', targetNameField = 'fileName') => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(blockId, e, isHw, targetUrlField, targetNameField);
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
    setLessonUnlockDate(lesson.unlock_date ? lesson.unlock_date.slice(0, 16) : '');
    setLessonDeadline(lesson.deadline ? lesson.deadline.slice(0, 16) : '');
    setTimeout(() => document.getElementById('lesson-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const executeCopyLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyLessonData || !targetThemeIdForCopy) return;

    setIsCopying(true);
    try {
      showToast('Копируем урок...', 'success');
      
      const payload = { 
        themeId: targetThemeIdForCopy, 
        title: `${copyLessonData.lesson.title} (Копия)`, 
        type: 'TEXT', 
        content: copyLessonData.lesson.content || '[]', 
        is_homework: false,
        order_index: 999 
      };

      await axios.post(`${API_URL}/lessons`, payload, getTokenConfig());
      
      showToast('Урок успешно скопирован!', 'success');
      setCopyLessonData(null);
      fetchItems();
    } catch (err) {
      showToast('Ошибка при копировании урока', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const isQuillEmpty = (html: string) => !html || html.replace(/<[^>]*>?/gm, '').trim().length === 0;

  const handleSaveLesson = async (theme: any) => {
    let newErrors: Record<string, boolean> = {};

    if (!newLessonTitle.trim()) newErrors['lessonTitle'] = true;

    const validateArr = (arr: any[]) => {
      arr.forEach(b => {
        if (['test', 'test_short', 'written', 'matching'].includes(b.type)) {
          if (isQuillEmpty(b.question)) newErrors[b.id] = true;
          
          if (b.type === 'test') {
            if (!b.options || b.options.length === 0) newErrors[b.id] = true;
            b.options?.forEach((opt: any) => { if (!opt.text.trim()) newErrors[b.id] = true; });
            if (!b.options?.some((opt: any) => opt.isCorrect)) newErrors[b.id] = true;
          }
          if (b.type === 'test_short') {
            if (!b.correctAnswers || b.correctAnswers.length === 0) newErrors[b.id] = true;
          }
          if (b.type === 'matching') {
            if (!b.pairs || b.pairs.length === 0) newErrors[b.id] = true;
            b.pairs?.forEach((p: any) => { if (!p.left.trim() || !p.right.trim()) newErrors[b.id] = true; });
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
    const regenerateIds = (arr: any[]) => arr.map(b => ({...b, id: `${b.id}-${Math.random().toString(36).substr(2, 9)}`}));

    const cleanedBlocks = regenerateIds(blocks).map(b => ({ ...b, isHomework: false }));
    const cleanedHwBlocks = regenerateIds(hwBlocks).map(b => ({ ...b, isHomework: true }));

    const payload = { 
      themeId: theme.id, 
      title: newLessonTitle, 
      type: 'TEXT', 
      content: JSON.stringify([...cleanedBlocks, ...cleanedHwBlocks]), 
      is_homework: false,
      unlock_date: lessonUnlockDate || null,
      deadline: lessonDeadline || null,
    };

    try {
      if (editingLessonId) {
        await axios.patch(`${API_URL}/lessons/${editingLessonId}`, payload, getTokenConfig());
      } else {
        await axios.post(`${API_URL}/lessons`, { ...payload, order_index: ((theme.lessons || []).length) + 1 }, getTokenConfig());
      }

      if (lessonDeadline) {
        try {
          await axios.post(`${API_URL}/schedule`, {
            title: `Дедлайн: ${newLessonTitle}`,
            date: lessonDeadline,
            type: 'DEADLINE',
            description: `Срок сдачи: ${newLessonTitle}`,
          }, getTokenConfig());
        } catch { /* не критично */ }
      }
      if (lessonUnlockDate) {
        try {
          await axios.post(`${API_URL}/schedule`, {
            title: `Открытие урока: ${newLessonTitle}`,
            date: lessonUnlockDate,
            type: 'WEBINAR',
            description: `Открытие урока «${newLessonTitle}»`,
          }, getTokenConfig());
        } catch { /* не критично */ }
      }

      showToast(editingLessonId ? 'Изменения сохранены!' : 'Урок создан!');
      localStorage.removeItem('lesson_draft');
      setHasDraft(false);
      resetLessonForm(); fetchItems();
    } catch (err) { showToast('Ошибка сохранения', 'error'); }
  };

  const resetLessonForm = () => { setSelectedThemeForLesson(null); setEditingLessonId(null); setNewLessonTitle(''); setBlocks([]); setHwBlocks([]); setHasHomeworkSection(false); setErrors({}); setLessonUnlockDate(''); setLessonDeadline(''); };

  const handleDeleteItem = async (id: string) => {
    setItems(prev => prev.filter(c => c.id !== id));
    if (selectedCourseForThemes?.id === id) { setShowThemeModal(false); setSelectedCourseForThemes(null); }
    try { await axios.delete(`${API_URL}/courses/${id}`, getTokenConfig()); showToast('Удалено'); fetchItems(); } catch (err) { fetchItems(); showToast('Ошибка удаления', 'error'); }
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
            
            {/* Блоки Видео, Текст, Картинка и др. */}
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
                  <ReactQuill theme="snow" modules={quillModules} value={block.content || ''} onChange={(val) => updateBlock(block.id, { content: val }, isHw)} placeholder="Введите текст лекции..." className="min-h-[200px] pb-12 text-content" />
                </div>
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(block.id, e, isHw, 'image', 'imageName')} className="p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-300 flex items-center gap-4 mt-2 hover:bg-emerald-50/50 transition-colors">
                  <label className="cursor-pointer px-5 py-3 bg-white border border-gray-300 rounded-xl hover:border-emerald-400 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm shadow-sm">
                    <UploadCloud className="w-4 h-4" /> Выбрать файл
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw, 'image', 'imageName')} />
                  </label>
                  {block.imageName && <span className="text-xs font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4 inline" /> {block.imageName}</span>}
                  {block.image && <button type="button" onClick={() => updateBlock(block.id, { image: '', imageName: '' }, isHw)} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                </div>
                {block.image && <ExpandableImage src={getFullUrl(block.image)} className="mt-4" /> }
              </div>
            )}
            {block.type === 'image' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-blue-50 p-4 rounded-xl">
                  <ImageIcon className="w-6 h-6 text-blue-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Изображение'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-blue-300 focus:border-blue-600 outline-none font-black text-xl transition-all text-blue-900 placeholder:text-blue-300" placeholder="Заголовок блока..." />
                </div>
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(block.id, e, isHw)} className="flex items-center gap-4 p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl hover:bg-blue-50/50 transition-colors">
                  <label className="cursor-pointer px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all flex items-center gap-3 font-bold text-blue-600 shadow-sm">
                    <UploadCloud className="w-5 h-5" /> Выбрать
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw)} />
                  </label>
                  {block.fileName && <span className="text-sm font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4 inline" /> {block.fileName}</span>}
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
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(block.id, e, isHw)} className="flex items-center gap-4 mb-4 p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl hover:bg-indigo-50/50 transition-colors">
                  <label className="cursor-pointer px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 transition-all flex items-center gap-3 font-bold text-indigo-600 shadow-sm">
                    <UploadCloud className="w-5 h-5" /> Загрузить (MP4)
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw)} />
                  </label>
                  {block.fileName && <span className="text-sm font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4 inline" /> {block.fileName}</span>}
                </div>
              </div>
            )}
            {block.type === 'file' && (
              <div>
                <div className="flex items-center gap-3 mb-6 group/header bg-cyan-50 p-4 rounded-xl">
                  <FileDown className="w-6 h-6 text-cyan-600 shrink-0" />
                  <input value={block.title !== undefined ? block.title : 'Файл для скачивания'} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className="flex-1 bg-transparent border-b-2 border-dashed border-transparent hover:border-cyan-300 focus:border-cyan-600 outline-none font-black text-xl transition-all text-cyan-900 placeholder:text-cyan-300" placeholder="Заголовок блока..." />
                </div>
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(block.id, e, isHw)} className="flex items-center gap-4 mb-4 p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl hover:bg-cyan-50/50 transition-colors">
                  <label className="cursor-pointer px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-cyan-500 transition-colors flex items-center gap-2 font-bold text-gray-600 shadow-sm">
                    <UploadCloud className="w-5 h-5" /> Выбрать файл
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw)} />
                  </label>
                  {block.fileName && <span className="text-sm font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4 inline" /> {block.fileName}</span>}
                </div>
                <div className="bg-white rounded-2xl overflow-visible border border-gray-200 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all z-10 relative">
                  <ReactQuill theme="snow" modules={quillModules} value={block.content || ''} onChange={(val) => updateBlock(block.id, { content: val }, isHw)} placeholder="Краткое описание файла или инструкция..." className="min-h-[100px] pb-12" />
                </div>
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
                    <input value={block.buttonText || ''} onChange={(e) => updateBlock(block.id, { buttonText: e.target.value }, isHw)} placeholder="Например: Подключиться" className="w-full p-4 rounded-xl border border-gray-200 outline-none font-bold focus:border-pink-400 transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">URL ссылки</label>
                    <input value={block.url || ''} onChange={(e) => updateBlock(block.id, { url: e.target.value }, isHw)} placeholder="https://..." className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-pink-400 transition-all font-medium text-pink-600" />
                  </div>
                </div>
              </div>
            )}
            {['test', 'test_short', 'written', 'matching'].includes(block.type) && (
              <>
                <div className={`flex items-center gap-3 mb-6 group/header p-4 rounded-xl ${block.type === 'test' ? 'bg-rose-50' : block.type === 'test_short' ? 'bg-amber-50' : block.type === 'matching' ? 'bg-indigo-50' : 'bg-purple-50'}`}>
                  {block.type === 'test' ? <CheckSquare className="w-6 h-6 text-rose-600 shrink-0" /> : block.type === 'test_short' ? <Type className="w-6 h-6 text-amber-600 shrink-0" /> : block.type === 'matching' ? <List className="w-6 h-6 text-indigo-600 shrink-0" /> : <PenTool className="w-6 h-6 text-purple-600 shrink-0" />}
                  <input value={block.title !== undefined ? block.title : (block.type === 'test' ? 'Тест' : block.type === 'test_short' ? 'Краткий ответ' : block.type === 'matching' ? 'Таблица (Впиши ответ)' : 'Развернутый ответ')} onChange={(e) => updateBlock(block.id, { title: e.target.value }, isHw)} className={`flex-1 bg-transparent border-b-2 border-dashed border-transparent outline-none font-black text-xl transition-all ${block.type === 'test' ? 'hover:border-rose-300 focus:border-rose-600 text-rose-900 placeholder:text-rose-300' : block.type === 'test_short' ? 'hover:border-amber-300 focus:border-amber-600 text-amber-900 placeholder:text-amber-300' : block.type === 'matching' ? 'hover:border-indigo-300 focus:border-indigo-600 text-indigo-900 placeholder:text-indigo-300' : 'hover:border-purple-300 focus:border-purple-600 text-purple-900 placeholder:text-purple-300'}`} placeholder="Заголовок блока..." />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Текст задания</label>
                    <div className={`bg-white rounded-2xl overflow-visible border transition-all z-10 relative ${isError && isQuillEmpty(block.question) ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 focus-within:border-indigo-400'}`}>
                      <ReactQuill theme="snow" modules={quillModules} value={block.question || ''} onChange={(val) => updateBlock(block.id, { question: val }, isHw)} placeholder="Введите вопрос..." className="min-h-[120px] pb-12" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 w-full sm:w-32 shrink-0">
                    {['test', 'test_short', 'matching'].includes(block.type) && (
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Попыток</label>
                        <input type="number" min="1" max="100" value={block.maxAttempts !== undefined ? block.maxAttempts : 3} onChange={(e) => updateBlock(block.id, { maxAttempts: e.target.value === '' ? '' : parseInt(e.target.value) }, isHw)} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-black text-center" />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Макс. балл</label>
                      <input type="number" min="1" max="1000" value={block.maxScore !== undefined ? block.maxScore : 3} onChange={(e) => updateBlock(block.id, { maxScore: e.target.value === '' ? '' : parseInt(e.target.value) }, isHw)} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-black text-center text-purple-600" />
                    </div>
                  </div>
                </div>

                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(block.id, e, isHw, 'questionImage', 'questionImageName')} className="mb-8 p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-300 hover:bg-gray-100/50 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest sm:mb-0 block shrink-0">Картинка к вопросу:</label>
                  <div className="flex items-center gap-4 flex-1">
                    <label className="cursor-pointer px-5 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 transition-all flex items-center gap-2 font-bold text-gray-500 text-sm shadow-sm">
                      <UploadCloud className="w-4 h-4" /> Прикрепить
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(block.id, e, isHw, 'questionImage', 'questionImageName')} />
                    </label>
                    {block.questionImageName && <span className="text-xs font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4 inline" /> {block.questionImageName}</span>}
                    {block.questionImage && <button type="button" onClick={() => updateBlock(block.id, { questionImage: '', questionImageName: '' }, isHw)} className="p-2 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                {block.questionImage && <ExpandableImage src={getFullUrl(block.questionImage)} className="mb-6" />}
              </>
            )}

            {block.type === 'test' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Варианты ответов</label>
                {block.options?.map((opt: any, optIdx: number) => (
                  <div key={optIdx} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
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

            {block.type === 'test_short' && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Правильные ответы</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(block.correctAnswers || []).map((ans: string, idx: number) => (
                    <span key={idx} className="px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm">
                      {ans}
                      <button type="button" onClick={() => { const newAns = block.correctAnswers.filter((_:any, i:number) => i !== idx); updateBlock(block.id, { correctAnswers: newAns }, isHw); }} className="hover:text-red-500 bg-white/50 rounded-md p-0.5 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input type="text" value={shortAnswerInputs[block.id] || ''} onChange={(e) => setShortAnswerInputs({ ...shortAnswerInputs, [block.id]: e.target.value })} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); const val = shortAnswerInputs[block.id]?.trim();
                        if (val) { updateBlock(block.id, { correctAnswers: [...(block.correctAnswers || []), val] }, isHw); setShortAnswerInputs({ ...shortAnswerInputs, [block.id]: '' }); }
                      }
                    }}
                    placeholder="Например: Москва" className="flex-1 p-4 rounded-xl border-2 outline-none font-bold border-gray-200 focus:border-amber-400" 
                  />
                  <button type="button" onClick={() => {
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
                  <span className="text-sm font-bold text-gray-700">Игнорировать опечатки, регистр и Ё</span>
                </label>
              </div>
            )}

            {block.type === 'matching' && (
              <div className="space-y-4 mb-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Таблица ответов</label>
                <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar">
                  {block.pairs?.map((pair: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 rounded-2xl border-2 shrink-0 w-32 transition-all border-gray-200 bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Пара {idx + 1}</span>
                        <button type="button" onClick={() => { const newPairs = block.pairs.filter((_:any, i:number) => i !== idx); updateBlock(block.id, { pairs: newPairs }, isHw); }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                      <input value={pair.left} onChange={(e) => { const newPairs = [...block.pairs]; newPairs[idx].left = e.target.value; updateBlock(block.id, { pairs: newPairs }, isHw); }} placeholder="Ключ" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-black text-center text-indigo-700 focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all border border-transparent" />
                      <input value={pair.right} onChange={(e) => { const newPairs = [...block.pairs]; newPairs[idx].right = e.target.value; updateBlock(block.id, { pairs: newPairs }, isHw); }} placeholder="Значение" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-black text-center text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-400 transition-all border border-transparent" />
                    </div>
                  ))}
                  <button type="button" onClick={() => { updateBlock(block.id, { pairs: [...(block.pairs || []), { left: '', right: '' }] }, isHw); }} className="w-32 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400 rounded-2xl font-black transition-all">
                    <Plus className="w-6 h-6 mb-1" /> Добавить
                  </button>
                </div>
              </div>
            )}

            {['test', 'test_short', 'written', 'matching'].includes(block.type) && (
              <div className="pt-8 border-t-2 border-dashed border-gray-200 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Источник / Тип задания</label>
                  <input value={block.source || ''} onChange={(e) => updateBlock(block.id, { source: e.target.value }, isHw)} placeholder="Например: Тип 5 №2 (Решу ЕГЭ)" className="w-full p-4 rounded-xl border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-gray-700 bg-gray-50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-2"><BookOpen className="w-3.5 h-3.5" /> Пояснение / Разбор задания</label>
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
          <button type="button" onClick={() => addBlock('matching', isHw)} className={`${btnClass} !flex-row !justify-start px-4`}><List className="w-5 h-5 text-indigo-500" /> Таблица (впиши ответ)</button>
          <button type="button" onClick={() => addBlock('written', isHw)} className={`${btnClass} !flex-row !justify-start px-4`}><PenTool className="w-5 h-5 text-purple-500" /> Развернутый ответ</button>
        </div>
      </div>
    );
  };

  const filteredCourses = items.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(courseSearchQuery.toLowerCase());
    const matchesCategory = selectedFilterCategory ? course.categoryId === selectedFilterCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900">
      
      {/* ГЛОБАЛЬНЫЕ СТИЛИ */}
      <style>{`
  /* ===== QUILL CORE FIXES ===== */
  .ql-container {
    min-width: 0 !important;
    overflow: hidden !important;
  }
  .ql-editor { 
    min-height: auto !important; 
    font-family: inherit !important; 
    font-size: 16px !important; 
    padding: 12px 16px !important;
    
    /* 🔥 ГЛАВНЫЙ ФИК ПЕРЕНОСА */
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  .ql-editor p { 
    margin-bottom: 0.75em !important; 
    line-height: 1.6 !important; 
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
  /* 🔥 ФИК ДЛЯ ВЛОЖЕННЫХ КОНТЕЙНЕРОВ */
  .ql-editor .ql-clipboard,
  .ql-editor span,
  .ql-editor strong,
  .ql-editor em {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
  .ql-editor img { max-width: 100% !important; border-radius: 1rem !important; margin: 1rem 0 !important; }
  .ql-align-center { text-align: center !important; }
  .ql-align-right { text-align: right !important; }
  .ql-align-justify { text-align: justify !important; }
  .ql-editor ol, .ql-editor ul { padding-left: 1.5em !important; margin-bottom: 1em !important; }
  .ql-editor li { margin-bottom: 0.5em !important; }

  /* 🔥 ОГРАНИЧЕНИЕ ШИРИНЫ БЛОКА ТЕКСТОВОГО РЕДАКТОРА */
  .ql-snow .ql-editor {
    min-height: 120px;
  }
`}</style>

      {/* БОКОВАЯ ПАНЕЛЬ */}
      <aside className="w-72 bg-white border border-gray-100 flex flex-col sticky top-4 z-10 shadow-xl shrink-0 self-start max-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] ml-4">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50 shrink-0">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center"><GraduationCap className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-black tracking-tight">Admin<span className="text-indigo-600">Pro</span></span>
        </div>
        <div className="flex-1 px-4 py-8 space-y-3 overflow-y-auto custom-scrollbar">
          <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Разделы управления</h3>
          <button type="button" className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20"><BookOpen className="w-5 h-5" /> Курсы и Уроки</button>
        </div>
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 px-5 py-4 w-full text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-colors"><ArrowLeft className="w-5 h-5" /> На портал</button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative scroll-smooth min-w-0">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black">Создание контента</h1>
            {hasDraft && !showThemeModal && (
               <button onClick={() => { setShowThemeModal(true); setTimeout(restoreDraft, 500); }} className="px-6 py-3 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
                 <SaveAll className="w-5 h-5" /> Восстановить незаконченный урок
               </button>
            )}
          </div>

          {/* 🔥 ПЛАШКА С КАТЕГОРИЯМИ И ПОИСКОМ */}
          <div className="bg-white p-5 rounded-3xl shadow-sm mb-8 flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between border border-gray-100 relative">
            <div className="relative w-full xl:flex-1 pr-14">
               <div className={`flex flex-wrap gap-2 transition-all duration-300 overflow-hidden ${isCategoriesExpanded ? 'max-h-[500px]' : 'max-h-[44px]'}`}>
                  <button 
                    onClick={() => setSelectedFilterCategory(null)} 
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${!selectedFilterCategory ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Folder className="w-4 h-4" /> Все курсы
                  </button>
                  
                  {categories.map(c => (
                    <div key={c.id} className="relative group/cat flex items-center">
                      <button 
                        onClick={() => setSelectedFilterCategory(c.id)} 
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all pr-8 ${selectedFilterCategory === c.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {c.name}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteCategory(c.id, e)}
                        className={`absolute right-2 p-1 rounded-md opacity-0 group-hover/cat:opacity-100 transition-opacity ${selectedFilterCategory === c.id ? 'text-indigo-200 hover:text-white hover:bg-indigo-500' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200'}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => setIsAddingCategory(true)} 
                    className="px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4"/> Раздел
                  </button>
               </div>
               
               {categories.length > 2 && (
                 <button 
                   onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)} 
                   className="absolute right-0 top-0 p-2.5 bg-gray-50 border border-gray-200 rounded-xl shadow-sm text-gray-500 hover:text-indigo-600 hover:bg-white transition-all z-10"
                 >
                   <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${isCategoriesExpanded ? 'rotate-180' : ''}`} />
                 </button>
               )}
            </div>
            
            <div className="relative w-full xl:w-72 shrink-0">
               <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                 type="text" 
                 placeholder="Найти курс..." 
                 value={courseSearchQuery} 
                 onChange={e => setCourseSearchQuery(e.target.value)} 
                 className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:font-medium"
               />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm sticky top-8 border border-gray-100">
                <h2 className="text-xl font-black mb-6">Создать программу</h2>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-2">Раздел (Предмет)</label>
                    <select 
                      value={newCourseCategoryId} 
                      onChange={e => setNewCourseCategoryId(e.target.value)} 
                      className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all font-bold text-gray-700 border border-transparent focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">Без раздела (Все курсы)</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-2">Название курса</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: История 10 класс..." className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-bold border border-transparent" required />
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full mt-2 py-4 text-white rounded-xl font-black transition-colors bg-[#5A4BFF] hover:bg-[#4a3dec] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Добавить курс'}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              {filteredCourses.length === 0 ? (
                <div className="bg-white p-12 rounded-[2rem] text-center border border-gray-100 shadow-sm flex flex-col items-center">
                  <Folder className="w-16 h-16 text-gray-200 mb-4" />
                  <h3 className="text-xl font-black text-gray-800">Курсов не найдено</h3>
                  <p className="text-gray-500 mt-2 font-medium">Попробуйте изменить параметры поиска или выберите другой раздел.</p>
                </div>
              ) : (
                filteredCourses.map((item) => (
                  <div key={item.id} onClick={() => { setSelectedCourseForThemes(item); setShowThemeModal(true); }} className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 border-2 border-transparent transition-all group gap-4">
                    <div className="flex-1 min-w-0">
                      
                      {item.categoryId && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            <Folder className="w-3 h-3" />
                            {categories.find(c => c.id === item.categoryId)?.name || 'Неизвестный раздел'}
                          </span>
                        </div>
                      )}

                      {editingCourseId === item.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input 
                            autoFocus 
                            value={editTitleValue} 
                            onChange={(e) => setEditTitleValue(e.target.value)} 
                            onKeyDown={(e) => { 
                              if(e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSaveCourseTitle(item.id, editTitleValue); } 
                              if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditingCourseId(null); } 
                            }} 
                            onClick={(e) => e.stopPropagation()} 
                            className="text-xl font-black px-4 py-2 border-2 rounded-xl outline-none w-full bg-indigo-50 border-[#5A4BFF]" 
                          />
                          <button onClick={(e) => { e.stopPropagation(); handleSaveCourseTitle(item.id, editTitleValue); }} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shrink-0"><CheckCircle2 className="w-6 h-6" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingCourseId(null); }} className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shrink-0"><X className="w-6 h-6" /></button>
                        </div>
                      ) : (
                        <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-3 min-w-0" onClick={(e) => { e.stopPropagation(); setEditingCourseId(item.id); setEditTitleValue(item.title); }}>
                          <span className="truncate">{item.title}</span> <Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </h3>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openAccessModal(item); }} className="p-3 text-gray-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-colors z-10" title="Настройки доступа и дедлайны"><BookOpen className="w-5 h-5" /></button>
                      <button type="button" className="w-full sm:w-auto px-6 py-3 bg-gray-50 group-hover:bg-[#5A4BFF] group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20 text-gray-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                        Модули и Уроки <ArrowRight className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-3 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-10"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* МОДАЛКА ДОБАВЛЕНИЯ РАЗДЕЛА */}
      <AnimatePresence>
        {isAddingCategory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                <button onClick={() => setIsAddingCategory(false)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"><X className="w-5 h-5"/></button>
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <Folder className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black mb-2 text-gray-900">Новый раздел</h3>
                <p className="text-gray-500 font-medium mb-6 text-sm">Создайте категорию (предмет), чтобы группировать в ней курсы.</p>
                <form onSubmit={handleAddCategory}>
                   <input type="text" autoFocus required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Например: Русский язык" className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 border border-transparent focus:border-purple-200 font-bold mb-6 transition-all text-lg"/>
                   <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shadow-lg shadow-purple-500/30 transition-all active:scale-95 text-lg">Добавить раздел</button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА КОПИРОВАНИЯ УРОКА */}
      <AnimatePresence>
        {copyLessonData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
                <button onClick={() => setCopyLessonData(null)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"><X className="w-5 h-5"/></button>
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <Copy className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black mb-2 text-gray-900">Копирование урока</h3>
                <p className="text-gray-500 font-medium mb-6 text-sm">Урок <strong>«{copyLessonData.lesson.title}»</strong> будет скопирован со всеми заданиями.</p>
                
                <form onSubmit={executeCopyLesson} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-2">Выберите курс</label>
                    <select 
                      required
                      value={targetCourseIdForCopy} 
                      onChange={e => { setTargetCourseIdForCopy(e.target.value); setTargetThemeIdForCopy(''); }} 
                      className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all font-bold text-gray-700 border border-transparent focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Выберите курс --</option>
                      {items.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-2">Выберите модуль</label>
                    <select 
                      required
                      disabled={!targetCourseIdForCopy}
                      value={targetThemeIdForCopy} 
                      onChange={e => setTargetThemeIdForCopy(e.target.value)} 
                      className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all font-bold text-gray-700 border border-transparent focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="" disabled>-- Выберите модуль --</option>
                      {items.find(c => c.id === targetCourseIdForCopy)?.themes?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.order_index}. {t.title}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" disabled={isCopying || !targetThemeIdForCopy} className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100">
                    {isCopying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Подтвердить и скопировать'}
                  </button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА УПРАВЛЕНИЯ КУРСОМ */}
      <AnimatePresence>
        {showThemeModal && selectedCourseForThemes && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4 lg:p-8">
            <motion.div className="bg-[#F8FAFC] rounded-[2.5rem] w-full max-w-[1400px] max-h-[95vh] overflow-hidden flex flex-col relative shadow-2xl">
              <button type="button" onClick={() => { setShowThemeModal(false); resetLessonForm(); fetchItems(); }} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full z-20 shadow-sm transition-colors"><X className="w-5 h-5" /></button>
              
              {/* 🔥 ШАПКА КУРСА */}
              <div className="p-6 lg:p-8 bg-white border-b border-gray-100 flex flex-col xl:flex-row xl:items-center shrink-0 gap-4 sm:gap-6 relative z-10">
                <div className="w-full xl:flex-1 xl:min-w-[12rem] min-w-0">
                  {editingCourseId === selectedCourseForThemes.id ? (
                    <div className="flex items-center gap-2 w-full max-w-2xl">
                      <input 
                        autoFocus 
                        value={editTitleValue} 
                        onChange={(e) => setEditTitleValue(e.target.value)} 
                        onKeyDown={(e) => { 
                          if(e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSaveCourseTitle(selectedCourseForThemes.id, editTitleValue); } 
                          if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditingCourseId(null); } 
                        }} 
                        onClick={(e) => e.stopPropagation()}
                        className="text-3xl font-black px-4 py-2 border-2 rounded-xl outline-none w-full max-w-2xl bg-indigo-50 border-[#5A4BFF]" 
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleSaveCourseTitle(selectedCourseForThemes.id, editTitleValue); }} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shrink-0"><CheckCircle2 className="w-6 h-6" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingCourseId(null); }} className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shrink-0"><X className="w-6 h-6" /></button>
                    </div>
                  ) : (
                    <h2 className="text-3xl font-black cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-3 group min-w-0" onClick={(e) => { e.stopPropagation(); setEditingCourseId(selectedCourseForThemes.id); setEditTitleValue(selectedCourseForThemes.title); }}>
                      <span className="truncate">{selectedCourseForThemes.title}</span> <Pencil className="w-6 h-6 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h2>
                  )}
                </div>

                <div className="w-full xl:w-auto max-w-full shrink-0 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex items-center gap-3 xl:ml-auto mr-14 sm:mr-16">
                   <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 ml-2 shrink-0">
                     <Folder className="w-3.5 h-3.5 shrink-0" /> Относится к разделу:
                   </label>
                   <select
                     value={selectedCourseForThemes.categoryId || ''}
                     onChange={(e) => handleUpdateCourseCategory(selectedCourseForThemes.id, e.target.value)}
                     className="w-full min-w-0 sm:w-48 max-w-full bg-white border border-gray-200 text-sm font-bold text-gray-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer shadow-sm"
                   >
                     <option value="">Без раздела</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 flex flex-col lg:flex-row gap-8 scroll-smooth relative items-start custom-scrollbar">
                
                <div className="flex-1 space-y-6 min-w-0 pb-20">
                  {(selectedCourseForThemes.themes || []).map((theme: any, tIdx: number) => {
                    const visibleLessons = theme.lessons || [];

                    return (
                      <div key={theme.id} className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border-2 border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
                          <div className="flex-1 flex items-center gap-3 min-w-0">
                            <div className="flex flex-col gap-1 shrink-0 bg-white shadow-sm border border-gray-100 rounded-lg p-1">
                              <button type="button" onClick={() => handleMoveTheme(tIdx, 'up')} title="Наверх" disabled={tIdx === 0} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent p-1 transition-colors"><ChevronUp size={18} /></button>
                              <button type="button" onClick={() => handleMoveTheme(tIdx, 'down')} title="Вниз" disabled={tIdx === (selectedCourseForThemes.themes.length - 1)} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent p-1 transition-colors"><ChevronDown size={18} /></button>
                            </div>
                            <div className="flex-1 min-w-0">
                            {editingThemeId === theme.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <input 
                                  autoFocus 
                                  value={editTitleValue} 
                                  onChange={(e) => setEditTitleValue(e.target.value)} 
                                  onKeyDown={(e) => { 
                                    if(e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSaveThemeTitle(theme.id, editTitleValue); } 
                                    if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditingThemeId(null); } 
                                  }} 
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-black text-2xl px-3 py-1.5 bg-indigo-50 border-2 border-[#5A4BFF] rounded-xl outline-none w-full" 
                                />
                                <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveThemeTitle(theme.id, editTitleValue); }} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shrink-0"><CheckCircle2 className="w-6 h-6" /></button>
                                <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditingThemeId(null); }} className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shrink-0"><X className="w-6 h-6" /></button>
                              </div>
                            ) : (
                              <h4 className="font-black text-xl lg:text-2xl cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2 group min-w-0" onClick={(e) => { e.stopPropagation(); setEditingThemeId(theme.id); setEditTitleValue(theme.title); }}>
                                <span className="truncate">Модуль {theme.order_index}. {theme.title}</span> <Pencil className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </h4>
                            )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0 bg-gray-50 p-1.5 rounded-2xl">
                            <button type="button" title="Даты открытия и дедлайн модуля" onClick={() => { const isOpen = expandedThemeDates[theme.id]; setExpandedThemeDates(p => ({...p, [theme.id]: !isOpen})); if (!isOpen) { setThemeDatesMap(p => ({...p, [theme.id]: { unlock_date: theme.unlock_date ? theme.unlock_date.slice(0,16) : '', deadline: theme.deadline ? theme.deadline.slice(0,16) : '' }})); }}} className={`p-2.5 bg-white rounded-xl shadow-sm transition-colors ${expandedThemeDates[theme.id] ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-amber-600'}`}><BookOpen className="w-5 h-5" /></button>
                            <button type="button" onClick={() => handleToggleThemeVisibility(theme.id, theme.is_visible)} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 hover:text-gray-900 transition-colors">{theme.is_visible === false ? (<EyeOff className="w-5 h-5" />) : (<Eye className="w-5 h-5" />)}</button>
                            <button type="button" onClick={() => handleDeleteTheme(theme.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            <button type="button" onClick={() => { resetLessonForm(); setSelectedThemeForLesson(theme); setTimeout(() => document.getElementById('lesson-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="px-5 py-2.5 ml-2 bg-[#5A4BFF] text-white rounded-xl text-sm font-black shadow-md transition-colors">+ Новый урок</button>
                          </div>
                        </div>

                        {/* ИНЛАЙН-ДАТЫ МОДУЛЯ */}
                        <AnimatePresence>
                          {expandedThemeDates[theme.id] && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mb-5 p-4 bg-amber-50/60 border border-amber-100 rounded-2xl flex flex-wrap gap-4 items-end">
                                <div className="flex-1 min-w-[160px]">
                                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 block">📅 Открыть с</label>
                                  <input type="datetime-local" value={themeDatesMap[theme.id]?.unlock_date || ''} onChange={e => setThemeDatesMap(p => ({...p, [theme.id]: {...(p[theme.id]||{unlock_date:'',deadline:''}), unlock_date: e.target.value}}))} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                                </div>
                                <div className="flex-1 min-w-[160px]">
                                  <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1 block">⏰ Срок сдачи</label>
                                  <input type="datetime-local" value={themeDatesMap[theme.id]?.deadline || ''} onChange={e => setThemeDatesMap(p => ({...p, [theme.id]: {...(p[theme.id]||{unlock_date:'',deadline:''}), deadline: e.target.value}}))} className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                                </div>
                                <button onClick={() => handleSaveThemeDates(theme.id, theme.title)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black transition-colors flex items-center gap-2 shrink-0">
                                  <CheckCircle2 className="w-4 h-4" /> Сохранить
                                </button>
                                {(theme.unlock_date || theme.deadline) && (
                                  <div className="w-full flex flex-wrap gap-2 text-xs text-gray-500 font-medium">
                                    {theme.unlock_date && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">Сохранено: откр. {new Date(theme.unlock_date).toLocaleString('ru', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
                                    {theme.deadline && <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-lg">Сохранено: дедл. {new Date(theme.deadline).toLocaleString('ru', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-3 min-h-[50px]">
                          {visibleLessons.map((lesson: any, lIdx: number) => {
                            let hasVideo = false; let hasText = false; let hasTest = false; let hasShort = false; let hasHomework = false; let hasWritten = false;
                            let hasImage = false; let hasVideoFile = false; let hasFile = false; let hasLink = false; let hasMatching = false;
                            
                            if (lesson.content) {
                              try {
                                const parsed = JSON.parse(lesson.content.trim());
                                hasVideo = parsed.some((b:any) => b.type === 'video'); hasText = parsed.some((b:any) => b.type === 'text');
                                hasTest = parsed.some((b:any) => b.type === 'test'); hasShort = parsed.some((b:any) => b.type === 'test_short');
                                hasWritten = parsed.some((b:any) => b.type === 'written'); hasHomework = parsed.some((b:any) => b.isHomework); 
                                hasImage = parsed.some((b:any) => b.type === 'image'); hasVideoFile = parsed.some((b:any) => b.type === 'video_file');
                                hasFile = parsed.some((b:any) => b.type === 'file'); hasLink = parsed.some((b:any) => b.type === 'link');
                                hasMatching = parsed.some((b:any) => b.type === 'matching');
                              } catch(e) { hasText = true; }
                            }

                            return (
                              <div key={lesson.id} className="p-3 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border border-gray-100 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all">
                                <div className="flex-1 flex items-center gap-3 font-bold text-base text-gray-700 min-w-0">
                                  
                                  {/* 🔥 НОВЫЕ КНОПКИ УПРАВЛЕНИЯ ПОРЯДКОМ */}
                                  <div className="flex flex-col gap-1 shrink-0 bg-white shadow-sm border border-gray-100 rounded-lg p-1">
                                    <button onClick={() => handleMoveLesson(tIdx, lIdx, 'up', 'module')} title="В предыдущий модуль" disabled={tIdx === 0 && lIdx === 0} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent p-1 transition-colors"><ChevronsUp size={18}/></button>
                                    <button onClick={() => handleMoveLesson(tIdx, lIdx, 'up', 'step')} title="Наверх" disabled={lIdx === 0} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent p-1 transition-colors"><ChevronUp size={18}/></button>
                                    <button onClick={() => handleMoveLesson(tIdx, lIdx, 'down', 'step')} title="Вниз" disabled={lIdx === visibleLessons.length - 1} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent p-1 transition-colors"><ChevronDown size={18}/></button>
                                    <button onClick={() => handleMoveLesson(tIdx, lIdx, 'down', 'module')} title="В следующий модуль" disabled={tIdx === (selectedCourseForThemes.themes.length - 1) && lIdx === visibleLessons.length - 1} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent p-1 transition-colors"><ChevronsDown size={18}/></button>
                                  </div>

                                  <div className="px-3 py-2.5 bg-white rounded-xl shadow-sm flex gap-2 border border-gray-100 shrink-0">
                                    {(hasVideo || hasVideoFile) && <PlayCircle className="w-4 h-4 text-indigo-500" />}
                                    {hasImage && <ImageIcon className="w-4 h-4 text-blue-500" />}
                                    {hasText && <FileText className="w-4 h-4 text-emerald-500" />}
                                    {hasFile && <FileDown className="w-4 h-4 text-cyan-500" />}
                                    {hasLink && <Link2 className="w-4 h-4 text-pink-500" />}
                                    {hasTest && <CheckSquare className="w-4 h-4 text-rose-500" />}
                                    {hasShort && <Type className="w-4 h-4 text-amber-500" />}
                                    {hasMatching && <List className="w-4 h-4 text-indigo-500" />}
                                    {hasWritten && <PenTool className="w-4 h-4 text-purple-500" />}
                                    {hasHomework && <FileSignature className="w-4 h-4 text-purple-500" />}
                                  </div>
                                  
                                  {editingLessonTitleId === lesson.id ? (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <input 
                                        autoFocus 
                                        value={editTitleValue} 
                                        onChange={(e) => setEditTitleValue(e.target.value)} 
                                        onKeyDown={(e) => { 
                                          if(e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSaveLessonTitle(lesson.id, editTitleValue); } 
                                          if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditingLessonTitleId(null); } 
                                        }} 
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 px-3 py-1.5 border-2 rounded-lg outline-none font-bold bg-indigo-50 border-[#5A4BFF] min-w-0 transition-all" 
                                      />
                                      <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveLessonTitle(lesson.id, editTitleValue); }} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shrink-0"><CheckCircle2 className="w-5 h-5" /></button>
                                      <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditingLessonTitleId(null); }} className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shrink-0"><X className="w-5 h-5" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 min-w-0">
                                      <span className="cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2 group/title" onClick={(e) => { e.stopPropagation(); setEditingLessonTitleId(lesson.id); setEditTitleValue(lesson.title); }}>
                                        <span className="truncate">{lesson.title}</span> <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                                      </span>
                                      <div className="flex gap-2 mt-1 flex-wrap">
                                        {lesson.deadline && (() => { const d = new Date(lesson.deadline); const days = Math.ceil((d.getTime() - Date.now()) / 86400000); return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${days < 0 ? 'bg-red-50 text-red-500' : days <= 3 ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-500'}`}>⏰ {days < 0 ? 'Просрочено' : days === 0 ? 'Сегодня!' : `${days} дн.`} · {d.toLocaleDateString('ru',{day:'numeric',month:'short'})}</span>; })()}
                                        {lesson.unlock_date && new Date(lesson.unlock_date).getTime() > Date.now() && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">📅 {new Date(lesson.unlock_date).toLocaleDateString('ru',{day:'numeric',month:'short'})}</span>}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 transition-opacity">
                                   <button type="button" onClick={() => { setTargetCourseIdForCopy(selectedCourseForThemes.id); setTargetThemeIdForCopy(theme.id); setCopyLessonData({lesson, currentTheme: theme}); }} title="Создать копию" className="p-2 bg-white rounded-xl shadow-sm text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Copy className="w-4 h-4" /></button>
                                   <button type="button" onClick={() => startEditingLesson(theme, lesson)} className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-gray-50"><Pencil className="w-4 h-4" /></button>
                                   <button type="button" onClick={() => handleToggleLessonVisibility(lesson.id, lesson.is_visible)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-gray-900">{lesson.is_visible === false ? (<EyeOff className="w-4 h-4" />) : (<Eye className="w-4 h-4" />)}</button>
                                   <button type="button" onClick={() => handleDeleteLesson(lesson.id)} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {visibleLessons.length === 0 && <p className="text-gray-400 text-sm font-bold pl-4 py-2 border border-dashed border-gray-200 rounded-xl pointer-events-none">В этом модуле пока пусто. Создайте новый урок.</p>}
                        </div>

                        {selectedThemeForLesson?.id === theme.id && (
                          <div id="lesson-form" className="mt-8 p-6 lg:p-8 bg-white rounded-[2rem] border-[4px] border-[#5A4BFF] shadow-2xl relative pointer-events-auto">
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
                              className={`w-full px-6 py-5 bg-gray-50 rounded-2xl font-black text-lg outline-none mb-4 border-2 transition-all ${errors['lessonTitle'] ? 'border-red-400 bg-red-50' : 'border-transparent focus:bg-white focus:border-[#5A4BFF]'}`} 
                            />

                            {/* ДАТЫ УРОКА */}
                            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex-1 min-w-[150px]">
                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 block">📅 Открыть с (дата открытия)</label>
                                <input type="datetime-local" value={lessonUnlockDate} onChange={e => setLessonUnlockDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                                <p className="text-[10px] text-gray-400 mt-1">Урок откроется для учеников с этой даты</p>
                              </div>
                              {hasHomeworkSection && (
                                <div className="flex-1 min-w-[150px]">
                                  <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 block">⏰ Срок сдачи ДЗ</label>
                                  <input type="datetime-local" value={lessonDeadline} onChange={e => setLessonDeadline(e.target.value)} className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
                                  <p className="text-[10px] text-gray-400 mt-1">Дедлайн для домашнего задания</p>
                                </div>
                              )}
                              {!hasHomeworkSection && (
                                <div className="flex-1 min-w-[150px] flex items-center justify-center">
                                  <p className="text-[11px] font-bold text-gray-400 text-center">Дедлайн появится после добавления ДЗ</p>
                                </div>
                              )}
                            </div>

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

                            <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-8 mt-8 lg:hidden">
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

                {/* ПРАВАЯ ПАНЕЛЬ С УПРАВЛЕНИЕМ УРОКОМ */}
                <div className="w-full lg:w-[320px] shrink-0 sticky top-4 flex flex-col gap-6 self-start max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar pr-2 pb-8 z-30 pt-2 pointer-events-auto">
                  {selectedThemeForLesson && (
                    <div className="bg-[#5A4BFF] p-6 rounded-[2rem] shadow-xl text-white">
                      <h4 className="font-black text-sm text-center mb-4 uppercase tracking-widest text-indigo-100">Управление уроком</h4>
                      <button type="button" onClick={() => handleSaveLesson(selectedThemeForLesson)} className="w-full py-4 bg-white text-[#5A4BFF] hover:bg-gray-100 rounded-xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                        <SaveAll className="w-5 h-5" /> {editingLessonId ? 'Сохранить изменения' : 'Создать урок'}
                      </button>
                      {editingLessonId && (
                         <button type="button" onClick={resetLessonForm} className="w-full mt-3 py-3 border-2 border-indigo-400 text-indigo-100 hover:bg-indigo-600 rounded-xl font-bold transition-colors">
                            Отменить редактирование
                         </button>
                      )}
                    </div>
                  )}

                  {selectedThemeForLesson && renderSidebarToolbar(false)}
                  {selectedThemeForLesson && hasHomeworkSection && renderSidebarToolbar(true)}
                  
                  <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-2xl">
                    <h3 className="font-black text-xl mb-4">Новый модуль</h3>
                    <form onSubmit={handleCreateTheme} className="space-y-4">
                      <input type="text" value={newThemeTitle} onChange={(e) => setNewThemeTitle(e.target.value)} placeholder="Название модуля" className="w-full p-4 bg-white/10 rounded-xl outline-none focus:bg-white/20 focus:ring-2 focus:ring-indigo-400/50 transition-all font-medium text-white placeholder:text-gray-400" required />
                      <button type="submit" className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 rounded-xl font-black transition-colors">Добавить</button>
                    </form>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА НАСТРОЕК ДОСТУПА И ДЕДЛАЙНОВ */}
      <AnimatePresence>
        {showAccessModal && accessModalCourse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Расписание доступа</h3>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">{accessModalCourse.title}</p>
                </div>
                <button onClick={() => setShowAccessModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 shrink-0 border-b border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Выберите группу</label>
                <select
                  value={accessGroupId}
                  onChange={e => { setAccessGroupId(e.target.value); loadGroupAccess(e.target.value); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer"
                >
                  <option value="">-- Выберите группу --</option>
                  {allGroups.map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!accessGroupId && (
                  <div className="text-center text-gray-400 font-bold py-12">Выберите группу, чтобы настроить доступ к модулям</div>
                )}
                {accessGroupId && isAccessLoading && (
                  <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" /> Загружаем настройки...
                  </div>
                )}
                {accessGroupId && !isAccessLoading && (
                  <div className="space-y-3">
                    {(accessModalCourse.themes || []).map((theme: any) => {
                      const row = themeAccessMap[theme.id] || { unlock_date: '', deadline: '' };
                      return (
                        <div key={theme.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <div className="font-black text-gray-800 mb-3">Модуль {theme.order_index}. {theme.title}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 block flex items-center gap-1">
                                📅 Открыть с
                              </label>
                              <input
                                type="datetime-local"
                                value={row.unlock_date}
                                onChange={e => setThemeAccessMap(m => ({ ...m, [theme.id]: { ...row, unlock_date: e.target.value } }))}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 block flex items-center gap-1">
                                ⏰ Срок сдачи
                              </label>
                              <input
                                type="datetime-local"
                                value={row.deadline}
                                onChange={e => setThemeAccessMap(m => ({ ...m, [theme.id]: { ...row, deadline: e.target.value } }))}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleSaveThemeAccess(theme.id)}
                            disabled={isSavingAccess}
                            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isSavingAccess ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Сохранить
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {accessGroupId && !isAccessLoading && (
                <div className="p-6 border-t border-gray-100 shrink-0">
                  <button
                    onClick={handleSaveAllAccess}
                    disabled={isSavingAccess}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingAccess ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Сохранить все модули
                  </button>
                  <p className="text-xs text-gray-400 font-medium text-center mt-2">Дедлайны автоматически создадут события в расписании</p>
                </div>
              )}
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