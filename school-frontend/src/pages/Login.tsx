import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Loader2, GraduationCap, Users, MessageCircle, User } from 'lucide-react';
import { decodeJwtPayload, setAuthTokens } from '../lib/auth';
import { publicApi } from '../lib/api';

type Mode = 'login' | 'register_student' | 'register_parent';

const inputCls =
  'w-full pl-11 pr-4 py-3.5 bg-[#F7F8FA] border border-gray-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white focus:ring-2 focus:ring-[#6C63FF]/15 font-medium text-gray-800 placeholder:text-gray-400 transition-all';

function VkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.363 1.26 2.174 1.818.613.422 1.078.33 1.078.33l2.163-.03s1.13-.07.594-.958c-.044-.072-.312-.658-1.61-1.86-1.36-1.26-1.177-1.055.46-3.234.997-1.326 1.396-2.136 1.271-2.483-.119-.33-.85-.243-.85-.243l-2.437.015s-.18-.025-.314.056c-.13.078-.214.26-.214.26s-.384 1.022-.895 1.89c-1.078 1.83-1.51 1.928-1.687 1.814-.41-.266-.308-1.07-.308-1.64 0-1.782.27-2.523-.527-2.715-.265-.064-.46-.106-1.138-.113-.87-.009-1.605.003-2.022.207-.278.136-.492.438-.361.456.162.022.528.099.723.364.251.343.242 1.114.242 1.114s.144 2.115-.337 2.377c-.33.18-.783-.187-1.757-1.862-.498-.857-.874-1.806-.874-1.806s-.072-.177-.202-.272c-.157-.115-.377-.151-.377-.151l-2.316.015s-.347.01-.475.16c-.114.134-.009.41-.009.41s1.804 4.222 3.845 6.35c1.872 1.95 3.995 1.822 3.995 1.822h.964z" />
    </svg>
  );
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    surname: '',
    invite_code: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const showTelegramHint =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    /Telegram/i.test(navigator.userAgent);

  const showIosHint =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !showTelegramHint;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let res;
      if (mode === 'login') {
        res = await publicApi.post('/auth/login', { email: formData.email, password: formData.password });
      } else if (mode === 'register_student') {
        res = await publicApi.post('/auth/register', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          surname: formData.surname,
        });
      } else {
        res = await publicApi.post('/auth/register-parent', formData);
      }

      setAuthTokens(res.data.access_token, res.data.refresh_token);
      const payload = decodeJwtPayload<{ role?: string }>(res.data.access_token);
      navigate(payload?.role === 'PARENT' ? '/parent-dashboard' : '/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка доступа');
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    mode === 'login' ? 'Вход' : mode === 'register_student' ? 'Регистрация' : 'Аккаунт родителя';

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {/* Левая колонка — форма */}
      <div className="w-full lg:w-[48%] xl:w-[44%] flex flex-col justify-center items-center px-6 sm:px-10 py-10 relative z-10 bg-white">
        <div className="w-full max-w-[400px]">
          <div className="w-14 h-14 bg-[#6C63FF] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#6C63FF]/25">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-7">{title}</h1>

          {showTelegramHint && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold mb-2">На iPhone сайт лучше открывать в Safari</p>
              <p className="mb-3 leading-relaxed">
                Встроенный браузер Telegram иногда не загружает сайт. Нажмите «⋯» → «Открыть в Safari».
              </p>
              <a
                href="https://prepodmgy.ru/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-[#1A1D26] px-4 py-2 font-bold text-white"
              >
                Открыть в Safari
              </a>
            </div>
          )}

          {showIosHint && (
            <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-bold mb-1">Если страница не загружается</p>
              <p className="leading-relaxed">
                Обновите iOS и откройте сайт в Safari, не из Telegram.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {(mode === 'register_student' || mode === 'register_parent') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    placeholder="Имя"
                    value={formData.name}
                    className={inputCls}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    placeholder="Фамилия"
                    value={formData.surname}
                    className={inputCls}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="Email"
                value={formData.email}
                className={`${inputCls} ${mode === 'login' ? 'border-[#6C63FF]/70' : ''}`}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Пароль (минимум 6 символов)"
                value={formData.password}
                className={inputCls}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {mode === 'register_parent' && (
              <div className="p-4 bg-[#6C63FF]/5 rounded-2xl border-2 border-dashed border-[#6C63FF]/30 text-center">
                <input
                  placeholder="КОД ИЗ ПРОФИЛЯ РЕБЁНКА"
                  className="bg-transparent text-center font-black text-[#6C63FF] placeholder:text-[#6C63FF]/35 outline-none uppercase w-full"
                  onChange={(e) => setFormData({ ...formData, invite_code: e.target.value })}
                />
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-1 bg-[#1A1D26] hover:bg-black text-white rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-7">
              <div className="relative flex items-center mb-4">
                <div className="flex-grow border-t border-gray-200" />
                <span className="flex-shrink mx-3 text-gray-400 text-xs font-medium">или войти через</span>
                <div className="flex-grow border-t border-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm text-[#0077FF]"
                >
                  <VkIcon className="w-5 h-5" /> VK
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm text-[#24A1DE]"
                >
                  <MessageCircle className="w-5 h-5" /> Telegram
                </button>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 text-center">
            {mode === 'login' ? (
              <>
                <p className="text-sm text-gray-500">
                  Нет аккаунта?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register_student')}
                    className="font-bold text-gray-900 hover:text-[#6C63FF]"
                  >
                    Зарегистрироваться
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => setMode('register_parent')}
                  className="text-sm font-bold text-[#6C63FF] inline-flex items-center justify-center gap-2 hover:opacity-80"
                >
                  <Users className="w-4 h-4" /> Я родитель
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm font-bold text-gray-500 hover:text-[#6C63FF]"
              >
                Уже есть аккаунт? Войти
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Правая колонка — сетка + иллюстрация */}
      <div className="hidden lg:flex relative flex-1 min-h-screen items-center justify-center overflow-hidden bg-[#DDE5EF]">
        <svg
          className="absolute left-0 top-0 h-full w-[100px] xl:w-[140px] z-20 pointer-events-none"
          viewBox="0 0 140 900"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M140 0 C70 180, 30 320, 85 470 C130 600, 25 760, 0 900 L0 0 Z" fill="white" />
        </svg>

        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(70,90,120,0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(70,90,120,0.12) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            backgroundColor: '#E4EBF3',
          }}
        />

        <img
          src="/login-hero.png"
          alt=""
          className="relative z-10 max-h-[90vh] w-auto max-w-[min(92%,560px)] object-contain drop-shadow-sm ml-8 xl:ml-12"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
}
