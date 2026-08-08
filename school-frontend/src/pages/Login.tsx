import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Loader2, GraduationCap, Users, MessageCircle, User } from 'lucide-react';
import { decodeJwtPayload, setAuthTokens } from '../lib/auth';
import { publicApi } from '../lib/api';

type Mode = 'login' | 'register_student' | 'register_parent';

/** Figma «Страница – вход» */
const inputBase =
  'w-full pl-11 pr-4 py-[14px] rounded-[12px] outline-none font-medium text-[15px] text-[#1A1D26] placeholder:text-[#A0A4B0] transition-all';
const inputIdle = `${inputBase} bg-[#F3F4F8] border border-transparent focus:bg-white focus:border-[#B8B4FF]`;
const inputActive = `${inputBase} bg-white border border-[#B8B4FF] focus:border-[#6C63FF]`;

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

  const emailLooksActive = mode === 'login';

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden font-sans bg-white lg:bg-[#E8E8EC]">
      {/* Desktop: full-bleed Figma composition — overscan so edges stay flush */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          backgroundColor: '#E8E8EC',
          backgroundImage: 'url(/login-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: 'scale(1.045)',
          transformOrigin: 'center center',
        }}
        aria-hidden
      />

      {/* Mobile background */}
      <div
        className="lg:hidden absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #F0F2FF 0%, #FFFFFF 48%, #FFFFFF 100%)',
        }}
      />

      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center lg:justify-start px-4 sm:px-6 py-8 lg:pl-[7.5%] xl:pl-[9.5%]">
        <div className="w-full max-w-[400px] bg-white border border-[#E5E7EB] rounded-[18px] shadow-[0_10px_36px_rgba(17,24,39,0.10)] px-6 py-8 sm:px-8 sm:py-9">
          <div className="w-12 h-12 bg-[#6C63FF] rounded-[12px] flex items-center justify-center mb-5 mx-auto shadow-[0_6px_18px_rgba(108,99,255,0.32)]">
            <GraduationCap className="w-6 h-6 text-white" strokeWidth={2} />
          </div>

          <h1 className="text-[28px] sm:text-[32px] font-black text-[#111827] mb-6 text-center tracking-tight leading-none">
            {title}
          </h1>

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
              <p className="leading-relaxed">Обновите iOS и откройте сайт в Safari, не из Telegram.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {(mode === 'register_student' || mode === 'register_parent') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A4B0]" />
                  <input
                    required
                    placeholder="Имя"
                    value={formData.name}
                    className={inputIdle}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A4B0]" />
                  <input
                    required
                    placeholder="Фамилия"
                    value={formData.surname}
                    className={inputIdle}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#A0A4B0]" />
              <input
                type="email"
                required
                placeholder="Email"
                value={formData.email}
                className={emailLooksActive ? inputActive : inputIdle}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#A0A4B0]" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Пароль (минимум 6 символов)"
                value={formData.password}
                className={inputIdle}
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
              className="w-full py-[15px] mt-1 bg-[#12151C] hover:bg-black text-white rounded-[12px] font-black uppercase tracking-[0.04em] text-[13px] sm:text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-[18px] h-[18px]" strokeWidth={2.25} />
                  {mode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'}
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6">
              <div className="relative flex items-center mb-4">
                <div className="flex-grow border-t border-[#E6E8EF]" />
                <span className="flex-shrink mx-3 text-[#A0A4B0] text-[11px] font-medium">или войти через</span>
                <div className="flex-grow border-t border-[#E6E8EF]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-[12px] border border-[#E6E8EF] rounded-[12px] bg-white hover:bg-[#F8F9FC] transition-all font-bold text-sm text-[#0077FF]"
                >
                  <VkIcon className="w-5 h-5" /> VK
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-[12px] border border-[#E6E8EF] rounded-[12px] bg-white hover:bg-[#F8F9FC] transition-all font-bold text-sm text-[#24A1DE]"
                >
                  <MessageCircle className="w-5 h-5" /> Telegram
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3.5 text-center">
            {mode === 'login' ? (
              <>
                <p className="text-[14px] text-[#6B7280]">
                  Нет аккаунта?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register_student')}
                    className="font-bold text-[#111827] hover:text-[#6C63FF]"
                  >
                    Зарегистрироваться
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => setMode('register_parent')}
                  className="text-[14px] font-bold text-[#6C63FF] inline-flex items-center justify-center gap-2 hover:opacity-80"
                >
                  <Users className="w-4 h-4" /> Я родитель
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[14px] font-bold text-[#6B7280] hover:text-[#6C63FF]"
              >
                Уже есть аккаунт? Войти
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
