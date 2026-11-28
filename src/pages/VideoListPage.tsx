import { useEffect, useId, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { AlignJustify, Bookmark, Check, ChevronLeft, ChevronRight, MessageSquarePlus, Pencil, Play, Search, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/auth/components/Avatar';
import {
  BlueShieldIcon,
  CardThumbnail,
  GreenCheckIcon,
  HeroIllustration,
  MATERI_FILTERS,
  MATERI_ITEMS,
  TigerHeadAvatar,
  type ContentItem,
  type MateriItem,
  type SourceTab,
  type SubjectFilter,
} from '@/components/materi/MateriVisuals';
import { useShellChrome } from '@/layout/AppShell';
import { useMateriStore } from '@/state/materi.store';
import { useDisplayName } from '@/state/nickname.store';
import { cn } from '@/lib/utils';

/**
 * Halaman Konten Pembelajaran (/video):
 *  A. Tab Konten LUNAR   bar pencarian + filter mapel + grid kartu 3 kolom di desktop (list ringkas di HP).
 *  B. Tab Komunitas      teaser fitur komunitas dengan maskot, info tinjauan Tim LUNAR, dan dua tombol aksi.
 *  C. Detail materi      preview video (klik → langsung autoplay), tombol Bookmark, info bab, kartu hijau sumber,
 *                        daftar isi materi interaktif (video autoplay / rangkuman auto-send / kuis auto-send), CTA Tanya LUNAR.
 */
export default function VideoListPage() {
  const { profile } = useAuth();
  const { displayName } = useDisplayName(profile);
  const store = useMateriStore(profile!.id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputId = useId();

  const [tab, setTab] = useState<SourceTab>('lunar');
  const [filter, setFilter] = useState<SubjectFilter>('Semua');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('detail'));
  const [notified, setNotified] = useState(false);
  const [contributorNotified, setContributorNotified] = useState(false);

  const selected = MATERI_ITEMS.find((m) => m.id === selectedId || m.videoId === selectedId) ?? null;

  useEffect(() => {
    const detailParam = searchParams.get('detail');
    setSelectedId(detailParam);
  }, [searchParams]);

  // Saat pengguna membuka Detail materi, catat ke riwayat "Terakhir ditonton".
  useEffect(() => {
    if (selected) {
      store.markOpened(selected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Sembunyikan header default mobile supaya bar atas mengikuti desain ("Konten Pembelajaran" + avatar, atau "< Detail materi").
  useShellChrome({ mobileHeader: false, mobileNav: !selected });

  const q = query.trim().toLowerCase();
  const filtered = MATERI_ITEMS.filter((m) => {
    if (filter !== 'Semua' && m.subject !== filter) return false;
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      m.detailMeta.toLowerCase().includes(q) ||
      m.cardMeta.toLowerCase().includes(q)
    );
  });

  const openDetail = (id: string) => {
    setSelectedId(id);
    setSearchParams({ detail: id }, { replace: false });
  };

  const closeDetail = () => {
    setSelectedId(null);
    if (searchParams.has('detail')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleContentAction = (materi: MateriItem, item: ContentItem) => {
    if (item.kind === 'video') {
      navigate(`/video/${materi.videoId}`, { state: { autoPlay: true } });
      return;
    }
    if (item.kind === 'summary') {
      navigate('/chat', {
        state: {
          prompt: `Buatkan rangkuman bahasa sederhana poin-poin penting dari materi ${materi.title} (${materi.detailMeta}).`,
          autoSend: true,
        },
      });
      return;
    }
    navigate('/chat', {
      state: {
        prompt: `Berikan aku ${item.meta} latihan singkat beserta pembahasannya tentang materi ${materi.title} (${materi.detailMeta}).`,
        autoSend: true,
      },
    });
  };

  // ---------- C. Detail materi
  if (selected) {
    const isSaved = store.isSaved(selected.id) || store.isSaved(selected.videoId);
    const toggleBookmark = () => {
      store.toggleSaved(selected.id);
    };

    return (
      <div className="mx-auto w-full max-w-3xl">
        {/* Bar atas Detail materi + Tombol Bookmark */}
        <header className="-mx-5 -mt-5 mb-5 flex h-14 items-center justify-between border-b border-line bg-white px-3 md:-mx-8 md:-mt-8 md:px-6 lg:mx-0 lg:mt-0 lg:rounded-2xl lg:border lg:px-4">
          <button
            type="button"
            onClick={closeDetail}
            className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[1.0625rem] font-extrabold tracking-[-0.02em] text-ink transition-colors hover:bg-sand"
          >
            <ChevronLeft className="size-5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            <span>Detail materi</span>
          </button>

          <button
            type="button"
            onClick={toggleBookmark}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Hapus ${selected.title} dari konten yang disimpan` : `Simpan ${selected.title}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-colors',
              isSaved
                ? 'border-tiger-ink/30 bg-cream text-tiger-ink'
                : 'border-line bg-white text-ink hover:bg-sand',
            )}
          >
            <Bookmark className="size-4" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
          </button>
        </header>

        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Preview video: klik langsung memutar video (autoPlay: true) */}
          <button
            type="button"
            onClick={() => navigate(`/video/${selected.videoId}`, { state: { autoPlay: true } })}
            aria-label={`Putar video ${selected.title} sekarang, durasi ${selected.duration}`}
            className="group relative block aspect-[16/9.2] w-full overflow-hidden rounded-[22px] text-left shadow-soft focus-visible:outline-3 focus-visible:outline-ink"
          >
            <HeroIllustration kind={selected.thumb} />
            <span className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-[#2B2623]/90 text-white shadow-soft transition-transform duration-200 group-hover:scale-105">
              <Play className="size-6 translate-x-0.5" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-ink shadow-sm">
              Klik untuk langsung putar
            </span>
            <span className="absolute bottom-3 right-3 rounded-lg bg-ink/90 px-2.5 py-1 text-xs font-extrabold tabular-nums text-white">
              {selected.duration}
            </span>
          </button>

          {/* Judul & info bab */}
          <h1 className="mt-4 text-[1.625rem] font-extrabold leading-tight tracking-[-0.03em] text-ink md:text-[1.875rem]">{selected.title}</h1>
          <p className="mt-1 text-[0.875rem] font-medium text-ink-2">{selected.detailMeta}</p>

          {/* Kotak hijau sumber & tanggal tinjauan */}
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ok-soft px-4 py-3.5 text-ok-ink">
            <GreenCheckIcon className="mt-0.5 size-5 shrink-0" />
            <div className="text-[0.8125rem] leading-relaxed">
              <p>
                <strong className="font-extrabold">Konten LUNAR</strong> · ditinjau {selected.reviewedAt}
              </p>
              <p>{selected.sourceBook}</p>
            </div>
          </div>

          {/* ISI MATERI: kartu tombol interaktif dengan aksi berbeda & indikator panah jelas */}
          <section className="mt-6" aria-labelledby="isi-materi-heading">
            <h2 id="isi-materi-heading" className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-ink">
              ISI MATERI
            </h2>
            <ul className="mt-2.5 flex flex-col gap-2">
              {selected.contents.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => handleContentAction(selected, item)}
                    className="group flex w-full items-center gap-3.5 rounded-2xl border border-line bg-white px-4 py-3.5 text-left transition-all hover:border-brand-200 hover:bg-cream/40"
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
                        item.kind === 'video'
                          ? 'bg-ink text-white group-hover:bg-brand-800'
                          : item.kind === 'summary'
                            ? 'bg-cap-soft text-cap'
                            : 'bg-cream text-tiger-ink',
                      )}
                      aria-hidden="true"
                    >
                      {item.kind === 'video' && <Play className="size-4 translate-x-px" fill="currentColor" />}
                      {item.kind === 'summary' && <AlignJustify className="size-4" strokeWidth={2.2} />}
                      {item.kind === 'quiz' && <Pencil className="size-4" strokeWidth={2.2} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] font-extrabold text-ink">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {item.kind === 'video'
                          ? 'Putar langsung video beserta caption BISINDO'
                          : item.kind === 'summary'
                            ? 'Buat rangkuman poin penting dengan bahasa mudah'
                            : 'Kerjakan latihan singkat interaktif bersama LUNAR'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-sand px-2.5 py-1 text-xs font-bold tabular-nums text-ink-2">
                      {item.meta}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA Tanya LUNAR */}
          <button
            type="button"
            onClick={() => navigate('/chat', { state: { prompt: selected.askPrompt, autoSend: false } })}
            className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-[0.9375rem] font-extrabold text-white transition-colors hover:bg-brand-800"
          >
            <MessageSquarePlus className="size-4" aria-hidden="true" />
            <span>Tanya bebas soal materi ini</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------- A & B. Daftar Konten Pembelajaran (Konten LUNAR / Komunitas)
  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Bar atas: judul + subjudul di kiri, kolom pencarian di kanan (desktop) */}
      <header className="-mx-5 -mt-5 mb-4 border-b border-line bg-white px-5 py-3.5 md:-mx-8 md:-mt-8 md:px-8 lg:mx-0 lg:mt-0 lg:mb-6 lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
        <div className="flex items-start justify-between gap-4 lg:items-center">
          <div>
            <h1 className="text-[1.625rem] font-extrabold leading-tight tracking-[-0.03em] text-ink md:text-[2.125rem]">
              Konten Pembelajaran
            </h1>
            <p className="mt-1 hidden text-[0.9375rem] text-ink-2 sm:block">
              Video pelajaran dengan bahasa isyarat BISINDO & caption interaktif
            </p>
          </div>

          <div className="flex items-center gap-3">
            {tab === 'lunar' && (
              <search className="hidden md:block">
                <div className="relative w-72 lg:w-80">
                  <label htmlFor={searchInputId} className="sr-only">
                    Cari topik atau mata pelajaran
                  </label>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id={searchInputId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari topik atau mata pelajaran..."
                    className="h-11 w-full rounded-full border border-[#DDD6CA] bg-white pl-10 pr-9 text-sm font-medium text-ink placeholder:text-muted/80 focus:border-ink focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                      className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </search>
            )}
            <NavLink to="/profil" aria-label="Profil dan pengaturan" className="lg:hidden">
              <Avatar name={displayName.split(' ')[0]} photoUrl={profile?.photoUrl} className="size-9 bg-cap text-white" textClassName="text-xs font-extrabold" />
            </NavLink>
          </div>
        </div>

        {/* Kolom pencarian untuk layar kecil */}
        {tab === 'lunar' && (
          <search className="mt-3 md:hidden">
            <div className="relative">
              <label htmlFor={`${searchInputId}-mobile`} className="sr-only">
                Cari topik atau mata pelajaran
              </label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id={`${searchInputId}-mobile`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari topik atau mata pelajaran..."
                className="h-10 w-full rounded-full border border-[#DDD6CA] bg-sand/60 pl-10 pr-9 text-sm font-medium text-ink placeholder:text-muted/80 focus:border-ink focus:bg-white focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </search>
        )}
      </header>

      {/* Baris kontrol: Tab sumber materi & Filter mata pelajaran */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Tab sumber materi: Konten LUNAR | Komunitas SEGERA */}
        <div
          role="tablist"
          aria-label="Sumber materi"
          className="grid grid-cols-2 gap-1 rounded-2xl bg-[#EAE4DA] p-1 lg:order-2 lg:w-[22rem] lg:shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'lunar'}
            onClick={() => setTab('lunar')}
            className={cn(
              'flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs transition-all sm:gap-2 sm:px-3.5 sm:text-[0.875rem]',
              tab === 'lunar'
                ? 'bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(31,27,22,0.08)]'
                : 'font-bold text-ink-2 hover:text-ink',
            )}
          >
            <GreenCheckIcon className="size-3.5 shrink-0 sm:size-4" />
            <span>Konten LUNAR</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'komunitas'}
            onClick={() => setTab('komunitas')}
            className={cn(
              'flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs transition-all sm:gap-2 sm:px-3.5 sm:text-[0.875rem]',
              tab === 'komunitas'
                ? 'bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(31,27,22,0.08)]'
                : 'font-bold text-ink-2 hover:text-ink',
            )}
          >
            <span>Komunitas</span>
            <span className="rounded-md bg-[#F8D978] px-1.5 py-0.5 text-[0.5625rem] font-extrabold uppercase leading-none tracking-[0.04em] text-[#7A5200] sm:text-[0.625rem]">
              SEGERA
            </span>
          </button>
        </div>

        {/* Filter mata pelajaran: scroll horizontal di HP, tampil utuh di Desktop */}
        {tab === 'lunar' && (
          <LayoutGroup>
            <div
              role="radiogroup"
              aria-label="Filter mata pelajaran"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-8 md:px-8 lg:order-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
            >
              {MATERI_FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'relative shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[0.8125rem] transition-colors',
                      active
                        ? 'border-ink font-extrabold text-white'
                        : 'border-[#D8D1C5] bg-white font-bold text-ink hover:bg-white/70',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="materi-filter-pill"
                        className="absolute inset-0 rounded-full bg-ink"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{f}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'lunar' ? (
          <motion.div
            key="tab-lunar"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {/* Label seksi + jumlah materi */}
            <div className="mt-5 mb-3 flex items-center justify-between">
              <h2 className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-ink">
                KELAS 5 · MINGGU INI
              </h2>
              <span className="text-xs font-semibold tabular-nums text-muted">{filtered.length} materi</span>
            </div>

            {filtered.length === 0 ? (
              <motion.div
                key="empty-materi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl border border-dashed border-[#D8D1C5] bg-white/70 px-6 py-12 text-center"
              >
                <p className="text-base font-extrabold text-ink">Materi tidak ditemukan</p>
                <p className="mt-1 text-sm text-muted">Coba kata kunci lain atau ubah filter mata pelajaran.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilter('Semua');
                  }}
                  className="mt-4 inline-flex items-center rounded-xl bg-ink px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-800"
                >
                  Tampilkan semua materi
                </button>
              </motion.div>
            ) : (
              <>
                {/* Tampilan HP (< sm): daftar ringkas dengan transisi halus antar kategori */}
                <motion.ul layout className="divide-y divide-line sm:hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filtered.map((item) => {
                      const isSaved = store.isSaved(item.id) || store.isSaved(item.videoId);
                      return (
                        <motion.li
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16, ease: 'easeIn' } }}
                          transition={{
                            layout: { type: 'spring', stiffness: 360, damping: 32 },
                            opacity: { duration: 0.22 },
                            y: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
                          }}
                          className="flex items-center gap-2 bg-sand"
                        >
                          <button
                            type="button"
                            onClick={() => openDetail(item.id)}
                            className="group flex min-w-0 flex-1 items-start gap-3.5 py-3.5 text-left transition-colors hover:bg-white/40"
                          >
                            <CardThumbnail kind={item.thumb} />
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-wrap items-baseline gap-1.5">
                                <span className="text-[1rem] font-extrabold leading-snug text-ink group-hover:underline">
                                  {item.title}
                                </span>
                                {item.isNew && (
                                  <span className="text-[0.6875rem] font-extrabold uppercase tracking-[0.04em] text-tiger-ink">
                                    BARU
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[0.8125rem] text-ink-2">{item.cardMeta}</p>
                              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-0.5 text-[0.75rem] font-extrabold text-ok-ink">
                                <GreenCheckIcon className="size-3.5 shrink-0" />
                                <span>Tim LUNAR</span>
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => store.toggleSaved(item.id)}
                            aria-pressed={isSaved}
                            aria-label={isSaved ? `Hapus ${item.title} dari simpanan` : `Simpan ${item.title}`}
                            title={isSaved ? 'Tersimpan di Materi Saya' : 'Simpan ke Materi Saya'}
                            className={cn(
                              'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
                              isSaved ? 'bg-cream text-tiger-ink' : 'text-muted hover:bg-white hover:text-ink',
                            )}
                          >
                            <Bookmark className="size-5" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>

                {/* Tampilan Tablet & Desktop (≥ sm): Grid Kartu 2–3 Kolom dengan animasi perpindahan halus */}
                <motion.ul layout className="hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filtered.map((item) => {
                      const isSaved = store.isSaved(item.id) || store.isSaved(item.videoId);
                      return (
                        <motion.li
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 14, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.16, ease: 'easeIn' } }}
                          whileHover={{ y: -2 }}
                          transition={{
                            layout: { type: 'spring', stiffness: 360, damping: 30 },
                            opacity: { duration: 0.24 },
                            y: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
                            scale: { duration: 0.22 },
                          }}
                          className="group relative flex flex-col rounded-[22px] border border-[#E6DFD3] bg-white p-3.5 shadow-[0_4px_18px_rgba(31,27,22,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-brand-200 hover:shadow-soft"
                        >
                          <button
                            type="button"
                            onClick={() => openDetail(item.id)}
                            className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl text-left focus:outline-none"
                          >
                            <HeroIllustration kind={item.thumb} />
                            {item.isNew && (
                              <span className="absolute left-2.5 top-2.5 rounded-full bg-tiger px-2.5 py-0.5 text-[0.6875rem] font-extrabold uppercase tracking-[0.05em] text-white shadow-sm">
                                BARU
                              </span>
                            )}
                            <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-ink/85 px-2 py-0.5 text-xs font-extrabold tabular-nums text-white">
                              {item.duration}
                            </span>
                          </button>

                          <div className="mt-3.5 flex flex-1 items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => openDetail(item.id)}
                              className="min-w-0 flex-1 text-left focus:outline-none"
                            >
                              <h3 className="text-[1.0625rem] font-extrabold leading-snug tracking-[-0.02em] text-ink group-hover:text-tiger-ink">
                                {item.title}
                              </h3>
                              <p className="mt-1 text-[0.8125rem] text-ink-2">{item.cardMeta}</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => store.toggleSaved(item.id)}
                              aria-pressed={isSaved}
                              aria-label={isSaved ? `Hapus ${item.title} dari simpanan` : `Simpan ${item.title}`}
                              title={isSaved ? 'Tersimpan di Materi Saya' : 'Simpan ke Materi Saya'}
                              className={cn(
                                '-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl transition-colors',
                                isSaved ? 'bg-cream text-tiger-ink' : 'text-muted hover:bg-sand hover:text-ink',
                              )}
                            >
                              <Bookmark className="size-4" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => openDetail(item.id)}
                            className="mt-3.5 flex w-full items-center justify-between pt-1 text-left focus:outline-none"
                          >
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-0.5 text-[0.75rem] font-extrabold text-ok-ink">
                              <GreenCheckIcon className="size-3.5 shrink-0" />
                              <span>Tim LUNAR</span>
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[0.8125rem] font-extrabold text-ink transition-transform group-hover:translate-x-0.5">
                              <span>Mulai</span>
                              <ChevronRight className="size-4" aria-hidden="true" />
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tab-komunitas"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mx-auto flex max-w-sm flex-col items-center pt-10 pb-6 text-center"
          >
            <TigerHeadAvatar className="size-28" />

            <h2 className="mt-5 text-[1.375rem] font-extrabold leading-[1.22] tracking-[-0.025em] text-ink">
              Materi dari Komunitas
              <br />
              segera hadir
            </h2>

            <p className="mt-2.5 max-w-[19rem] text-[0.875rem] leading-relaxed text-ink-2">
              Nanti guru, tutor les, dan kakak pengajar yang terverifikasi bisa berbagi materi di sini.
            </p>

            {/* Kotak info tinjauan Tim LUNAR */}
            <div className="mt-5 flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[#CFC8BD] bg-white/75 px-4 py-3 text-left">
              <BlueShieldIcon className="size-5 shrink-0" />
              <p className="text-[0.8125rem] leading-snug text-ink">
                Semua materi komunitas tetap <strong className="font-extrabold">ditinjau Tim LUNAR</strong> sebelum tampil.
              </p>
            </div>

            {/* Tombol aksi */}
            <div className="mt-5 flex w-full flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setNotified(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-[0.9375rem] font-extrabold text-white transition-colors hover:bg-brand-800"
              >
                {notified ? (
                  <>
                    <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    <span>Siap, kamu akan dikabari!</span>
                  </>
                ) : (
                  'Kabari aku kalau sudah ada'
                )}
              </button>

              <button
                type="button"
                onClick={() => setContributorNotified(true)}
                className="flex h-12 w-full items-center justify-center rounded-2xl border-[1.5px] border-tiger-ink bg-transparent px-5 text-[0.9375rem] font-extrabold text-tiger-ink transition-colors hover:bg-cream"
              >
                {contributorNotified ? 'Pendaftaran pengajar segera dibuka' : 'Aku pengajar, mau berbagi'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
