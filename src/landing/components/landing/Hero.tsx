import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { gsap, useGSAP, MOTION_OK, REDUCED } from '../../lib/gsap';
import { EASE } from '../../animations/tokens';
import { HeroShowcase } from './HeroShowcase';
import { Icon } from '../ui/Icon';
import { APP_URL, LOGIN_URL, REGISTER_URL } from '../../config/links';

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const { isAuthenticated } = useAuth();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: EASE.enter } });
        tl.from('.js-hero-eyebrow', { y: 12, autoAlpha: 0, duration: 0.5 })
          .from('.js-hw', { yPercent: 45, autoAlpha: 0, duration: 0.75, stagger: 0.08 }, 0.05)
          .fromTo('.js-underline', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: EASE.reveal }, 0.55)
          .from('.js-hero-rest > *', { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.07 }, 0.4)
          .from('.js-hero-visual', { y: 36, scale: 0.96, autoAlpha: 0, duration: 0.85 }, 0.15);
      });
      mm.add(REDUCED, () => {
        gsap.from('.js-hero-copy, .js-hero-visual', { autoAlpha: 0, duration: 0.4 });
      });
    },
    { scope: root },
  );

  return (
    <section
      id="top"
      ref={root}
      className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/50 to-white pb-24 pt-24 md:pb-32 md:pt-36"
    >
      {/* Cahaya hangat di latar */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 size-[380px] rounded-full bg-brand-100/55 blur-3xl" />
        <div className="absolute right-[-120px] top-[26%] size-[520px] rounded-full bg-brand-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-[40%] size-[260px] rounded-full bg-brand-100/40 blur-3xl" />
      </div>

      <div className="wrap relative grid grid-cols-1 items-center gap-10 md:grid-cols-[0.82fr_1.18fr] md:gap-8 lg:gap-12">
        <div className="js-hero-copy">
          <p className="js-hero-eyebrow inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/85 px-3.5 py-1.5 text-[12px] font-bold text-brand-600">
            <Icon name="sparkles" className="size-3.5" />
            Platform Belajar Inklusif
          </p>

          <h1 className="mt-5 text-[clamp(42px,11vw,58px)] font-extrabold leading-[1] tracking-[-0.055em] md:text-[clamp(48px,5.2vw,74px)]">
            <span className="js-hw inline-block">Memahami</span> <span className="js-hw inline-block">Tanpa</span>{' '}
            <span className="js-hw relative inline-block text-brand-600">
              Batas
              <svg
                viewBox="0 0 200 20"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.12em] left-0 h-[0.28em] w-full text-brand-400"
                aria-hidden="true"
              >
                <path
                  className="js-underline"
                  d="M4 13 C 44 4, 96 3, 136 9 S 186 16, 196 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset="0"
                />
              </svg>
            </span>
          </h1>

          <div className="js-hero-rest">
            <p className="mt-5 max-w-[420px] text-[15.5px] leading-relaxed text-brand-800 md:text-[16.5px]">
              Akses konten pembelajaran dalam bahasa isyarat BISINDO dan caption interaktif. Dirancang ramah untuk semua orang, termasuk teman-teman Tuli.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link
                to={isAuthenticated ? APP_URL : LOGIN_URL}
                className="group inline-flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-brand-600 py-3 pl-3 pr-5 text-[15px] font-bold text-white shadow-[0_12px_25px_rgba(184,80,15,0.26)] transition hover:-translate-y-0.5 hover:bg-brand-800 sm:flex-none"
              >
                <span className="grid size-8 place-items-center rounded-full bg-white/20">
                  <Icon name="play" className="size-3.5" fill="currentColor" />
                </span>
                {isAuthenticated ? 'Lanjut Belajar' : 'Mulai Belajar'}
                <Icon name="arrowRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {isAuthenticated ? (
                <a
                  href="#fitur"
                  className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-5 py-3.5 text-[14px] font-bold text-brand-800 transition hover:bg-brand-50"
                >
                  Lihat fitur
                </a>
              ) : (
                <Link
                  to={REGISTER_URL}
                  className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-5 py-3.5 text-[14px] font-bold text-brand-800 transition hover:bg-brand-50"
                >
                  Buat Akun Gratis
                </Link>
              )}
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] font-semibold text-muted">
              {['Isyarat BISINDO', 'Tanya Video & PDF', 'Terbuka untuk Umum'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Icon name="check" className="size-3.5 text-ok" strokeWidth={2.6} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="js-hero-visual relative">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}
