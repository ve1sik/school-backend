import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Edit3, ChevronRight, Layers, X, Check, GripVertical, Loader2, Save, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://prepodmgy.ru/api';

interface Flashcard {
  id?: string;
  front: string;
  back: string;
  front_image?: string;
  back_image?: string;
}

interface Deck {
  id: string;
  title: string;
  description?: string;
  lesson_id?: string;
  lesson?: { id: string; title: string };
  _count: { cards: number };
}

interface Lesson {
  id: string;
  title: string;
}

export default function AdminDecks() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [form, setForm] = useState({ title: '', description: '', lesson_id: '' });

  const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [decksRes, lessonsRes] = await Promise.all([
        axios.get(`${API_URL}/decks`, cfg()),
        axios.get(`${API_URL}/lessons`, cfg()).catch(() => ({ data: [] })),
      ]);
      setDecks(decksRes.data);
      setLessons(lessonsRes.data);
    } catch {
      showToast('Ошибка загрузки', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeck = async (deck: Deck) => {
    setSelectedDeck(deck);
    try {
      const res = await axios.get(`${API_URL}/decks/${deck.id}`, cfg());
      const fetched = res.data.cards as Flashcard[];
      setCards(fetched.length ? fetched : [{ front: '', back: '' }]);
    } catch {
      setCards([{ front: '', back: '' }]);
    }
  };

  const handleCardChange = (idx: number, field: 'front' | 'back' | 'front_image' | 'back_image', value: string) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleCardImageUpload = async (idx: number, field: 'front_image' | 'back_image', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const url = res.data.url;
      handleCardChange(idx, field, url);
    } catch {
      showToast('Ошибка загрузки изображения', 'error');
    }
  };

  const addCard = () => setCards((prev) => [...prev, { front: '', back: '' }]);

  const removeCard = (idx: number) => {
    if (cards.length === 1) return;
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCards = async () => {
    if (!selectedDeck) return;
    const valid = cards.filter((c) => c.front.trim() || c.front_image);
    if (!valid.length) { showToast('Заполните хотя бы одну карточку', 'error'); return; }

    setIsSaving(true);
    try {
      await axios.post(`${API_URL}/decks/${selectedDeck.id}/cards/bulk`, { cards: valid }, cfg());
      showToast('Карточки сохранены!');
      fetchAll();
    } catch {
      showToast('Ошибка сохранения', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingDeck(null);
    setForm({ title: '', description: '', lesson_id: '' });
    setShowCreateModal(true);
  };

  const openEditModal = (deck: Deck) => {
    setEditingDeck(deck);
    setForm({ title: deck.title, description: deck.description ?? '', lesson_id: deck.lesson_id ?? '' });
    setShowCreateModal(true);
  };

  const handleSaveDeck = async () => {
    if (!form.title.trim()) { showToast('Введите название', 'error'); return; }
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        lesson_id: form.lesson_id || null,
      };
      if (editingDeck) {
        await axios.patch(`${API_URL}/decks/${editingDeck.id}`, payload, cfg());
        showToast('Колода обновлена!');
      } else {
        await axios.post(`${API_URL}/decks`, payload, cfg());
        showToast('Колода создана!');
      }
      setShowCreateModal(false);
      fetchAll();
    } catch {
      showToast('Ошибка сохранения', 'error');
    }
  };

  const handleDeleteDeck = async (id: string) => {
    if (!confirm('Удалить колоду и все карточки?')) return;
    try {
      await axios.delete(`${API_URL}/decks/${id}`, cfg());
      showToast('Колода удалена!');
      if (selectedDeck?.id === id) setSelectedDeck(null);
      fetchAll();
    } catch {
      showToast('Ошибка удаления', 'error');
    }
  };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#F4F7FE]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col sticky top-4 z-10 shadow-xl shrink-0 self-start max-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] ml-4">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50 shrink-0">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">Карточки</span>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Колоды</span>
            <button onClick={openCreateModal} className="p-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4 text-indigo-600" />
            </button>
          </div>

          {decks.map((deck) => (
            <div key={deck.id} className={`group flex items-center gap-2 w-full text-left p-3 rounded-xl transition-all border cursor-pointer ${selectedDeck?.id === deck.id ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200'}`}
              onClick={() => openDeck(deck)}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{deck.title}</p>
                <p className="text-xs text-gray-400 font-medium">{deck._count.cards} карточек</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); openEditModal(deck); }}
                  className="p-1 text-gray-400 hover:text-indigo-500 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {decks.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">Нет колод</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-3 px-5 py-4 w-full text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" /> Назад в админку
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">
        {!selectedDeck ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Layers className="w-24 h-24 opacity-10 mb-4" />
            <p className="text-xl font-black">Выберите колоду</p>
            <p className="text-sm font-medium mt-1">или создайте новую</p>
            <button onClick={openCreateModal} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" /> Создать колоду
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-gray-900">{selectedDeck.title}</h1>
                {selectedDeck.description && <p className="text-gray-500 font-medium mt-1">{selectedDeck.description}</p>}
                {selectedDeck.lesson && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                    <BookOpen className="w-3 h-3" /> {selectedDeck.lesson.title}
                  </span>
                )}
              </div>
              <button onClick={saveCards} disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-60">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Сохранить
              </button>
            </div>

            {/* CARDS LIST */}
            <div className="space-y-4">
              {cards.map((card, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-gray-400">Карточка {idx + 1}</span>
                    <button onClick={() => removeCard(idx)} disabled={cards.length === 1}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ЛИЦЕВАЯ СТОРОНА */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Лицевая сторона</p>
                      {card.front_image && (
                        <div className="relative group">
                          <img src={card.front_image.startsWith('http') ? card.front_image : `${API_URL.replace('/api','')}/${card.front_image}`}
                            alt="front" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                          <button type="button" onClick={() => handleCardChange(idx, 'front_image', '')}
                            className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <textarea
                        value={card.front}
                        onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                        placeholder="Вопрос / термин / дата…"
                        rows={2}
                        className="w-full p-3 bg-gray-50 rounded-xl resize-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-medium text-gray-800 placeholder:text-gray-300 border border-transparent focus:border-indigo-400"
                      />
                      <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-500 cursor-pointer hover:bg-indigo-100 transition-colors w-fit">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {card.front_image ? 'Заменить картинку' : 'Добавить картинку'}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { if (e.target.files?.[0]) handleCardImageUpload(idx, 'front_image', e.target.files[0]); }} />
                      </label>
                    </div>
                    {/* ОБОРОТНАЯ СТОРОНА */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Оборотная сторона (ответ)</p>
                      {card.back_image && (
                        <div className="relative group">
                          <img src={card.back_image.startsWith('http') ? card.back_image : `${API_URL.replace('/api','')}/${card.back_image}`}
                            alt="back" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                          <button type="button" onClick={() => handleCardChange(idx, 'back_image', '')}
                            className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <textarea
                        value={card.back}
                        onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                        placeholder="Ответ…"
                        rows={2}
                        className="w-full p-3 bg-gray-50 rounded-xl resize-none outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-all text-sm font-medium text-gray-800 placeholder:text-gray-300 border border-transparent focus:border-emerald-400"
                      />
                      <label className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-500 cursor-pointer hover:bg-emerald-100 transition-colors w-fit">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {card.back_image ? 'Заменить картинку' : 'Добавить картинку'}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { if (e.target.files?.[0]) handleCardImageUpload(idx, 'back_image', e.target.files[0]); }} />
                      </label>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button onClick={addCard}
              className="mt-4 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-indigo-300 hover:text-indigo-500 font-bold transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Добавить карточку
            </button>
          </div>
        )}
      </main>

      {/* MODAL CREATE/EDIT */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowCreateModal(false)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <Layers className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black mb-6">{editingDeck ? 'Редактировать колоду' : 'Новая колода'}</h3>

              <div className="space-y-4">
                <input type="text" placeholder="Название колоды *" value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-bold text-gray-800 border border-transparent focus:border-indigo-400" />
                <input type="text" placeholder="Описание (необязательно)" value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-medium text-gray-800 border border-transparent focus:border-indigo-400" />
                <select value={form.lesson_id} onChange={(e) => setForm((f) => ({ ...f, lesson_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-medium text-gray-700 border border-transparent focus:border-indigo-400 cursor-pointer">
                  <option value="">Без привязки к уроку</option>
                  {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>

              <button onClick={handleSaveDeck} className="mt-6 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> {editingDeck ? 'Сохранить' : 'Создать'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.3 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            {toast.type === 'success' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
