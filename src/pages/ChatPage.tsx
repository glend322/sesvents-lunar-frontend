import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, EllipsisVertical, LoaderCircle, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/auth/components/Avatar';
import { TigerMascot, type MascotMood } from '@/components/mascot/TigerMascot';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { SignerAvatar } from '@/components/ui/signer-avatar';
import { clock, MATERI, sectionStart } from '@/data/materi';
import { Bubble, Composer, DocumentChips, ErrorNote, simplifyPrompt, Typing } from '@/features/chatbot/ChatParts';
import { DeleteChatDialog } from '@/features/chatbot/DeleteChatDialog';
import { QUICK_PROMPTS, type PromptTone } from '@/features/chatbot/prompts';
import { useChat } from '@/features/chatbot/useChat';
import { useSpeechOut } from '@/hooks/useSpeechOut';
import { useShellChrome } from '@/layout/AppShell';
import { useSettings } from '@/state/SettingsContext';
import { useMateriStore } from '@/state/materi.store';
import { useDisplayName } from '@/state/nickname.store';
import { cn } from '@/lib/utils';

type IncomingState = { prompt?: string; autoSend?: boolean } | null;

/**
 * Tanya LUNAR (ADR-053, panduan ui/02): halaman utama setelah masuk.
 *  A. Beranda kosong   banner oranye + maskot, kartu "Lanjutkan" menempel di banner, daftar
 *                      "Coba tanya ini", kolom tanya di bawah.
 *  B. Percakapan       bar judul (kembali · judul · menu), jawaban pendek bernomor + kartu isyarat,
 *                      pesan dari kamera diberi tanda "dari isyarat". Tab bawah disembunyikan.
 * Jawaban selalu punya tiga bentuk: teks, suara (Dengarkan), dan isyarat.
 */
