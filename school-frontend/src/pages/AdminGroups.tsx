import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, BookOpen, Loader2, Save, X, Edit3, ShieldCheck, UserCircle, Search, UserCheck, CreditCard, Image as ImageIcon, UploadCloud, Tag, Calendar, ListChecks, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Cropper from 'react-easy-crop';

const API_URL = 'https://prepodmgy.ru/api';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg');
  });
}

export default function AdminGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [curators, setCurators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  // Переименование группы
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCuratorId, setSelectedCuratorId] = useState<string>('');
  
  const [selectedPrice, setSelectedPrice] = useState<number | string>(0);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["", "", ""]);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string>(''); 
  const [isUploading, setIsUploading] = useState(false);

  // СТЕЙТЫ ДЛЯ КРОППЕРА
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [courseSearch, setCourseSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [groupsRes, coursesRes, studentsRes, curatorsRes] = await Promise.all([
        axios.get(`${API_URL}/groups`, getTokenConfig()),
        axios.get(`${API_URL}/courses`, getTokenConfig()),
        axios.get(`${API_URL}/users/students`, getTokenConfig()),
        axios.get(`${API_URL}/users/curators`, getTokenConfig())
      ]);
      setGroups(groupsRes.data);
      setCourses(coursesRes.data);
      setStudents(studentsRes.data);
      setCurators(curatorsRes.data);
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

  const handleRenameGroup = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await axios.patch(`${API_URL}/groups/${id}`, { title: renameValue.trim() }, getTokenConfig());
      setRenamingGroupId(null);
      fetchData();
    } catch {
      alert('Ошибка переименования');
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
      setSelectedStudentIds(res.data.students?.map((s: any) => s.id) || []);
      setSelectedCuratorId(res.data.curator?.id || '');
      
      setSelectedPrice(res.data.price || 0);
      setHasDiscount(res.data.old_price > res.data.price);
      setSelectedBadge(res.data.badge || '');
      setSelectedStartDate(res.data.start_date || ''); 
      
      if (res.data.features && res.data.features.length > 0) {
        setSelectedFeatures(res.data.features);
      } else {
        setSelectedFeatures(["Доступ ко всем урокам", "Проверка ДЗ", "Авторские конспекты"]);
      }
      
      setSelectedCoverUrl(res.data.cover_url || ''); 
      setCourseSearch('');
      setStudentSearch('');
      setShowModal(true);
    } catch (error) {
      console.error("Ошибка загрузки группы", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setRawImage(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(rawImage, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Canvas is empty");

      const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedCoverUrl(res.data.url);
      setRawImage(null);
    } catch (error) {
      console.error("Ошибка при обрезке", error);
      alert("Ошибка при обрезке/загрузке картинки");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...selectedFeatures];
    newFeatures[index] = value;
    setSelectedFeatures(newFeatures);
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const handleSaveGroupSettings = async () => {
    if (!selectedGroup) return;
    try {
      const calculatedOldPrice = hasDiscount ? Math.round(Number(selectedPrice) / 0.75) : 0;

      await Promise.all([
        axios.post(`${API_URL}/groups/${selectedGroup.id}/courses`, { courseIds: selectedCourseIds }, getTokenConfig()),
        axios.post(`${API_URL}/groups/${selectedGroup.id}/students`, { studentIds: selectedStudentIds }, getTokenConfig()),
        axios.patch(`${API_URL}/groups/${selectedGroup.id}`, { 
          curator_id: selectedCuratorId || null,
          price: Number(selectedPrice),
          old_price: calculatedOldPrice,
          badge: selectedBadge,
          start_date: selectedStartDate,
          features: selectedFeatures.filter(f => f.trim() !== ''),
          cover_url: selectedCoverUrl
        }, getTokenConfig())
      ]);
      setShowModal(false);
      fetchData(); 
    } catch (error) {
      console.error("Ошибка сохранения настроек", error);
      alert("Ошибка сохранения.");
    }
  };

  const filteredCourses = courses.filter(course => course.title.toLowerCase().includes(courseSearch.toLowerCase()));
  const filteredStudents = students.filter(student => {
    const searchStr = `${student.name || ''} ${student.surname || ''} ${student.email || ''}`.toLowerCase();
    return searchStr.includes(studentSearch.toLowerCase());
  });

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Потоки и Группы</h1>
          <p className="text-gray-500 font-medium">Управляй учебными потоками, привязывай курсы и назначай учеников.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Users className="w-6 h-6 text-[#5A4BFF]" /> Новая группа</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input type="text" value={newGroupTitle} onChange={(e) => setNewGroupTitle(e.target.value)} placeholder="Напр: ОГЭ История - Сентябрь" className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all font-bold text-gray-700" required />
              <button type="submit" className="w-full py-4 bg-[#5A4BFF] hover:bg-[#4a3dec] text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-500/20">
                <Plus className="w-5 h-5" /> Создать поток
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {groups.length === 0 ? (
            <div className="bg-white p-10 rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
              <Users className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-black text-gray-400">Групп пока нет</h3>
            </div>
          ) : (
            groups.map(group => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={group.id} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group/card">
                <div className="flex items-center gap-6">
                  {group.cover_url ? (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                      <img src={group.cover_url.startsWith('http') ? group.cover_url : `${API_URL.replace('/api', '')}/${group.cover_url}`} alt="Обложка" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                      <ImageIcon className="w-6 h-6 text-indigo-300" />
                    </div>
                  )}
                  <div>
                    {renamingGroupId === group.id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(group.id); if (e.key === 'Escape') setRenamingGroupId(null); }}
                          className="px-3 py-2 bg-gray-50 border-2 border-[#5A4BFF] rounded-xl font-black text-lg text-gray-900 outline-none focus:bg-white"
                        />
                        <button onClick={() => handleRenameGroup(group.id)} className="p-2 bg-[#5A4BFF] text-white rounded-xl hover:bg-[#4a3dec] transition-colors">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRenamingGroupId(null)} className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-black text-gray-900">{group.title}</h3>
                        <button
                          onClick={() => { setRenamingGroupId(group.id); setRenameValue(group.title); }}
                          className="p-1.5 text-gray-300 hover:text-[#5A4BFF] hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Переименовать группу"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                        <Users className="w-4 h-4" /> Учеников: {group._count?.students || 0}
                      </span>
                      <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> {group.price > 0 ? `${group.price} ₽` : 'Бесплатно'}
                      </span>
                    </div>
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

      <AnimatePresence>
        {showModal && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm cursor-pointer"></motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-5xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative z-10 border border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors z-20"><X className="w-5 h-5" /></button>
              
              <h3 className="text-3xl font-black text-gray-900 mb-2 pr-10">{selectedGroup.title}</h3>
              <p className="text-gray-500 font-medium mb-8 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Настройка витрины и доступов</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8">
                
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-3xl p-2 border-2 border-dashed border-gray-200">
                    <div className="relative w-full aspect-video bg-gray-200 rounded-[1.5rem] overflow-hidden group">
                      {selectedCoverUrl ? (
                        <img src={selectedCoverUrl.startsWith('http') ? selectedCoverUrl : `${API_URL.replace('/api', '')}/${selectedCoverUrl}`} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                          <UploadCloud className="w-10 h-10 mb-2" />
                          <span className="text-sm font-bold">Загрузить обложку (16:9)</span>
                        </div>
                      )}
                      
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                        <span className="text-white font-black flex items-center gap-2">
                          <ImageIcon className="w-5 h-5" /> ВЫБРАТЬ ФОТО
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Цена продажи</label>
                      <input type="number" value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} placeholder="5000" className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div className={`p-4 rounded-2xl border flex flex-col justify-center cursor-pointer transition-all ${hasDiscount ? 'bg-red-50/80 border-red-200' : 'bg-gray-50 border-gray-200'}`} onClick={() => setHasDiscount(!hasDiscount)}>
                      <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 flex items-center gap-1 cursor-pointer ${hasDiscount ? 'text-red-600' : 'text-gray-400'}`}>
                        <Percent className="w-3 h-3" /> Авто-скидка 25%
                      </label>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`font-bold text-sm ${hasDiscount ? 'text-gray-900' : 'text-gray-400'}`}>
                          {hasDiscount ? `~~ ${Math.round(Number(selectedPrice) / 0.75)} ₽ ~~` : 'Выключена'}
                        </span>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${hasDiscount ? 'bg-red-400' : 'bg-gray-300'}`}>
                          <motion.div layout className="w-4 h-4 bg-white rounded-full" animate={{ x: hasDiscount ? 16 : 0 }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                      <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Бейдж</label>
                      <input type="text" value={selectedBadge} onChange={(e) => setSelectedBadge(e.target.value)} placeholder="ХИТ / СКОРО СТАРТ" className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Дата старта</label>
                      <input type="date" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 flex flex-col h-full">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ListChecks className="w-4 h-4" /> Что внутри курса (3 факта)</h4>
                    <div className="space-y-3">
                      {[0, 1, 2].map((index) => (
                        <input 
                          key={index} 
                          type="text" 
                          value={selectedFeatures[index] || ''} 
                          onChange={(e) => handleFeatureChange(index, e.target.value)} 
                          placeholder={`Факт №${index + 1} (напр: Авторские конспекты)`} 
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                    <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Назначить куратора</h4>
                    <select value={selectedCuratorId} onChange={(e) => setSelectedCuratorId(e.target.value)} className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer">
                      <option value="">Без куратора</option>
                      {curators.map(c => <option key={c.id} value={c.id}>{c.name || 'Без имени'} {c.surname || ''}</option>)}
                    </select>
                  </div>

                  <button onClick={handleSaveGroupSettings} className="mt-auto w-full py-5 bg-gray-900 hover:bg-[#5A4BFF] text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3">
                    <Save className="w-5 h-5" /> ОПУБЛИКОВАТЬ НА ВИТРИНУ
                  </button>
                </div>

              </div>
              
              <div className="pt-8 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  <div className="flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Доступные курсы</h4>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Поиск курса..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none" />
                      </div>
                    </div>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                      {filteredCourses.map(course => {
                        const isSelected = selectedCourseIds.includes(course.id);
                        return (
                          <div key={course.id} onClick={() => handleToggleCourse(course.id)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'border-[#5A4BFF] bg-indigo-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#5A4BFF] border-[#5A4BFF]' : 'border-gray-300'}`}>
                                {isSelected && <ShieldCheck className="w-4 h-4 text-white" />}
                              </div>
                              <span className={`font-bold ${isSelected ? 'text-[#5A4BFF]' : 'text-gray-700'}`}>{course.title}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Состав группы ({selectedStudentIds.length})</h4>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Поиск по имени или email..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none" />
                      </div>
                    </div>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                      {filteredStudents.map(student => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                          <div key={student.id} onClick={() => handleToggleStudent(student.id)} className={`p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                {isSelected && <ShieldCheck className="w-4 h-4 text-white" />}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                  {student.avatar ? <img src={student.avatar} alt="" className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div className="overflow-hidden">
                                  <p className={`font-bold text-sm leading-tight truncate ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>{student.name || 'Без имени'} {student.surname || ''}</p>
                                  <p className="text-xs text-gray-400 mt-0.5 truncate">{student.email}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rawImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-hidden">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2rem] p-6 w-full max-w-3xl flex flex-col items-center max-h-[95vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black mb-4">Настрой обложку курса</h3>
              <p className="text-gray-500 font-medium mb-6 text-center">
                Передвигай и приближай фото. Управление масштабом супер-плавное.
              </p>
              
              <div className="relative w-full aspect-[16/10] bg-gray-900 rounded-2xl overflow-hidden mb-6 shadow-inner">
                <Cropper
                  image={rawImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                  zoomSpeed={0.1}
                  maxZoom={10}
                  restrictPosition={false}
                />
              </div>

              <div className="w-full space-y-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-black text-gray-700 mb-2">Управление масштабом</h4>
                
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold text-gray-500 w-24">Увеличение</label>
                  <input 
                    type="range" 
                    min={1} 
                    max={10} 
                    step={0.01}
                    value={zoom} 
                    onChange={(e) => setZoom(Number(e.target.value))} 
                    className="flex-1 accent-[#5A4BFF]"
                  />
                  <input 
                    type="number" 
                    value={zoom.toFixed(3)} 
                    step={0.001}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-20 p-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="flex gap-4 w-full shrink-0">
                <button onClick={() => setRawImage(null)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl transition-all active:scale-95 text-sm">
                  ОТМЕНА
                </button>
                <button onClick={handleCropSave} disabled={isUploading} className="flex-1 py-4 bg-[#5A4BFF] hover:bg-black text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-70 text-sm">
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} СОХРАНИТЬ 16:9
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}