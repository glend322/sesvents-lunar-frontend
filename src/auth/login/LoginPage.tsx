import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, Clock, Info, LoaderCircle, Wifi } from 'lucide-react';
import { TigerMascot, type MascotMood } from '@/components/mascot/TigerMascot';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { APP } from '@/config/app.config';
import { cn } from '@/lib/utils';
import { AUTH } from '../auth.config';
import { isValidEmail, isValidPhone, validateCredentialLengths } from '../auth.service';
import { useAuth } from '../AuthContext';
import { Field } from '../components/Field';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

/**
 * Halaman Masuk & Buat Akun (Email + Password).
 * - Mode Masuk: Email, Password, Masuk, Belum punya akun? Daftar, Lupa password?.
 * - Mode Buat Akun: Nama lengkap, Email, Nomor telepon, Password (Minimal 8 huruf atau angka.),
 *   kotak pengingat orang tua/guru, Daftar, Sudah punya akun? Masuk.
 * - Transisi antar mode Masuk & Buat Akun dibuat seragam dan stabil (posisi banner & maskot tidak melompat).
 */
type AuthMode = 'login' | 'register';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const FORM_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export function LoginPage() {
  const { login, register, isAuthenticated, loading, endedReason, clearEndedReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from;

  const [mode, setMode] = useState<AuthMode>(() => (searchParams.get('mode') === 'register' ? 'register' : 'login'));
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  /** Pesan salah email/password (kotak merah muda di atas form). */
  const [message, setMessage] = useState<ReactNode>(null);
  /** Server tak terjangkau (kotak terpisah di bawah). */
  const [netError, setNetError] = useState(false);
  const [fieldError, setFieldError] = useState<{ fullName?: string; email?: string; phone?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockLeft, setLockLeft] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [typingField, setTypingField] = useState(false);
  const forgotRef = useRef<HTMLButtonElement>(null);

  const locked = lockLeft > 0;
  const mascotMood: MascotMood = submitting ? 'thinking' : typingField ? 'typing' : 'idle';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from || '/chat', { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockLeft(left);
      if (left === 0) {
        setLockUntil(null);
        setAttempts(0);
        setMessage(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [lockUntil]);

  useEffect(() => {
    const urlMode: AuthMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
    setMode(urlMode);
  }, [searchParams]);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setSearchParams(nextMode === 'register' ? { mode: 'register' } : {}, { replace: true });
    setMessage(null);
    setNetError(false);
    setFieldError({});
    if (endedReason) clearEndedReason();
  };

  const onEdit =
    (setter: (v: string) => void, key: 'fullName' | 'email' | 'phone' | 'password') =>
    (value: string) => {
      setter(value);
      if (!locked) setMessage(null);
      setNetError(false);
      if (key === 'phone') {
        const trimmed = value.trim();
        const phoneErr = trimmed && !isValidPhone(trimmed) ? 'Nomor telepon harus berupa angka.' : undefined;
        setFieldError((prev) => (prev.phone !== phoneErr ? { ...prev, phone: phoneErr } : prev));
      } else {
        setFieldError((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
      }
      if (endedReason) clearEndedReason();
    };

  const onSubmitLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (locked || submitting) return;

    const cleanEmail = email.trim().toLowerCase();
    const pass = password;
    const missing: typeof fieldError = {};

    if (!cleanEmail) {
      missing.email = 'Isi email kamu dulu, ya.';
    } else if (!isValidEmail(cleanEmail)) {
      missing.email = 'Format email belum sesuai (contoh: nadia.putri@gmail.com).';
    }
    if (!pass.trim()) {
      missing.password = 'Isi password-mu dulu, ya.';
    }

    if (missing.email || missing.password) {
      setFieldError(missing);
      return;
    }

    const tooLong = validateCredentialLengths(cleanEmail, pass);
    if (tooLong) {
      setMessage(tooLong);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setNetError(false);
    const result = await login(cleanEmail, pass);
    setSubmitting(false);

    if (result.ok) {
      navigate(from || '/chat', { replace: true });
      return;
    }

    if (result.reason === 'service-error') {
      setNetError(true);
      return;
    }

    setPassword('');
    const next = attempts + 1;
    setAttempts(next);
    if (next >= AUTH.maxAttempts) {
      setFieldError({});
      setLockUntil(Date.now() + AUTH.lockoutMs);
      return;
    }
    setFieldError({ password: 'Cek lagi huruf besar dan kecil.' });
    setMessage(
      <>
        Email atau password belum cocok. Sisa <b className="font-bold">{AUTH.maxAttempts - next} kali</b> coba lagi.
      </>,
    );
  };

  const onSubmitRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const pass = password;
    const missing: typeof fieldError = {};

    if (!cleanName) {
      missing.fullName = 'Isi nama lengkapmu dulu, ya.';
    }
    if (!cleanEmail) {
      missing.email = 'Isi email kamu dulu, ya.';
    } else if (!isValidEmail(cleanEmail)) {
      missing.email = 'Format email belum sesuai (contoh: nadia.putri@gmail.com).';
    }
    if (!cleanPhone) {
      missing.phone = 'Isi nomor teleponmu dulu, ya.';
    } else if (!isValidPhone(cleanPhone)) {
      missing.phone = 'Nomor telepon harus berupa angka.';
    }
    if (!pass.trim()) {
      missing.password = 'Isi password-mu dulu, ya.';
    } else if (pass.length < AUTH.minPasswordLength) {
      missing.password = `Minimal ${AUTH.minPasswordLength} huruf atau angka.`;
    }

    if (missing.fullName || missing.email || missing.phone || missing.password) {
      setFieldError(missing);
      return;
    }

    const tooLong = validateCredentialLengths(cleanEmail, pass);
    if (tooLong) {
      setMessage(tooLong);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setNetError(false);
    const result = await register(cleanName, cleanEmail, pass, cleanPhone);
    setSubmitting(false);

    if (result.ok) {
      navigate(from || '/chat', { replace: true });
      return;
    }
    if (result.reason === 'email-exists') {
      const msgLower = (result.message ?? '').toLowerCase();
      if (msgLower.includes('phone') || msgLower.includes('telepon') || msgLower.includes('nomor')) {
        setFieldError({ phone: result.message || 'Nomor telepon ini sudah terdaftar.' });
      } else {
        setFieldError({ email: result.message || 'Email ini sudah terdaftar. Coba masuk saja, ya.' });
      }
      return;
    }
    if (result.reason === 'validation-error') {
      const detail = result.message;
      const detailLower = (detail ?? '').toLowerCase();
      if (detailLower.includes('phone') || detailLower.includes('telepon')) {
        setFieldError({ phone: detail || 'Nomor telepon belum sesuai format.' });
      } else if (detailLower.includes('email')) {
        setFieldError({ email: detail || 'Format email belum sesuai.' });
      } else if (detailLower.includes('full_name') || detailLower.includes('name') || detailLower.includes('nama')) {
        setFieldError({ fullName: detail || 'Nama lengkap belum sesuai.' });
      } else {
        setMessage(detail || 'Password terlalu lemah atau data belum valid. Coba kombinasikan huruf dan angka.');
      }
      return;
    }
    setNetError(true);
  };

  if (loading || isAuthenticated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-sand" role="status" aria-live="polite">
        <span className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 anim-spin" aria-hidden="true" /> Menyiapkan akunmu…
        </span>
      </div>
    );
  }

  const notice =
    endedReason === 'expired'
      ? 'Sesi sebelumnya berakhir. Masuk lagi, ya.'
      : endedReason === 'logout'
        ? 'Kamu sudah keluar. Sampai jumpa lagi!'
        : null;

  const isRegister = mode === 'register';
  const compact = !!message || locked || !!notice;

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:grid lg:grid-cols-[1.06fr_1fr]">
      {/* ==================== PANEL ORANYE + MASKOT + PEMISAH GELOMBANG ==================== */}
      <section
        className={cn(
          'relative isolate overflow-hidden bg-tiger px-6 pb-16 pt-7 sm:px-10',
          'lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:py-10 lg:pl-14 lg:pr-24 xl:py-12 xl:pl-20 xl:pr-28',
        )}
      >
        {/* Logo LUNAR */}
        <a
          href={APP.landingUrl}
          aria-label="LUNAR, ke halaman utama"
          className="relative z-10 inline-flex w-fit shrink-0 rounded-xl"
        >
          <Logo />
        </a>

        {/* Maskot di Desktop: tinggi & posisi tetap sama persis di mode Masuk maupun Buat Akun */}
        <div className="relative z-10 my-auto hidden shrink-0 items-center justify-center py-2 lg:flex">
          <TigerMascot
            mood={mascotMood}
            className="h-[15rem] w-[12.75rem] xl:h-[17rem] xl:w-[14.5rem]"
          />
        </div>

        {/* Teks Judul & Subjudul dengan tinggi tetap (fixed height) agar posisi maskot & teks tidak bergeser sedikit pun */}
        <div className="relative z-10 mt-6 h-[6.5rem] shrink-0 sm:mt-8 sm:h-[7.25rem] lg:mt-0 lg:h-[9.25rem] lg:max-w-md xl:h-[9.75rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={FORM_TRANSITION.initial}
              animate={FORM_TRANSITION.animate}
              exit={FORM_TRANSITION.exit}
              transition={FORM_TRANSITION.transition}
            >
              <h1 className="max-w-[16.5rem] text-[1.625rem] font-black uppercase leading-[1.08] tracking-[0.01em] text-ink sm:max-w-sm sm:text-[2rem] lg:max-w-md lg:text-[2.45rem] xl:text-[2.7rem]">
                {isRegister
                  ? 'Buat akun, yuk'
                  : compact
                    ? 'Masuk dulu, yuk'
                    : 'Masuk untuk mulai belajar'}
              </h1>
              {!compact && (
                <p className="mt-2.5 max-w-[12.75rem] text-[0.9375rem] leading-snug text-ink sm:max-w-xs sm:text-base lg:mt-3 lg:max-w-md lg:text-[1.0625rem]">
                  {isRegister
                    ? 'Daftar dengan mudah untuk mulai belajar bersama LUNAR.'
                    : 'Pakai email dan password akunmu.'}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Maskot di Mobile/Tablet (< lg): posisi tetap stabil di kedua mode */}
        <TigerMascot
          mood={mascotMood}
          className="absolute -bottom-7 right-2 z-0 h-[9.25rem] w-[7.75rem] sm:right-6 sm:h-[11rem] sm:w-[9.25rem] lg:hidden"
        />

        {/* Pemisah Gelombang Organik Berlapis — Desktop */}
        <DesktopWaveDivider />

        {/* Pemisah Gelombang Organik Berlapis — Mobile & Tablet */}
        <MobileWaveDivider />
      </section>

      {/* ==================== PANEL PUTIH / FORM ==================== */}
      <section className="relative z-10 flex flex-1 flex-col bg-white px-6 pb-8 pt-6 sm:px-10 lg:items-center lg:justify-center lg:px-10 lg:py-12 xl:px-14">
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center lg:mx-0 lg:flex-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={FORM_TRANSITION.initial}
              animate={FORM_TRANSITION.animate}
              exit={FORM_TRANSITION.exit}
              transition={FORM_TRANSITION.transition}
              className="flex w-full flex-col"
            >
              <div aria-live="polite" role="status">
                {locked && mode === 'login' ? (
                  <Alert tone="cream" icon={<Clock />}>
                    Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.
                  </Alert>
                ) : message ? (
                  <Alert tone="error" icon={<CircleAlert />}>
                    {message}
                  </Alert>
                ) : notice && mode === 'login' ? (
                  <Alert tone="cream" icon={<Info />}>
                    {notice}
                  </Alert>
                ) : null}
              </div>

              {mode === 'login' && (
                /* ---------------- FORM MASUK ---------------- */
                <>
                  <form onSubmit={onSubmitLogin} noValidate className="flex flex-col gap-5">
                    <Field
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => onEdit(setEmail, 'email')(e.target.value)}
                      onFocus={() => setTypingField(true)}
                      onBlur={() => setTypingField(false)}
                      placeholder="nadia.putri@gmail.com"
                      autoComplete="email"
                      inputMode="email"
                      spellCheck={false}
                      error={fieldError.email}
                    />

                    <Field
                      label="Password"
                      password
                      showPasswordToggle
                      value={password}
                      onChange={(e) => onEdit(setPassword, 'password')(e.target.value)}
                      onFocus={() => setTypingField(true)}
                      onBlur={() => setTypingField(false)}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      error={fieldError.password}
                    />

                    <Button type="submit" size="lg" disabled={submitting || locked} className="mt-1 w-full text-base">
                      {locked ? (
                        <span className="tabular-nums">Coba lagi dalam {mmss(lockLeft)}</span>
                      ) : submitting ? (
                        <>
                          <LoaderCircle className="anim-spin" aria-hidden="true" /> Memeriksa…
                        </>
                      ) : (
                        'Masuk'
                      )}
                    </Button>
                  </form>

                  <div className="mt-5 flex flex-col items-center gap-2 text-center">
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="rounded-lg px-2 py-0.5 text-[0.9375rem] font-bold text-tiger-ink underline-offset-4 hover:underline"
                    >
                      Belum punya akun? Daftar
                    </button>

                    <button
                      ref={forgotRef}
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="rounded-lg px-2 py-0.5 text-[0.9375rem] font-semibold text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                </>
              )}

              {mode === 'register' && (
                /* ---------------- FORM BUAT AKUN ---------------- */
                <>
                  <form onSubmit={onSubmitRegister} noValidate className="flex flex-col gap-4">
                    <Field
                      label="Nama lengkap"
                      value={fullName}
                      onChange={(e) => onEdit(setFullName, 'fullName')(e.target.value)}
                      onFocus={() => setTypingField(true)}
                      onBlur={() => setTypingField(false)}
                      placeholder="Nadia Putri"
                      autoComplete="name"
                      error={fieldError.fullName}
                    />

                    <Field
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => onEdit(setEmail, 'email')(e.target.value)}
                      onFocus={() => setTypingField(true)}
                      onBlur={() => setTypingField(false)}
                      placeholder="nadia.putri@gmail.com"
                      autoComplete="email"
                      inputMode="email"
                      spellCheck={false}
                      error={fieldError.email}
                    />

                    <Field
                      label="Nomor telepon"
                      type="tel"
                      value={phone}
                      onChange={(e) => onEdit(setPhone, 'phone')(e.target.value)}
                      onFocus={() => setTypingField(true)}
                      onBlur={() => setTypingField(false)}
                      placeholder="081234567890"
                      autoComplete="tel"
                      inputMode="numeric"
                      spellCheck={false}
                      error={fieldError.phone}
                    />

                    <Field
                      label="Password"
                      password
                      showPasswordToggle
                      value={password}
                      onChange={(e) => onEdit(setPassword, 'password')(e.target.value)}
                      onFocus={() => setTypingField(true)}
                      onBlur={() => setTypingField(false)}
                      placeholder="Masukkan password"
                      autoComplete="new-password"
                      hint="Minimal 8 huruf atau angka."
                      error={fieldError.password}
                    />

                    <div className="mt-0.5 rounded-2xl bg-cream px-4 py-3.5 text-[0.875rem] leading-snug text-ink">
                      Untuk anak di bawah 13 tahun, minta <b className="font-bold">orang tua atau guru</b> membantu membuat akun.
                    </div>

                    <Button type="submit" size="lg" disabled={submitting || locked} className="mt-1 w-full text-base">
                      {locked ? (
                        <span className="tabular-nums">Coba lagi dalam {mmss(lockLeft)}</span>
                      ) : submitting ? (
                        <>
                          <LoaderCircle className="anim-spin" aria-hidden="true" /> Mendaftarkan…
                        </>
                      ) : (
                        'Daftar'
                      )}
                    </Button>
                  </form>

                  <div className="mt-5 flex flex-col items-center text-center">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="rounded-lg px-2 py-0.5 text-[0.9375rem] font-bold text-tiger-ink underline-offset-4 hover:underline"
                    >
                      Sudah punya akun? Masuk
                    </button>
                  </div>
                </>
              )}

              {netError && (
                <div className="mt-6">
                  <Alert tone="error" icon={<Wifi />} role="alert">
                    Tidak bisa menghubungi server. Cek internet, lalu coba lagi.
                  </Alert>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <ForgotPasswordDialog
        open={forgotOpen}
        defaultEmail={email}
        onClose={() => {
          setForgotOpen(false);
          forgotRef.current?.focus();
        }}
      />
    </div>
  );
}

/**
 * Pemisah gelombang vertikal berlapis (oranye → krem hangat → putih) untuk tampilan Desktop.
 */
function DesktopWaveDivider() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 -right-px z-20 hidden w-20 select-none lg:block xl:w-28"
    >
      <svg viewBox="0 0 120 800" preserveAspectRatio="none" className="h-full w-full">
        <path
          d="M 55 0 C 5 180, 110 380, 35 580 C 0 680, 75 760, 50 800 L 120 800 L 120 0 Z"
          fill="#FFF2E2"
          fillOpacity="0.38"
        />
        <path
          d="M 75 0 C 115 200, 20 420, 80 620 C 105 700, 45 760, 72 800 L 120 800 L 120 0 Z"
          fill="#FFF2E2"
          fillOpacity="0.7"
        />
        <path
          d="M 92 0 C 42 190, 118 410, 68 610 C 44 705, 96 765, 86 800 L 120 800 L 120 0 Z"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
}

/**
 * Pemisah gelombang horizontal berlapis (oranye → krem hangat → putih) untuk tampilan Mobile & Tablet.
 */
function MobileWaveDivider() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-10 w-full select-none lg:hidden"
    >
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" className="h-full w-full">
        <path
          d="M 0 18 C 95 44, 210 -4, 400 22 L 400 48 L 0 48 Z"
          fill="#FFF2E2"
          fillOpacity="0.45"
        />
        <path
          d="M 0 28 C 130 4, 265 46, 400 18 L 400 48 L 0 48 Z"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
}

function Alert({
  tone,
  icon,
  children,
  role,
}: {
  tone: 'error' | 'cream';
  icon: ReactNode;
  children: ReactNode;
  role?: 'alert';
}) {
  return (
    <motion.p
      role={role}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mb-5 flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[0.9375rem] leading-snug [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:shrink-0',
        tone === 'error' ? 'bg-rec-soft text-[#9b2a23]' : 'bg-cream text-ink',
        role === 'alert' && 'mb-0',
      )}
    >
      <span aria-hidden="true" className="contents">
        {icon}
      </span>
      <span>{children}</span>
    </motion.p>
  );
}
