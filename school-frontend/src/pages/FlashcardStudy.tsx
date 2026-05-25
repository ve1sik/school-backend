import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, RotateCcw, ChevronLeft, Layers, BookOpen, Loader2, Trophy, Zap } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = 'https://prepodmgy.ru/api';

interface Card {
  id: string;
  front: string;
  back: string;
  isNew: boolean;
  deck: { title: string };
}

interface Stats {
  totalLearned: number;
  dueTodayCount: number;
  newCount: number;
  streak: number;
}

interface Deck {
  id: string;
  title: string;
  _count: { cards: number };
}

type Phase = 'home' | 'study' | 'done';
type Rating = 0 | 1 | 2;

const RATINGS: { rating: Rating; label: string; color: string; bg: string }[] = [
  { rating: 0, label: 'Не вспомнил', color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100 border-red-200' },
  { rating: 1, label: 'С трудом', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200', color: 'text-amber-600' },
  { rating: 2, label: 'Легко!', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', color: 'text-emerald-600' },
];

export default function FlashcardStudy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deckIdParam = searchParams.get('deckId') ?? undefined;

  const [phase, setPhase] = useState<Phase>('home');
  const [stats, setStats] = useState<Stats | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ easy: 0, hard: 0, forgot: 0 });
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>(deckIdParam);
  const [direction, setDirection] = useState<1 | -1>(1);

  const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchHome = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, decksRes] = await Promise.all([
        axios.get(`${API_URL}/flashcards/stats`, cfg()),
        axios.get(`${API_URL}/decks`, cfg()),
      ]);
      setStats(statsRes.data);
      setDecks(decksRes.data);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchHome(); }, [fetchHome]);

  const startStudy = async (deckId?: string) => {
    setIsLoading(true);
    try {
      const url = deckId ? `${API_URL}/flashcards/due?deckId=${deckId}` : `${API_URL}/flashcards/due`;
      const res = await axios.get(url, cfg());
      const all: Card[] = [...res.data.review, ...res.data.new];
      if (!all.length) { setPhase('done'); setIsLoading(false); return; }
      setQueue(all);
      setCurrentIdx(0);
      setIsFlipped(false);
      setSessionStats({ easy: 0, hard: 0, forgot: 0 });
      setPhase('study');
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (rating: Rating) => {
    const card = queue[currentIdx];
    if (!card) return;

    setSessionStats((s) => ({
      easy: s.easy + (rating === 2 ? 1 : 0),
      hard: s.hard + (rating === 1 ? 1 : 0),
      forgot: s.forgot + (rating === 0 ? 1 : 0),
    }));

    try {
      await axios.post(`${API_URL}/flashcards/review`, { flashcardId: card.id, rating }, cfg());
    } catch { /* silent */ }

    // Если "не вспомнил" — добавить карточку в конец очереди
    if (rating === 0) {
      setQueue((q) => [...q, card]);
    }

    setDirection(1);
    setIsFlipped(false);

    setTimeout(() => {
      if (currentIdx + 1 >= queue.length) {
        setPhase('done');
        fetchHome();
      } else {
        setCurrentIdx((i) => i + 1);
      }
    }, 150);
  };

  const current = queue[currentIdx];
  const progress = queue.length ? Math.round((currentIdx / queue.length) * 100) : 0;

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
    </div>
  );

  // ── DONE SCREEN ──
  if (phase === 'done') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-12 max-w-md w-full text-center shadow-2xl shadow-indigo-100">
        <div className="text-7xl mb-6">🔥</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Ты мощь!</h1>
        <p className="text-gray-500 font-medium mb-8">Все карточки на сегодня пройдены</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="text-2xl font-black text-emerald-600">{sessionStats.easy}</div>
            <div className="text-xs font-bold text-emerald-500 mt-1">Легко</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4">
            <div className="text-2xl font-black text-amber-600">{sessionStats.hard}</div>
            <div className="text-xs font-bold text-amber-500 mt-1">С трудом</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <div className="text-2xl font-black text-red-600">{sessionStats.forgot}</div>
            <div className="text-xs font-bold text-red-500 mt-1">Не вспомнил</div>
          </div>
        </div>

        {stats && (
          <div className="flex items-center justify-center gap-2 mb-8 px-4 py-3 bg-orange-50 rounded-2xl">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-black text-orange-700">{stats.streak + 1} день подряд!</span>
          </div>
        )}

        <div className="space-y-3">
          <button onClick={() => startStudy(selectedDeckId)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all active:scale-95 flex items-center justify-center gap-2">
            <RotateCcw className="w-5 h-5" /> Повторить ещё раз
          </button>
          <button onClick={() => { setPhase('home'); fetchHome(); }}
            className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black transition-all">
            На главную
          </button>
        </div>
      </motion.div>
    </div>
  );

  // ── HOME SCREEN ──
  if (phase === 'home') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold mb-8 transition-colors">
          <ChevronLeft className="w-5 h-5" /> Назад
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Флеш-карточки</h1>
            <p className="text-gray-500 font-medium">Активное запоминание</p>
          </div>
        </div>

        {/* STATS STRIP */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Новых</span>
              </div>
              <div className="text-3xl font-black text-indigo-600">{stats.newCount}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Повтор</span>
              </div>
              <div className="text-3xl font-black text-amber-600">{stats.dueTodayCount}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Стрик</span>
              </div>
              <div className="text-3xl font-black text-orange-600">{stats.streak} <span className="text-base">🔥</span></div>
            </div>
          </div>
        )}

        {/* START ALL */}
        <button onClick={() => startStudy(undefined)}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-6">
          <Star className="w-6 h-6" />
          Начать сессию ({(stats?.newCount ?? 0) + (stats?.dueTodayCount ?? 0)} карточек)
        </button>

        {/* DECK LIST */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest px-1 mb-4">Или выберите колоду</h2>
          {decks.map((deck) => (
            <button key={deck.id} onClick={() => { setSelectedDeckId(deck.id); startStudy(deck.id); }}
              className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left flex items-center gap-4 group">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <BookOpen className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900">{deck.title}</p>
                <p className="text-sm text-gray-400 font-medium">{deck._count.cards} карточек</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>

        {stats && stats.totalLearned > 0 && (
          <div className="mt-6 flex items-center gap-3 px-5 py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-700 text-sm">Всего выучено: <strong>{stats.totalLearned}</strong> карточек</span>
          </div>
        )}
      </div>
    </div>
  );

  // ── STUDY SCREEN ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col">

      {/* TOP BAR */}
      <div className="flex items-center gap-4 p-4 md:p-6">
        <button onClick={() => { setPhase('home'); fetchHome(); }}
          className="p-2 text-white/60 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-indigo-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <span className="text-white/60 font-bold text-sm">{currentIdx + 1}/{queue.length}</span>
      </div>

      {/* CARD AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 gap-8">
        {current && (
          <>
            <p className="text-white/40 font-bold text-xs uppercase tracking-widest">{current.deck.title}</p>

            {/* 3D FLIP CARD */}
            <div className="w-full max-w-lg h-72 cursor-pointer" style={{ perspective: '1000px' }}
              onClick={() => !isFlipped && setIsFlipped(true)}>
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
                style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
              >
                {/* FRONT */}
                <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                  className="bg-white rounded-[2rem] flex flex-col items-center justify-center p-8 shadow-2xl shadow-black/30">
                  <div className="absolute top-4 left-4 px-3 py-1 bg-indigo-50 rounded-full text-indigo-500 text-xs font-black">Вопрос</div>
                  <p className="text-2xl md:text-3xl font-black text-gray-900 text-center leading-tight">{current.front}</p>
                  <p className="mt-6 text-sm text-gray-400 font-medium">Нажми, чтобы увидеть ответ</p>
                </div>

                {/* BACK */}
                <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
                  className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2rem] flex flex-col items-center justify-center p-8 shadow-2xl shadow-black/30">
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-black">Ответ</div>
                  <p className="text-2xl md:text-3xl font-black text-white text-center leading-tight">{current.back}</p>
                </div>
              </motion.div>
            </div>

            {/* RATING BUTTONS */}
            <AnimatePresence>
              {isFlipped && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="w-full max-w-lg grid grid-cols-3 gap-3">
                  {RATINGS.map(({ rating, label, color, bg }) => (
                    <button key={rating} onClick={() => handleRate(rating)}
                      className={`py-4 rounded-2xl font-black border-2 transition-all active:scale-95 ${bg} ${color}`}>
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!isFlipped && (
              <p className="text-white/30 font-medium text-sm">Сначала вспомни ответ, затем переверни карточку</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
