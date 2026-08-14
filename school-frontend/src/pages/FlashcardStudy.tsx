import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, RotateCcw, ChevronLeft, ChevronRight, Layers, BookOpen, Loader2, Trophy, Zap } from 'lucide-react';
import axios from 'axios';
import { getTokenConfig } from '../lib/auth';
import { useSearchParams } from 'react-router-dom';

import { API_URL, resolveUploadUrl } from '../lib/api';

interface Card {
  id: string;
  front: string;
  back: string;
  front_image?: string;
  back_image?: string;
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

function cardImageUrl(src?: string) {
  if (!src) return '';
  return src.startsWith('http') ? src : resolveUploadUrl(src);
}

function cardsWord(n: number) {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return 'карточек';
  if (d === 1) return 'карточка';
  if (d >= 2 && d <= 4) return 'карточки';
  return 'карточек';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardStudy() {
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
  const lastQueueRef = useRef<Card[]>([]);
  const lastDeckIdRef = useRef<string | undefined>(deckIdParam);

  const cfg = () => getTokenConfig();

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

  /** Load cards for a deck (works even if /practice not deployed yet). */
  const fetchDeckCards = async (deckId: string): Promise<Card[]> => {
    const res = await axios.get(`${API_URL}/decks/${deckId}`, cfg());
    const title = res.data?.title || 'Колода';
    return (res.data?.cards || []).map((c: any) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      front_image: c.front_image,
      back_image: c.back_image,
      isNew: false,
      deck: { title },
    }));
  };

  const beginQueue = (cards: Card[], deckId?: string) => {
    const next = shuffle(cards);
    lastQueueRef.current = next;
    if (deckId) {
      lastDeckIdRef.current = deckId;
      setSelectedDeckId(deckId);
    }
    setQueue(next);
    setCurrentIdx(0);
    setIsFlipped(false);
    setSessionStats({ easy: 0, hard: 0, forgot: 0 });
    setPhase('study');
  };

  const startStudy = async (deckId?: string, opts?: { practice?: boolean }) => {
    const id = deckId || lastDeckIdRef.current || selectedDeckId;
    const wantPractice = !!opts?.practice;
    setIsLoading(true);
    try {
      // 1) Explicit practice / repeat — prefer deck cards (always available on prod)
      if (wantPractice) {
        if (id) {
          try {
            const deckCards = await fetchDeckCards(id);
            if (deckCards.length) {
              beginQueue(deckCards, id);
              return;
            }
          } catch { /* fall through */ }
        }
        try {
          const url = id ? `${API_URL}/flashcards/practice?deckId=${id}` : `${API_URL}/flashcards/practice`;
          const res = await axios.get(url, cfg());
          const all: Card[] = [...(res.data.review || []), ...(res.data.new || [])];
          if (all.length) {
            beginQueue(all, id);
            return;
          }
        } catch { /* fall through */ }
        if (lastQueueRef.current.length) {
          beginQueue(lastQueueRef.current, id);
          return;
        }
        setPhase('done');
        return;
      }

      // 2) Normal due session
      const dueUrl = id ? `${API_URL}/flashcards/due?deckId=${id}` : `${API_URL}/flashcards/due`;
      const res = await axios.get(dueUrl, cfg());
      let all: Card[] = [...(res.data.review || []), ...(res.data.new || [])];

      // If this deck has no due cards today — open full deck for practice
      if (!all.length && id) {
        try {
          all = await fetchDeckCards(id);
        } catch { /* ignore */ }
      }

      if (!all.length) {
        setPhase('done');
        return;
      }
      beginQueue(all, id);
    } catch {
      // Last resort: replay last session
      if (lastQueueRef.current.length) {
        beginQueue(lastQueueRef.current, id);
      } else {
        setPhase('done');
      }
    } finally {
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
    <div className="flex items-center justify-center min-h-[50vh] bg-[#F4F7FE]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
    </div>
  );

  // ── DONE SCREEN ──
  if (phase === 'done') return (
    <div className="bg-[#F4F7FE] flex items-center justify-center p-4 min-h-[60vh]">
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
          <button
            type="button"
            onClick={() => startStudy(selectedDeckId || lastDeckIdRef.current, { practice: true })}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Повторить ещё раз
          </button>
          <button
            type="button"
            onClick={() => { setPhase('home'); fetchHome(); }}
            className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black transition-all"
          >
            К колодам
          </button>
        </div>
      </motion.div>
    </div>
  );

  // ── HOME SCREEN ──
  if (phase === 'home') return (
    <div className="bg-[#F4F7FE] flex flex-col lg:flex-row gap-3 lg:gap-4 p-3 md:p-4 max-h-[calc(100dvh-5.5rem)] overflow-hidden">

      {/* БОКОВАЯ ПАНЕЛЬ — как в CourseView */}
      <aside className="w-full lg:w-[260px] xl:w-[280px] bg-white rounded-3xl border border-gray-100 flex flex-col h-auto max-h-[38vh] lg:max-h-full lg:h-full shrink-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">Флеш-карточки</h1>
              <p className="text-xs text-gray-400 font-medium">Активное запоминание</p>
            </div>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="p-4 border-b border-gray-100 shrink-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Сегодня</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-50">
                <span className="flex items-center gap-2 text-xs font-bold text-indigo-600"><Zap className="w-3.5 h-3.5" /> Новых</span>
                <span className="font-black text-indigo-700 text-sm">{stats.newCount}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-600"><RotateCcw className="w-3.5 h-3.5" /> Повтор</span>
                <span className="font-black text-amber-700 text-sm">{stats.dueTodayCount}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-orange-50">
                <span className="flex items-center gap-2 text-xs font-bold text-orange-600"><Flame className="w-3.5 h-3.5" /> Стрик</span>
                <span className="font-black text-orange-700 text-sm">{stats.streak} 🔥</span>
              </div>
            </div>
          </div>
        )}