export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettings();
  const tts = useSpeechOut();
  const activeId = sessionId ?? null;

  const onCreated = useCallback((id: string) => navigate(`/chat/${id}`, { replace: true }), [navigate]);
  const chat = useChat(activeId, onCreated);

  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(
    async (text: string, mode: 'text' | 'sign') => {
      const ok = await chat.send(text, mode);
      if (ok) {
        setDraft('');
        setTyping(false);
      }
      return ok;
    },
    [chat],
  );

  // Pertanyaan dari halaman lain (sekali saja).
  const incoming = useRef<IncomingState>(location.state as IncomingState);
  useEffect(() => {
    const st = incoming.current;
    if (!st?.prompt) return;
    incoming.current = null;
    navigate(location.pathname, { replace: true, state: null });
    if (st.autoSend) void send(st.prompt, 'text');
    else {
      setDraft(st.prompt);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        const len = st.prompt?.length ?? 0;
        inputRef.current?.setSelectionRange(len, len);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Chat baru" dari sidebar / tab Tanya saat sudah di /chat: kosongkan kolom.
  useEffect(() => {
    if (!activeId) setDraft('');
  }, [activeId]);

  // Percakapan ikut gulir halaman, jadi pesan baru dikejar lewat window. Beranda dilewati.
  useLayoutEffect(() => {
    if (chat.messages.length === 0 && !chat.sending) return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, chat.sending]);

  const cancelSpeech = tts.cancel;
  useEffect(() => cancelSpeech, [cancelSpeech, activeId]);

  const empty = !activeId && chat.messages.length === 0;
  // Layar kecil: beranda punya banner sendiri (tanpa bar atas); percakapan juga tanpa tab bawah.
  useShellChrome({ mobileHeader: false, mobileNav: empty });

  const mood: MascotMood = chat.sending || chat.uploading ? 'thinking' : typing ? 'typing' : 'idle';
  const active = chat.sessions.find((s) => s.id === activeId);
  const lastAssistantId = [...chat.messages].reverse().find((m) => m.role === 'assistant')?.id;

  const composer = (
    <>
      <AnimatePresence>{chat.error && <ErrorNote text={chat.error} onClose={chat.clearError} />}</AnimatePresence>
      <DocumentChips docs={chat.documents} uploading={chat.uploading} />
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={send}
        sending={chat.sending}
        uploading={chat.uploading}
        onUpload={(f) => void chat.upload(f)}
        onTyping={setTyping}
        waveOnMount={empty}
        inputRef={inputRef}
        placeholder={chat.documents.length ? 'Tanya isi materi PDF-mu…' : 'Tanya apa saja…'}
      />
    </>
  );

  // ---------- A. beranda
  if (empty) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <HomeBanner mood={mood} />
        <ContinueCard />

        <section className="px-5 pt-7 lg:px-0" aria-labelledby="coba-tanya">
          <h2 id="coba-tanya" className="text-[0.9375rem] font-black uppercase tracking-[0.06em] text-ink">
            Coba tanya ini
          </h2>
          <ul className="mt-3 overflow-hidden rounded-[20px] border border-line bg-white px-4">
            {QUICK_PROMPTS.map((p, i) => (
              <motion.li
                key={p.text}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="border-b border-line last:border-b-0"
              >
                <button
                  type="button"
                  disabled={chat.sending}
                  onClick={() => void send(p.text, 'text')}
                  className="flex w-full items-center gap-4 py-4 text-left transition-opacity disabled:opacity-50"
                >
                  <Tag tone={p.tone}>{p.tag}</Tag>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-ink">{p.text}</span>
                    <span className="block text-sm text-ink-2">{p.hint}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </ul>
        </section>

        <div className="flex-1" />
        {/* Kolom tanya menempel di atas tab bawah (layar kecil) / tepi bawah layar (desktop). */}
        <div className="sticky bottom-16 z-10 mt-6 bg-gradient-to-t from-sand from-70% to-transparent px-4 pb-3 pt-4 lg:bottom-0 lg:px-0 lg:pb-5">{composer}</div>
        <div className="h-16 lg:hidden" aria-hidden="true" />
      </div>
    );
  }

  // ---------- B. percakapan
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col bg-sand">
      <ChatHeader
        title={active?.title ?? 'Percakapan baru'}
        canEdit={!!active}
        onBack={() => navigate('/chat')}
        onRename={(t) => active && void chat.rename(active.id, t)}
        onDelete={async () => {
          if (!active) return false;
          const ok = await chat.remove(active.id);
          if (ok) navigate('/chat', { replace: true });
          return ok;
        }}
      />

      <div className="flex-1 px-5 pb-4 pt-5 lg:px-2" aria-live="polite" aria-busy={chat.sending}>
        {chat.lastModel === 'offline' && <p className="mb-4 rounded-xl bg-cream px-4 py-2.5 text-sm text-ink">Model AI belum tersambung di server.</p>}
        {chat.messagesLoading ? (
          <div className="grid min-h-40 place-items-center text-muted" role="status">
            <LoaderCircle className="size-5 anim-spin" aria-hidden="true" />
            <span className="sr-only">Memuat percakapan…</span>
          </div>
        ) : chat.notFound ? (
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center rounded-[20px] bg-white p-6 text-center">
            <TigerMascot className="h-28 w-24" />
            <p className="mt-3 text-lg font-black text-ink">Percakapan ini sudah tidak ada</p>
            <p className="mt-1 text-[0.9375rem] text-ink-2">Mungkin sudah dihapus. Mulai percakapan baru, yuk.</p>
            <Button className="mt-5" onClick={() => navigate('/chat')}>
              <MessageSquarePlus /> Tanya hal baru
            </Button>
          </div>
        ) : (
          <ol className="flex flex-col gap-6">
            <AnimatePresence initial={false}>
              {chat.messages.map((m) => (
                <Bubble
                  key={m.id}
                  m={m}
                  autoPlay={!!m.fresh && settings.autoPlaySign}
                  busy={chat.sending}
                  onSimplify={() => void send(simplifyPrompt(m.content, m.id === lastAssistantId), 'text')}
                  onRetry={() => void chat.retry(m)}
                  onDiscard={() => chat.discard(m.id)}
                />
              ))}
              {chat.sending && <Typing key="typing" />}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:rounded-t-2xl lg:border-x">
        {composer}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- beranda

function HomeBanner({ mood }: { mood: MascotMood }) {
  const { profile } = useAuth();
  const { displayName } = useDisplayName(profile);
  const firstName = displayName.split(' ')[0] ?? '';
  return (
    <section className="relative isolate overflow-hidden bg-tiger px-5 pb-16 pt-5 lg:rounded-3xl lg:px-8 lg:pb-14 lg:pt-8">
      <div className="flex items-center justify-between lg:hidden">
        <Logo />
        <NavLink to="/profil" aria-label="Profil dan pengaturan">
          <Avatar name={firstName} photoUrl={profile?.photoUrl} className="size-11" textClassName="text-sm" />
        </NavLink>
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative z-10 mt-7 max-w-[15rem] sm:max-w-xs lg:mt-0">
        <h1 className="text-[1.625rem] font-black uppercase leading-[1.1] text-ink lg:text-[2.25rem]">Mau belajar apa hari ini?</h1>
        {firstName && (
          <p className="mt-2 text-base text-ink">
            Halo, {firstName}
            {profile?.className ? ` · kelas ${profile.className}` : ''}
          </p>
        )}
      </motion.div>
      <TigerMascot mood={mood} className="absolute -bottom-6 right-1 h-[10rem] w-[8.5rem] lg:right-8 lg:h-[12rem] lg:w-[10rem]" />
    </section>
  );
}

/** Kartu "Lanjutkan" menempel di banner: video terakhir yang belum selesai ditonton. */
function ContinueCard() {
  const { profile } = useAuth();
  const store = useMateriStore(profile?.id ?? 'anon');
  const last = store.recent
    .map((r) => ({ m: MATERI.find((x) => x.id === r.id), p: store.progress[r.id] }))
    .find((x) => x.m && !x.p?.done);
  if (!last?.m) return <div className="h-2" />;
  const m = last.m;
  const section = last.p?.section ?? 0;
  return (
    <Link
      to={`/video/${m.id}`}
      className="relative z-10 mx-5 -mt-10 flex items-center gap-4 rounded-[20px] bg-white p-3 pr-4 shadow-[0_10px_28px_rgba(31,27,22,0.10)] transition-transform hover:-translate-y-0.5 lg:mx-6"
    >
      <span className={cn('relative aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br', m.bg)}>
        <SignerAvatar tone={m.tone} animated={false} className="absolute inset-x-[22%] bottom-0 top-[12%]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-ink">Lanjutkan: {m.title}</span>
        <span className="block truncate text-sm text-ink-2">
          Video {m.subject} · berhenti di {clock(sectionStart(m, section))}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

const TAG_TONE: Record<PromptTone, string> = {
  ipa: 'bg-cap-soft text-cap',
  mtk: 'bg-cream text-tiger-ink',
  umum: 'bg-[#fff6d1] text-[#8a6a00]',
  latihan: 'bg-ok-soft text-ok-ink',
};

function Tag({ tone, children }: { tone: PromptTone; children: string }) {
  return (
    <span aria-hidden="true" className={cn('grid size-12 shrink-0 place-items-center rounded-xl text-base font-bold', TAG_TONE[tone])}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- bar percakapan

function ChatHeader({
  title,
  canEdit,
  onBack,
  onRename,
  onDelete,
}: {
  title: string;
  canEdit: boolean;
  onBack: () => void;
  onRename: (title: string) => void;
  onDelete: () => Promise<boolean>;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !menuBtn.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const save = () => {
    const t = name.trim();
    if (t && t !== title) onRename(t);
    setEditing(false);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-1 border-b border-line bg-white px-2 lg:rounded-b-2xl lg:border-x">
      <button type="button" onClick={onBack} aria-label="Kembali ke beranda Tanya" className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-sand">
        <ChevronLeft className="size-7" strokeWidth={1.8} aria-hidden="true" />
      </button>
      {editing ? (
        <form
          className="min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor="chat-title" className="sr-only">
            Nama percakapan
          </label>
          <input
            id="chat-title"
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            className="h-11 w-full rounded-xl border-2 border-ink px-3 text-lg font-semibold text-ink focus:outline-none"
          />
        </form>
      ) : (
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold text-ink">{title}</h1>
      )}
      {canEdit && (
        <div className="relative">
          <button
            ref={menuBtn}
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Menu percakapan"
            aria-haspopup="menu"
            aria-expanded={menu}
            className="grid size-11 place-items-center rounded-full text-ink hover:bg-sand"
          >
            <EllipsisVertical className="size-6" strokeWidth={2.2} aria-hidden="true" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                ref={menuRef}
                role="menu"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-12 z-30 w-52 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-soft"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setName(title);
                    setEditing(true);
                  }}
                  className="flex h-11 w-full items-center gap-3 px-4 text-[0.9375rem] text-ink hover:bg-sand"
                >
                  <Pencil className="size-4" aria-hidden="true" /> Ganti nama
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setFailed(false);
                    setConfirm(true);
                  }}
                  className="flex h-11 w-full items-center gap-3 px-4 text-[0.9375rem] text-rec hover:bg-rec-soft"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Hapus percakapan
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <DeleteChatDialog
        open={confirm}
        title={title}
        deleting={deleting}
        failed={failed}
        onCancel={() => {
          setConfirm(false);
          menuBtn.current?.focus();
        }}
        onConfirm={async () => {
          setDeleting(true);
          const ok = await onDelete();
          setDeleting(false);
          if (ok) setConfirm(false);
          else setFailed(true);
        }}
      />
    </header>
  );
}
