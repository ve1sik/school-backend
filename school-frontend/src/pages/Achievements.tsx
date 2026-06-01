import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Star, Target, Crown, Medal, Zap } from 'lucide-react';
import { cachedGet, API_URL } from '../lib/api';

interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  earned: boolean;
}

interface Profile {
  points: number;
  level: number;
  pointsIntoLevel: number;
  pointsPerLevel: number;
  streak: number;
  completedCount: number;
  perfectCount: number;
  achievements: Achievement[];
}

interface LeaderRow {
  rank: number;
  id: string;
  name?: string;
  surname?: string;
  avatar?: string;
  points: number;
  isMe: boolean;
}

const avatarUrl = (a?: string) =>
  !a ? null : a.startsWith('http') ? a : `${API_URL.replace('/api', '')}/${a}`;

export default function Achievements() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, l] = await Promise.all([
          cachedGet<Profile>('/gamification/profile', 10000),
          cachedGet<LeaderRow[]>('/gamification/leaderboard', 10000),
        ]);
        setProfile(p);
        setLeaders(Array.isArray(l) ? l : []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-[#5A4BFF]/20 border-t-[#5A4BFF] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-32 text-center text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-bold">Не удалось загрузить достижения</p>
      </div>
    );
  }

  const levelPct = Math.round((profile.pointsIntoLevel / profile.pointsPerLevel) * 100);
  const earned = profile.achievements.filter((a) => a.earned);
  const locked = profile.achievements.filter((a) => !a.earned);

  return (
    <div className="max-w-5xl mx-auto pt-2 pb-24 md:pb-10">
      {/* HERO: уровень / очки / стрик */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5A4BFF] to-[#7C6BFF] p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/20"
      >
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full" />
        <div className="absolute -right-4 bottom-0 opacity-20">
          <Trophy className="w-32 h-32" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/15 backdrop-blur rounded-2xl flex flex-col items-center justify-center shrink-0 border border-white/20">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Уровень</span>
              <span className="text-2xl sm:text-3xl font-black leading-none">{profile.level}</span>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black leading-none">{profile.points}</p>
              <p className="text-sm font-bold opacity-80 mt-1">очков опыта</p>
            </div>
          </div>

          <div className="flex-1 sm:max-w-xs sm:ml-auto">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5 opacity-90">
              <span>До {profile.level + 1} уровня</span>
              <span>{profile.pointsIntoLevel}/{profile.pointsPerLevel}</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <div className="flex items-center gap-2 mt-3 bg-white/15 rounded-xl px-3 py-2 w-fit">
              <Flame className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-black">{profile.streak}</span>
              <span className="text-xs font-bold opacity-80">
                {profile.streak === 1 ? 'день подряд' : 'дней подряд'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* СТАТЫ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
        <StatCard icon={<Target className="w-5 h-5" />} value={profile.completedCount} label="Выполнено работ" tone="indigo" />
        <StatCard icon={<Star className="w-5 h-5" />} value={profile.perfectCount} label="Идеальных ответов" tone="amber" />
        <StatCard icon={<Trophy className="w-5 h-5" />} value={earned.length} label="Достижений" tone="emerald" />
      </div>

      {/* ДОСТИЖЕНИЯ */}
      <div className="mt-8">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
          <Medal className="w-5 h-5 text-[#5A4BFF]" /> Достижения
          <span className="text-sm font-bold text-gray-400">{earned.length}/{profile.achievements.length}</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...earned, ...locked].map((a, i) => (
            <motion.div
              key={a.code}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={`relative rounded-2xl p-4 border transition-all ${
                a.earned
                  ? 'bg-white border-gray-100 shadow-sm'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${
                  a.earned ? 'bg-[#EEF2FF]' : 'bg-gray-100 grayscale opacity-50'
                }`}
              >
                {a.icon}
              </div>
              <p className={`font-black text-sm leading-tight ${a.earned ? 'text-gray-900' : 'text-gray-400'}`}>
                {a.title}
              </p>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5 leading-snug">{a.description}</p>

              {!a.earned && (
                <div className="mt-2.5">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5A4BFF]/50 rounded-full"
                      style={{ width: `${Math.round((a.progress / a.target) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{a.progress}/{a.target}</p>
                </div>
              )}

              {a.earned && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ЛИДЕРБОРД */}
      <div className="mt-8">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-amber-500" /> Таблица лидеров
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {leaders.length === 0 && (
            <div className="py-10 text-center text-gray-400">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="font-bold text-sm">Пока пусто — будь первым!</p>
            </div>
          )}
          {leaders.map((row) => {
            const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null;
            const url = avatarUrl(row.avatar);
            return (
              <div
                key={row.id}
                className={`flex items-center gap-3 px-4 py-3 ${row.isMe ? 'bg-[#5A4BFF]/5' : ''}`}
              >
                <div className="w-7 text-center font-black text-gray-400 shrink-0">
                  {medal || row.rank}
                </div>
                <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#5A4BFF] font-black text-xs shrink-0 overflow-hidden">
                  {url ? (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${(row.name?.[0] || '').toUpperCase()}${(row.surname?.[0] || '').toUpperCase()}` || '?'
                  )}
                </div>
                <span className={`flex-1 min-w-0 truncate text-sm font-bold ${row.isMe ? 'text-[#5A4BFF]' : 'text-gray-900'}`}>
                  {`${row.name || ''} ${row.surname || ''}`.trim() || 'Ученик'}
                  {row.isMe && <span className="ml-2 text-[10px] font-black text-[#5A4BFF] uppercase">вы</span>}
                </span>
                <span className="font-black text-gray-900 shrink-0">{row.points}</span>
                <span className="text-[10px] font-bold text-gray-400 shrink-0">очк.</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  tone: 'indigo' | 'amber' | 'emerald';
}) {
  const tones = {
    indigo: 'bg-[#EEF2FF] text-[#5A4BFF]',
    amber: 'bg-amber-50 text-amber-500',
    emerald: 'bg-emerald-50 text-emerald-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] font-bold text-gray-400 mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}