        {/* Список колод */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Колоды</p>
          <div className="space-y-2">
            {decks.map((deck) => (
              <button key={deck.id} type="button" onClick={() => { lastDeckIdRef.current = deck.id; setSelectedDeckId(deck.id); startStudy(deck.id); }}
                className="w-full bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-2xl p-4 transition-all text-left flex items-center gap-3 group">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0 border border-gray-100">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{deck.title}</p>
                  <p className="text-xs text-gray-400 font-medium">{deck._count.cards} {cardsWord(deck._count.cards)}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-indigo-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {stats && stats.totalLearned > 0 && (
          <div className="p-4 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-2xl">
              <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-emerald-700 text-xs">Выучено: <strong>{stats.totalLearned}</strong> карточек</span>
            </div>
          </div>
        )}
      </aside>

      {/* ГЛАВНАЯ ОБЛАСТЬ */}
      <main className="flex-1 w-full bg-white rounded-3xl lg:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center p-6 md:p-8 overflow-visible lg:overflow-auto min-h-[50vh] lg:min-h-0">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-200 mx-auto mb-8">
            <Layers className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-3">Готов учиться?</h2>
          <p className="text-gray-500 font-medium mb-4">
            {(stats?.newCount ?? 0) + (stats?.dueTodayCount ?? 0) > 0
              ? `Сегодня ${(stats?.newCount ?? 0) + (stats?.dueTodayCount ?? 0)} карточек на повтор`
              : 'Все карточки на сегодня пройдены 🎉'}
          </p>

          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-indigo-50 rounded-2xl p-4">
                <div className="text-3xl font-black text-indigo-600">{stats.newCount}</div>
                <div className="text-xs font-bold text-indigo-400 mt-1">Новых</div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4">
                <div className="text-3xl font-black text-amber-600">{stats.dueTodayCount}</div>
                <div className="text-xs font-bold text-amber-400 mt-1">Повтор</div>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4">
                <div className="text-3xl font-black text-orange-600">{stats.streak} 🔥</div>
                <div className="text-xs font-bold text-orange-400 mt-1">Стрик</div>
              </div>
            </div>
          )}

          <button onClick={() => startStudy(undefined)}
            disabled={(stats?.newCount ?? 0) + (stats?.dueTodayCount ?? 0) === 0}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
            <Star className="w-6 h-6" />
            Начать сессию
          </button>

          <p className="text-xs text-gray-400 font-medium mt-4">или выберите колоду в боковой панели</p>
        </div>
      </main>
    </div>
  );


  // ── STUDY SCREEN ──
  return (
    <div className="h-[calc(100dvh-5.5rem)] bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col rounded-[2rem] overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center gap-4 p-3 md:p-4 shrink-0">
        <button type="button" onClick={() => { setPhase('home'); fetchHome(); }}
          className="p-2 text-white/60 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-indigo-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <span className="text-white/60 font-bold text-sm">{currentIdx + 1}/{queue.length}</span>
      </div>

      {/* CARD AREA */}
      <div className="flex-1 min-h-0 flex flex-col items-center p-3 md:p-4 gap-3">
        {current && (
          <>
            <p className="text-white/40 font-bold text-xs uppercase tracking-widest shrink-0">{current.deck.title}</p>

            {/* 3D FLIP CARD — faces use separate layer; badge in flow (not over image) */}
            <div
              className="flex-1 min-h-0 w-full max-w-4xl cursor-pointer"
              style={{ perspective: '1200px' }}
              onClick={() => !isFlipped && setIsFlipped(true)}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* FRONT */}
                <div
                  className="absolute inset-0 bg-white rounded-[2rem] flex flex-col min-h-0 shadow-2xl shadow-black/30 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)',
                  }}
                >
                  <div className="shrink-0 px-5 pt-4 pb-2 flex items-center justify-between gap-2 border-b border-gray-100">
                    <span className="px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 text-[11px] font-bold uppercase tracking-wide">
                      Вопрос
                    </span>
                    {!isFlipped && (
                      <span className="text-[11px] text-gray-400 font-medium">Нажми, чтобы увидеть ответ</span>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-5 py-4 overflow-hidden">
                    {current.front_image && (
                      <div className={`w-full flex items-center justify-center min-h-0 ${current.front ? 'max-h-[62%]' : 'flex-1'}`}>
                        <img
                          src={cardImageUrl(current.front_image)}
                          alt=""
                          className="max-w-full max-h-[min(42vh,320px)] object-contain rounded-xl bg-gray-50 border border-gray-100"
                        />
                      </div>
                    )}
                    {current.front ? (
                      <p className="text-xl md:text-2xl font-extrabold text-gray-900 text-center leading-snug shrink-0 px-2">
                        {current.front}
                      </p>
                    ) : !current.front_image ? (
                      <p className="text-gray-300 font-bold">—</p>
                    ) : null}
                  </div>
                </div>

                {/* BACK — rotateY(180) so text is readable when card is flipped (not mirrored) */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2rem] flex flex-col min-h-0 shadow-2xl shadow-black/30 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="shrink-0 px-5 pt-4 pb-2 flex items-center border-b border-white/15">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[11px] font-bold uppercase tracking-wide">
                      Ответ
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-5 py-4 overflow-hidden">
                    {current.back_image && (
                      <div className={`w-full flex items-center justify-center min-h-0 ${current.back ? 'max-h-[58%]' : 'flex-1'}`}>
                        <img
                          src={cardImageUrl(current.back_image)}
                          alt=""
                          className="max-w-full max-h-[min(42vh,320px)] object-contain rounded-xl bg-white/10 border border-white/20"
                        />
                      </div>
                    )}
                    {current.back ? (
                      <p className="text-2xl md:text-3xl font-extrabold text-white text-center leading-snug shrink-0 px-2">
                        {current.back}
                      </p>
                    ) : !current.back_image ? (
                      <p className="text-white/50 font-bold">—</p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ACTIONS — fixed min-height prevents layout jump */}
            <div className="w-full max-w-lg shrink-0 min-h-[148px] flex flex-col justify-end">
            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="w-full flex flex-col gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleRate(2)}
                    className="w-full py-3.5 rounded-2xl font-bold text-white bg-indigo-500 hover:bg-indigo-400 border-2 border-indigo-300/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
                  >
                    Далее
                    <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {RATINGS.map(({ rating, label, color, bg }) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRate(rating)}
                        className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all active:scale-95 ${bg} ${color}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            {!isFlipped && (
              <p className="text-white/30 font-medium text-xs shrink-0">
                Сначала вспомни ответ, затем переверни карточку
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
