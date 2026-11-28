import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Ikon penanda opsional di sisi kiri dalam field. */
  icon?: ReactNode;
  /** Field password. */
  password?: boolean;
  /** Tampilkan tombol mata untuk melihat password (opsional). */
  showPasswordToggle?: boolean;
  /** Durasi (ms) password terlihat sebelum otomatis disembunyikan lagi (default 3000 ms). */
  passwordRevealMs?: number;
  /** Teks petunjuk di bawah input (mis. "Minimal 8 huruf atau angka."). */
  hint?: ReactNode;
  /** Pesan kesalahan khusus field ini. */
  error?: string | null;
};

/**
 * Field form dengan label terkait.
 * Kolom aktif: garis hitam tebal + bayangan krem tipis (focus:border-2 focus:border-ink focus:shadow-[0_0_0_4px_var(--color-cream)]).
 */
export function Field({
  label,
  icon,
  password = false,
  showPasswordToggle = false,
  passwordRevealMs = 3000,
  hint,
  error,
  className,
  type = 'text',
  ...rest
}: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible || !passwordRevealMs) return;
    const timer = window.setTimeout(() => setVisible(false), passwordRevealMs);
    return () => window.clearTimeout(timer);
  }, [visible, passwordRevealMs]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-semibold text-ink">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute left-4 top-1/2 grid -translate-y-1/2 place-items-center text-muted"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          id={id}
          type={password ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'h-13 w-full rounded-xl border-[1.5px] bg-white text-base text-ink placeholder:text-[#a39b90] transition-shadow sm:h-14',
            // Kolom aktif: garis hitam tebal + bayangan krem tipis (bukan glow berwarna).
            'focus:border-2 focus:border-ink focus:shadow-[0_0_0_4px_var(--color-cream)] focus:outline-none',
            icon ? 'pl-12' : 'pl-4',
            password && showPasswordToggle ? 'pr-12' : 'pr-4',
            error ? 'border-rec focus:border-rec' : 'border-line',
            className,
          )}
          {...rest}
        />

        {password && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Sembunyikan password' : 'Perlihatkan password'}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-[10px] text-muted transition-colors hover:bg-sand hover:text-ink"
          >
            {visible ? <Eye className="size-[1.1rem]" aria-hidden="true" /> : <EyeOff className="size-[1.1rem]" aria-hidden="true" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-rec">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[0.8125rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
