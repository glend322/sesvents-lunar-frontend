import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '../../lib/gsap';
import { EASE } from '../../animations/tokens';
import { Icon, type IconName } from '../ui/Icon';
const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'play', title: 'Konten Pembelajaran', desc: 'Dengan bahasa isyarat' },
  { icon: 'captions', title: 'Caption Interaktif', desc: 'Tanya isi konten video' },
  { icon: 'message', title: 'Chatbot AI', desc: 'Tanya apa saja' },
  { icon: 'globe', title: 'Akses Fleksibel', desc: 'Di mana saja, kapan saja' },
];
export function FeatureStrip() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 92%', once: true } });
        tl.from('.js-strip', { y: 30, autoAlpha: 0, duration: 0.6, ease: EASE.enter }).from(
          '.js-strip-item',
          { y: 14, autoAlpha: 0, stagger: 0.08, duration: 0.45, ease: EASE.enter },
          '-=0.3',
        );
      });
    },
    { scope: root },
  );
  return (
    <section id="fitur" ref={root} aria-labelledby="fitur-judul" className="relative z-10 -mt-14 pb-12 md:-mt-20 md:pb-20">
      <div className="wrap">
        <h2 id="fitur-judul" className="sr-only">
          Fitur utama LUNAR
        </h2>
        <ul className="js-strip grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-line bg-line shadow-soft sm:rounded-[28px] lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="js-strip-item flex flex-col items-start gap-2.5 bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5 md:p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 sm:size-12 sm:rounded-2xl">
                <Icon name={f.icon} className="size-4 sm:size-5" fill={f.icon === 'play' ? 'currentColor' : 'none'} />
              </span>
              <span>
                <span className="block text-[13.5px] font-extrabold leading-snug tracking-[-0.02em] sm:text-[15px]">{f.title}</span>
                <span className="mt-0.5 block text-[12px] text-muted sm:text-[13px]">{f.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
