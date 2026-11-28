import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Captions, CaptionsOff, Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { SignCaption } from '@/components/ui/sign-caption';
import { SignerAvatar } from '@/components/ui/signer-avatar';
import { clock } from '@/data/materi';
import { signWordsForText, SkeletonPlayer, useClipsDurationSec } from '@/features/skeleton-animation';
import { MAX_SIGNED_WORDS } from '@/features/skeleton-animation/sentence';
import { tokenizeWords } from '@/services/textMatch';
import { useSettings } from '@/state/SettingsContext';
import { cn } from '@/lib/utils';

const SLIDER_STEPS = 1000;

/**
 * Isyarat untuk jawaban chatbot (ADR-051 D5, panduan ui/02).
 *  - Klik "Putar isyarat" memutar langsung di dalam kartu lengkap dengan seekbar ala YouTube
 *    (bisa klik/geser ke detik atau kata mana saja) dan tombol layar penuh.
 *  - Layar penuh: caption kata disorot kuning, seekbar interaktif dengan waktu, kecepatan,
 *    jeda/lanjut, dan putar ulang.
 */
type Speech = { speaking: boolean; onSpeak: () => void };

export function AnswerSign({
  text,
  autoPlay,
  compact = false,
  speech,
}: {
  text: string;
  autoPlay: boolean;
  compact?: boolean;
  speech?: Speech;
}) {
  const settings = useSettings();
  const [inline, setInline] = useState(autoPlay);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [full, setFull] = useState(false);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const startAt = useRef(0);
  const wasPaused = useRef(false);

  // Jumlah kata untuk kartu (murah: tanpa membuat klip).
  const count = useMemo(() => Math.min(MAX_SIGNED_WORDS, tokenizeWords(text).length), [text]);
  const words = useMemo(() => (inline || full ? signWordsForText(text) : []), [inline, full, text]);
  const clips = useMemo(() => words.map((w) => w.clip), [words]);
  const captionWords = useMemo(() => words.map((w) => w.text), [words]);
  const totalSec = useClipsDurationSec(clips, settings.signSpeed);

  if (count === 0) return null;

  const startInline = () => {
    startAt.current = 0;
    setProgress(0);
    setActive(0);
    setEnded(false);
    setPaused(false);
    setInline(true);
    setRun((r) => r + 1);
  };

  const toggleInlinePlay = () => {
    if (ended) {
      startAt.current = 0;
      setProgress(0);
      setActive(0);
      setEnded(false);
      setPaused(false);
      setRun((r) => r + 1);
      return;
    }
    startAt.current = progress;
    setPaused((p) => !p);
  };

  const seekInline = (nextProgress: number) => {
    const p = Math.min(0.999, Math.max(0, nextProgress));
    startAt.current = p;
    setProgress(p);
    setEnded(false);
    setRun((r) => r + 1);
  };

  const openFull = () => {
    startAt.current = ended ? 0 : progress;
    setPaused(true);
    setFull(true);
  };

  const currentSec = progress * totalSec;
  const currentWord = captionWords[Math.min(captionWords.length - 1, Math.max(0, active))] ?? '';

  return (
    <>
      <div className={cn('relative mt-3 overflow-hidden rounded-2xl', inline ? 'bg-[#2a2520]' : 'bg-cap-soft')}>
        <div className={cn('relative w-full', compact ? 'aspect-[16/10]' : 'aspect-[16/9]')}>
          {inline && clips.length > 0 ? (
            <>
              <SkeletonPlayer
                clips={clips}
                run={run}
                speed={settings.signSpeed}
                paused={paused || ended || scrubbing || full}
                startProgress={startAt.current}
                onProgress={setProgress}
                onSegment={setActive}
                onDone={() => {
                  setProgress(1);
                  setEnded(true);
                }}
                className={cn('absolute inset-0 size-full p-2', compact ? 'pb-11' : 'pb-14')}
              />
              {settings.captions && !compact && (
                <SignCaption words={captionWords} active={active} size={settings.captionSize} className="bottom-13" />
              )}

              {/* Bar kontrol bawah ala YouTube: Play/Pause + Waktu + Seekbar + Layar Penuh */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2 pt-7 text-white">
                <SignSeekbar
                  progress={progress}
                  totalSec={totalSec}
                  words={captionWords}
                  activeWord={currentWord}
                  onScrubStart={() => {
                    wasPaused.current = paused;
                    setScrubbing(true);
                  }}
                  onSeek={seekInline}
                  onScrubEnd={() => {
                    setScrubbing(false);
                    if (!wasPaused.current) setPaused(false);
                  }}
                />
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleInlinePlay}
                      aria-label={ended ? 'Putar ulang isyarat' : paused ? 'Lanjutkan isyarat' : 'Jeda isyarat'}
                      className="grid size-8 place-items-center rounded-full text-white transition-colors hover:bg-white/15"
                    >
                      {ended ? (
                        <RotateCcw className="size-4" aria-hidden="true" />
                      ) : paused ? (
                        <Play className="size-4 translate-x-px" fill="currentColor" aria-hidden="true" />
                      ) : (
                        <Pause className="size-4" fill="currentColor" aria-hidden="true" />
                      )}
                    </button>
                    <span className="text-[0.75rem] font-bold tabular-nums text-white/95">
                      {clock(currentSec)} <span className="text-white/60">/ {clock(totalSec)}</span>
                    </span>
                    <span className="hidden truncate text-[0.75rem] font-medium text-white/75 sm:inline">
                      · Kata {Math.min(captionWords.length, active + 1)}/{captionWords.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openFull}
                    aria-label="Perbesar isyarat ke layar penuh"
                    title="Layar penuh"
                    className="grid size-8 place-items-center rounded-full text-white transition-colors hover:bg-white/15"
                  >
                    <Maximize2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button type="button" onClick={startInline} className="group absolute inset-0 text-left" aria-label={`Putar isyarat jawaban, ${count} kata`}>
              <SignerAvatar tone="brand" animated={false} className="absolute inset-x-[24%] bottom-0 top-[12%] transition-transform duration-500 group-hover:scale-[1.03]" />
              <span className="absolute bottom-3 left-3 flex h-10 items-center gap-2 rounded-full bg-ink pl-3.5 pr-4 text-sm font-bold text-white transition-transform group-hover:scale-[1.02]">
                <Play className="size-3.5" fill="currentColor" aria-hidden="true" /> Putar isyarat
              </span>
              <span className="absolute bottom-3.5 right-3 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-ink">{count} kata</span>
            </button>
          )}
        </div>
        {inline && compact && settings.captions && <SignCaption words={captionWords} active={active} size={settings.captionSize} inline />}
      </div>
      {/* Pembaca layar: teks lengkap tanpa perlu mengikuti animasi. */}
      <p className="sr-only">{text}</p>

      <AnimatePresence>
        {full && clips.length > 0 && (
          <SignPlayerFull
            key="sign-full"
            clips={clips}
            words={captionWords}
            initialProgress={startAt.current}
            speech={speech}
            onClose={(lastProgress) => {
              setFull(false);
              startAt.current = lastProgress >= 0.999 ? 0 : lastProgress;
              setProgress(lastProgress);
              setEnded(lastProgress >= 0.999);
              setPaused(true);
              setInline(true);
              setRun((r) => r + 1);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Seekbar bergaya YouTube berbasis native <input type="range">: mendukung klik langsung,
 * geser (drag), tombol panah keyboard, dan tooltip waktu + kata saat kursor diarahkan.
 */
function SignSeekbar({
  progress,
  totalSec,
  words,
  activeWord,
  fillColor,
  onScrubStart,
  onSeek,
  onScrubEnd,
}: {
  progress: number;
  totalSec: number;
  words: string[];
  activeWord: string;
  fillColor?: string;
  onScrubStart: () => void;
  onSeek: (p: number) => void;
  onScrubEnd: () => void;
}) {
  const id = useId();
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const value = Math.round(Math.min(1, Math.max(0, progress)) * SLIDER_STEPS);
  const hoverWord =
    hoverPct !== null && words.length > 0
      ? words[Math.min(words.length - 1, Math.max(0, Math.floor(hoverPct * words.length)))]
      : null;

  const sliderStyle = {
    '--attr-min': 0,
    '--attr-max': SLIDER_STEPS,
    '--control-value': value,
    ...(fillColor ? { '--slider-fill-color': fillColor } : {}),
  } as CSSProperties;

  return (
    <div
      className="relative flex items-center"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width > 0) {
          setHoverPct(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
        }
      }}
      onPointerLeave={() => setHoverPct(null)}
    >
      <label htmlFor={id} className="sr-only">
        Posisi waktu animasi isyarat
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={SLIDER_STEPS}
        step={1}
        value={value}
        aria-valuetext={`${clock(progress * totalSec)} dari ${clock(totalSec)}${activeWord ? `, kata ${activeWord}` : ''}`}
        style={sliderStyle}
        onPointerDown={onScrubStart}
        onPointerUp={onScrubEnd}
        onPointerCancel={onScrubEnd}
        onChange={(e) => onSeek(Number(e.target.value) / SLIDER_STEPS)}
        className="lunar-seekbar"
      />
      {hoverPct !== null && totalSec > 0 && (
        <span
          aria-hidden="true"
          style={{ left: `${Math.min(92, Math.max(8, hoverPct * 100))}%` }}
          className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-2 py-0.5 text-[0.6875rem] font-bold tabular-nums text-white shadow"
        >
          {clock(hoverPct * totalSec)}
          {hoverWord ? ` · ${hoverWord}` : ''}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- layar penuh

const SPEEDS = [0.5, 0.75, 1] as const;
/** Kata per "halaman" caption besar di layar penuh. */
const PAGE = 6;

function SignPlayerFull({
  clips,
  words,
  initialProgress = 0,
  speech,
  onClose,
}: {
  clips: ReturnType<typeof signWordsForText>[number]['clip'][];
  words: string[];
  initialProgress?: number;
  speech?: Speech;
  onClose: (lastProgress: number) => void;
}) {
  const settings = useSettings();
  const [speed, setSpeed] = useState<number>(Math.min(1, settings.signSpeed));
  const [paused, setPaused] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(initialProgress);
  const [ended, setEnded] = useState(false);
  const resumeAt = useRef(initialProgress);
  const wasPaused = useRef(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeRef2 = useRef(onClose);
  closeRef2.current = onClose;
  const totalSec = useClipsDurationSec(clips, speed);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef2.current(progressRef.current);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const restart = () => {
    resumeAt.current = 0;
    setProgress(0);
    setActive(0);
    setEnded(false);
    setPaused(false);
    setRun((r) => r + 1);
  };
  const togglePause = () => {
    if (ended) return restart();
    resumeAt.current = progress;
    setPaused((p) => !p);
  };
  const changeSpeed = (s: number) => {
    resumeAt.current = progress;
    setSpeed(s);
  };
  const seekFull = (nextProgress: number) => {
    const p = Math.min(0.999, Math.max(0, nextProgress));
    resumeAt.current = p;
    setProgress(p);
    setEnded(false);
    setRun((r) => r + 1);
  };

  const start = Math.floor(Math.max(0, active) / PAGE) * PAGE;
  const shown = words.slice(start, start + PAGE);
  const currentWord = words[Math.min(words.length - 1, Math.max(0, active))] ?? '';

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Isyarat jawaban"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-ink pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white"
    >
      <header className="flex h-16 shrink-0 items-center justify-between px-3">
        <button
          ref={closeRef}
          type="button"
          onClick={() => onClose(progress)}
          aria-label="Tutup isyarat"
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2 className="text-base font-semibold">Isyarat jawaban</h2>
        <button
          type="button"
          onClick={() => settings.update({ captions: !settings.captions })}
          aria-pressed={settings.captions}
          aria-label={settings.captions ? 'Sembunyikan caption' : 'Tampilkan caption'}
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          {settings.captions ? <Captions className="size-6" strokeWidth={1.8} aria-hidden="true" /> : <CaptionsOff className="size-6" strokeWidth={1.8} aria-hidden="true" />}
        </button>
      </header>

      <div className="relative min-h-0 flex-1 bg-[#2a2520]">
        <SkeletonPlayer
          clips={clips}
          run={run}
          speed={speed}
          paused={paused || ended || scrubbing}
          startProgress={resumeAt.current}
          onProgress={setProgress}
          onSegment={setActive}
          onDone={() => {
            setProgress(1);
            setEnded(true);
          }}
          className="absolute inset-0 mx-auto size-full max-w-3xl p-4"
        />
      </div>

      <div className="mx-auto w-full max-w-xl shrink-0 px-6 pt-5">
        <p className={cn('min-h-[4rem] text-center text-[1.5rem] font-bold leading-snug sm:text-[1.75rem]', !settings.captions && 'invisible')} aria-hidden="true">
          {shown.map((w, i) => {
            const idx = start + i;
            return (
              <span key={`${idx}-${w}`}>
                <span className={cn('rounded-md px-1 transition-colors', idx === active ? 'bg-sun text-ink' : idx < active ? 'text-white' : 'text-white/40')}>{w}</span>
                {i < shown.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </p>

        <div className="mt-3">
          <SignSeekbar
            progress={progress}
            totalSec={totalSec}
            words={words}
            activeWord={currentWord}
            fillColor="var(--color-sun)"
            onScrubStart={() => {
              wasPaused.current = paused;
              setScrubbing(true);
            }}
            onSeek={seekFull}
            onScrubEnd={() => {
              setScrubbing(false);
              if (!wasPaused.current) setPaused(false);
            }}
          />
          <div className="mt-1 flex items-center justify-between text-xs font-bold tabular-nums text-white/75">
            <span>{clock(progress * totalSec)}</span>
            <span aria-live="polite">
              Kata {Math.min(words.length, active + 1)} dari {words.length}
            </span>
            <span>{clock(totalSec)}</span>
          </div>
        </div>

        <div className="mb-6 mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={restart} aria-label="Putar ulang dari awal" className="grid size-13 place-items-center rounded-full border-[1.5px] border-white/30 hover:bg-white/10">
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          <div role="group" aria-label="Kecepatan isyarat" className="flex rounded-xl border-[1.5px] border-white/30 p-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSpeed(s)}
                aria-pressed={speed === s}
                className={cn('h-9 rounded-lg px-3 text-sm font-bold tabular-nums', speed === s ? 'bg-white text-ink' : 'text-white hover:bg-white/10')}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={togglePause}
            aria-label={ended ? 'Putar ulang' : paused ? 'Lanjutkan' : 'Jeda'}
            className="grid size-15 place-items-center rounded-full bg-tiger text-ink transition-colors hover:bg-[#e47c20]"
          >
            {ended ? <RotateCcw className="size-6" aria-hidden="true" /> : paused ? <Play className="size-6" fill="currentColor" aria-hidden="true" /> : <Pause className="size-6" fill="currentColor" aria-hidden="true" />}
          </button>
        </div>

        {speech && (
          <div className="mb-6">
            <button type="button" onClick={speech.onSpeak} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-bold hover:bg-white/15">
              {speech.speaking ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
              {speech.speaking ? 'Hentikan' : 'Dengarkan'}
            </button>
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
