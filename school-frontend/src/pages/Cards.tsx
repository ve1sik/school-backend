import { Layers, PlayCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Cards() {
  const decks = [
    { id: 1, title: 'Ударения: ТОП-100 слов', count: 100, progress: 25, color: 'from-[#5A4BFF] to-[#00FFCC]' },
    { id: 2, title: 'Словарные слова (Исключения)', count: 50, progress: 0, color: 'from-orange-500 to-rose-500' },
    { id: 3, title: 'Термины для сочинения', count: 30, progress: 100, color: 'from-emerald-400 to-teal-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3 mb-2">
          Умные карточки <Layers className="text-[#5A4BFF] w-8 h-8" />
        </h1>
        <p className="text-gray-500 font-medium">Интервальное повторение для идеального запоминания.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {decks.map((deck, i) => (
          <motion.div key={deck.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="relative group">
            {/* Тень-подложка для эффекта "колоды" карточек */}
            <div className="absolute inset-0 bg-gray-200 rounded-[2.5rem] translate-y-3 translate-x-2 -z-10 group-hover:translate-y-4 group-hover:translate-x-3 transition-transform"></div>
            <div className="absolute inset-0 bg-gray-300 rounded-[2.5rem] translate-y-1.5 translate-x-1 -z-10 group-hover:translate-y-2 group-hover:translate-x-1.5 transition-transform"></div>
            
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col">
              <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${deck.color}`}></div>
              
              <div className="flex justify-between items-start mb-8 mt-2">
                <div className="bg-gray-50 px-4 py-2 rounded-xl text-sm font-black text-gray-500 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> {deck.count} карточек
                </div>
                {deck.progress === 100 && <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />}
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-6">{deck.title}</h3>
              
              {/* Прогресс-бар */}
              <div className="mt-auto mb-8">
                <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                  <span>Прогресс</span>
                  <span>{deck.progress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${deck.color}`} style={{ width: `${deck.progress}%` }}></div>
                </div>
              </div>

              <button className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black transition-all active:scale-95 flex justify-center items-center gap-2">
                <PlayCircle className="w-5 h-5" /> {deck.progress > 0 && deck.progress < 100 ? 'ПРОДОЛЖИТЬ' : 'ТРЕНИРОВАТЬ'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}