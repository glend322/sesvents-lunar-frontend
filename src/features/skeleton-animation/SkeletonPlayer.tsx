import { useEffect, useMemo, useRef, useState } from 'react';
import type { SignerTone } from '@/components/ui/signer-avatar';
import { SKELETON } from './skeleton.config';
import { buildTimeline, F, frameAt, P, type HandState } from './processSkeleton';
import type { Pt, SkeletonClip } from './types';

/**
 * Pemutar animasi peraga BISINDO dari rekaman asli (WL-BISINDO).
 * Ditampilkan TIDAK di-mirror, sama seperti di video aslinya: pengguna melihat peraga isyarat
 * seperti orang yang berdiri di depannya, dengan wujud karakter ilustrasi selaras SignerAvatar
 * namun tetap mempertahankan presisi 21 titik sendi jari BISINDO.
 */
const HAND_BONES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const PALM_RING = [0, 1, 5, 9, 13, 17] as const;
const TIPS = new Set([4, 8, 12, 16, 20]);

/** Hitung total durasi pemutaran kalimat klip dalam detik (termasuk hold awal & akhir). */
export function useClipsDurationSec(clips: SkeletonClip[], speed: number = SKELETON.speed): number {
  const data = useMemo(() => (clips.length > 0 ? buildTimeline(clips) : null), [clips]);
  if (!data) return 0;
  return (SKELETON.holdStartMs + data.durationMs / speed + SKELETON.holdEndMs) / 1000;
}

type Props = {
  /** Satu klip = satu kata. Beberapa klip = kalimat, diputar bersambung. Harus referensi stabil (useMemo). */
  clips: SkeletonClip[];
  /** Ganti angka ini untuk memutar ulang / melompat ke posisi `startProgress`. */
  run?: number;
  onProgress?: (p: number) => void;
  /** Indeks klip (kata) yang sedang diperagakan. */
  onSegment?: (i: number) => void;
  onDone?: () => void;
  /** Kecepatan putar (1 = asli). Default SKELETON.speed. */
  speed?: number;
  /**
   * Mulai dari posisi ini (0..1 dari total durasi), untuk melanjutkan setelah jeda atau melompat
   * ke detik tertentu. Dibaca setiap kali pemutaran/seek dipicu (`run`).
   */
  startProgress?: number;
  /** true = tahan di posisi `startProgress` (jeda / sedang digeser di seekbar), tanpa menjalankan waktu. */
  paused?: boolean;
  /** Warna baju karakter agar selaras dengan thumbnail materi. */
  tone?: SignerTone;
  className?: string;
};

export function SkeletonPlayer({
  clips,
  run = 0,
  onProgress,
  onSegment,
  onDone,
  speed = SKELETON.speed,
  startProgress = 0,
  paused = false,
  tone = 'brand',
  className,
}: Props) {
  const data = useMemo(() => buildTimeline(clips), [clips]);
  const [t, setT] = useState(0);
  const cb = useRef({ onProgress, onSegment, onDone });
  cb.current = { onProgress, onSegment, onDone };
  const from = useRef(startProgress);
  from.current = startProgress;
  const seg = useRef(-1);

  useEffect(() => {
    const total = SKELETON.holdStartMs + data.durationMs / speed + SKELETON.holdEndMs;
    const clipAt = (elapsed: number) => Math.min(data.durationMs, Math.max(0, (elapsed - SKELETON.holdStartMs) * speed));
    const clamped = Math.min(0.999, Math.max(0, from.current));
    const offset = clamped * total;
    const initialClipT = clipAt(offset);
    setT(initialClipT);
    const initialSeg = Math.max(0, data.spans.findIndex((s) => initialClipT <= s.end));
    if (initialSeg !== seg.current) {
      seg.current = initialSeg;
      cb.current.onSegment?.(initialSeg);
    }
    if (paused) {
      cb.current.onProgress?.(clamped);
      return;
    }
    const t0 = performance.now() - offset;
    let raf = 0;
    let done = false;
    const tick = (now: number) => {
      const elapsed = now - t0;
      const clipT = clipAt(elapsed);
      setT(clipT);
      cb.current.onProgress?.(Math.min(1, elapsed / total));
      const i = Math.max(0, data.spans.findIndex((s) => clipT <= s.end));
      if (i !== seg.current) {
        seg.current = i;
        cb.current.onSegment?.(i);
      }
      if (elapsed >= total) {
        if (!done) cb.current.onDone?.();
        done = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, run, speed, paused]);

  const f = frameAt(data, t);
  const sw = data.shoulderW;
  const { x, y, w, h } = data.viewBox;
  const C = SKELETON.colors;
  const T = SKELETON.tones[tone];
  const pose = f.pose;
  const bottom = y + h + sw * 1.1;

  // rSh berada di sisi kiri layar (x lebih kecil), lSh di sisi kanan layar (x lebih besar)
  const leftSh = pose[P.rSh][0] <= pose[P.lSh][0] ? pose[P.rSh] : pose[P.lSh];
  const rightSh = pose[P.rSh][0] <= pose[P.lSh][0] ? pose[P.lSh] : pose[P.rSh];
  const shMid: Pt = [(leftSh[0] + rightSh[0]) / 2, (leftSh[1] + rightSh[1]) / 2];

  // Pusat kepala untuk menyambung leher secara alami mengikuti anggukan/kemiringan kepala
  const headCx = (f.face[F.lEar][0] + f.face[F.rEar][0]) / 2;
  const headCy = (f.face[F.lEye][1] + f.face[F.rEye][1]) / 2;

  // Baju dan bahu melengkung halus seperti SignerAvatar
  const torsoLeft = leftSh[0] - sw * 0.22;
  const torsoRight = rightSh[0] + sw * 0.22;
  const torsoPath = [
    `M ${torsoLeft} ${bottom}`,
    `C ${torsoLeft} ${leftSh[1] + sw * 0.16}, ${leftSh[0] - sw * 0.08} ${leftSh[1] - sw * 0.09}, ${shMid[0]} ${shMid[1] - sw * 0.07}`,
    `C ${rightSh[0] + sw * 0.08} ${rightSh[1] - sw * 0.09}, ${torsoRight} ${rightSh[1] + sw * 0.16}, ${torsoRight} ${bottom}`,
    'Z',
  ].join(' ');
  const collarW = sw * 0.19;
  const collarY = shMid[1] - sw * 0.05;
  const collarPath = `M ${shMid[0] - collarW} ${collarY} Q ${shMid[0]} ${collarY + sw * 0.15} ${shMid[0] + collarW} ${collarY}`;

  // Lengan bawah disambung ke pergelangan tangan (lebih tepat dari pergelangan pose) bila tangan terlihat.
  const wrist = (slot: 0 | 1, poseIdx: number): Pt => {
    const hs = f.hands[slot];
    return hs && hs.alpha > 0.5 ? hs.pts[0] : pose[poseIdx];
  };
  const rWrist = wrist(1, P.rWr);
  const lWrist = wrist(0, P.lWr);

  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`Animasi isyarat BISINDO: ${clips.map((c) => c.text).join(' ')}`}
    >
      {/* leher warna kulit */}
      <line
        x1={shMid[0]}
        y1={shMid[1] + sw * 0.06}
        x2={headCx}
        y2={headCy + sw * 0.14}
        stroke={C.neck}
        strokeWidth={sw * 0.21}
        strokeLinecap="round"
      />

      {/* badan & bahu baju melengkung + kerah */}
      <path d={torsoPath} fill={T.body} />
      <path d={`${collarPath} Z`} fill={C.neck} />
      <path d={collarPath} fill="none" stroke={T.collar} strokeWidth={sw * 0.032} strokeLinecap="round" />

      {/* kepala + rambut karakter */}
      {SKELETON.showFace ? (
        <Head pose={pose} face={f.face} sw={sw} />
      ) : (
        <circle cx={pose[P.nose][0]} cy={pose[P.nose][1] - sw * 0.06} r={sw * 0.34} fill={C.head} />
      )}

      {/* lengan baju (bahu → siku) & lengan bawah warna kulit (siku → pergelangan) */}
      <Arm sh={pose[P.rSh]} el={pose[P.rEl]} wr={rWrist} sw={sw} sleeveColor={T.sleeve} alpha={handAlpha(f.hands[1])} />
      <Arm sh={pose[P.lSh]} el={pose[P.lEl]} wr={lWrist} sw={sw} sleeveColor={T.sleeve} alpha={handAlpha(f.hands[0])} />

      {/* telapak & jari tangan */}
      {f.hands.map((hs, i) => (hs ? <Hand key={i} hand={hs} sw={sw} /> : null))}
    </svg>
  );
}

function Arm({ sh, el, wr, sw, sleeveColor, alpha }: { sh: Pt; el: Pt; wr: Pt; sw: number; sleeveColor: string; alpha: number }) {
  const C = SKELETON.colors;
  // Lengan baju menutup bahu hingga sedikit sebelum siku; lengan bawah warna kulit berlanjut ke pergelangan.
  const sleeveEnd: Pt = [sh[0] + (el[0] - sh[0]) * 0.72, sh[1] + (el[1] - sh[1]) * 0.72];
  return (
    <g opacity={alpha} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* lengan bawah (kulit + garis tepi halus agar kontras di depan wajah maupun baju) */}
      <path d={`M ${sleeveEnd[0]} ${sleeveEnd[1]} L ${el[0]} ${el[1]} L ${wr[0]} ${wr[1]}`} stroke={C.outline} strokeOpacity={0.42} strokeWidth={sw * 0.148} />
      <path d={`M ${sleeveEnd[0]} ${sleeveEnd[1]} L ${el[0]} ${el[1]} L ${wr[0]} ${wr[1]}`} stroke={C.forearm} strokeWidth={sw * 0.124} />
      {/* lengan baju atas */}
      <line x1={sh[0]} y1={sh[1]} x2={sleeveEnd[0]} y2={sleeveEnd[1]} stroke={sleeveColor} strokeWidth={sw * 0.195} />
    </g>
  );
}

/**
 * Kepala karakter selaras SignerAvatar: telinga, wajah hangat, rambut cokelat ikut miring bersama kepala,
 * alis lembut, mata, hidung, dan senyum ramah. Digambar SEBELUM lengan & tangan agar isyarat yang
 * menyentuh wajah tetap tampil jelas di depan muka.
 */
function Head({ pose, face, sw }: { pose: Pt[]; face: Pt[]; sw: number }) {
  const C = SKELETON.colors;
  const n = pose[P.nose];
  const lEar = face[F.lEar];
  const rEar = face[F.rEar];
  const earDist = Math.hypot(lEar[0] - rEar[0], lEar[1] - rEar[1]);
  const rx = Math.min(sw * 0.3, Math.max(sw * 0.185, (earDist / 2) * 1.06));
  const ry = rx * 1.24;
  const cx = (lEar[0] + rEar[0]) / 2;
  const cy = (face[F.lEye][1] + face[F.rEye][1]) / 2;
  const tilt = (Math.atan2(lEar[1] - rEar[1], lEar[0] - rEar[0]) * 180) / Math.PI;
  const eyeR = sw * 0.026;
  const mL = face[F.lMouth];
  const mR = face[F.rMouth];
  const mMid: Pt = [(mL[0] + mR[0]) / 2, (mL[1] + mR[1]) / 2 + sw * 0.028];

  // Siluet rambut melengkung di puncak kepala & pelipis (mengikuti proporsi SignerAvatar)
  const hairPath = [
    `M ${cx - rx * 1.03} ${cy + ry * 0.06}`,
    `C ${cx - rx * 1.14} ${cy - ry * 0.92}, ${cx - rx * 0.52} ${cy - ry * 1.16}, ${cx} ${cy - ry * 1.16}`,
    `C ${cx + rx * 0.52} ${cy - ry * 1.16}, ${cx + rx * 1.14} ${cy - ry * 0.92}, ${cx + rx * 1.03} ${cy + ry * 0.06}`,
    `C ${cx + rx * 0.92} ${cy - ry * 0.38}, ${cx + rx * 0.48} ${cy - ry * 0.62}, ${cx} ${cy - ry * 0.62}`,
    `C ${cx - rx * 0.48} ${cy - ry * 0.62}, ${cx - rx * 0.92} ${cy - ry * 0.38}, ${cx - rx * 1.03} ${cy + ry * 0.06}`,
    'Z',
  ].join(' ');

  return (
    <g>
      {[lEar, rEar].map(([ex, ey], i) => (
        <ellipse key={i} cx={ex} cy={ey} rx={sw * 0.042} ry={sw * 0.072} transform={`rotate(${tilt} ${ex} ${ey})`} fill={C.ear} />
      ))}
      <g transform={`rotate(${tilt} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.head} />
        <path d={hairPath} fill={C.hair} />
      </g>
      {[face[F.lEye], face[F.rEye]].map(([ex, ey], i) => (
        <g key={i}>
          <path
            d={`M ${ex - sw * 0.036} ${ey - sw * 0.048} Q ${ex} ${ey - sw * 0.064} ${ex + sw * 0.036} ${ey - sw * 0.048}`}
            fill="none"
            stroke={C.hair}
            strokeWidth={sw * 0.018}
            strokeLinecap="round"
          />
          <circle cx={ex} cy={ey} r={eyeR} fill={C.face} />
        </g>
      ))}
      <circle cx={n[0]} cy={n[1]} r={sw * 0.02} fill={C.ear} opacity={0.9} />
      <path
        d={`M ${mL[0]} ${mL[1]} Q ${mMid[0]} ${mMid[1]} ${mR[0]} ${mR[1]}`}
        fill="none"
        stroke={C.face}
        strokeWidth={sw * 0.026}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Lengan ikut redup bersama tangan yang istirahat, tapi tidak pernah hilang total. */
function handAlpha(h: HandState | null) {
  return 0.45 + 0.55 * (h?.alpha ?? SKELETON.restingAlpha);
}

function Hand({ hand, sw }: { hand: HandState; sw: number }) {
  const C = SKELETON.colors;
  const p = hand.pts;
  const palmPoints = PALM_RING.map((idx) => `${p[idx][0]},${p[idx][1]}`).join(' ');
  return (
    <g opacity={hand.alpha}>
      {/* siluet telapak tangan */}
      <polygon
        points={palmPoints}
        fill={C.head}
        stroke={C.outline}
        strokeOpacity={0.45}
        strokeWidth={sw * 0.022}
        strokeLinejoin="round"
      />
      {/* jari tangan berbentuk bulat warna kulit dengan garis tepi agar tiap jari tetap terpisah jelas */}
      <g stroke={C.outline} strokeOpacity={0.55} strokeWidth={sw * 0.066} strokeLinecap="round">
        {HAND_BONES.map(([a, b]) => (
          <line key={`o-${a}-${b}`} x1={p[a][0]} y1={p[a][1]} x2={p[b][0]} y2={p[b][1]} />
        ))}
      </g>
      <g stroke={C.head} strokeWidth={sw * 0.046} strokeLinecap="round">
        {HAND_BONES.map(([a, b]) => (
          <line key={`f-${a}-${b}`} x1={p[a][0]} y1={p[a][1]} x2={p[b][0]} y2={p[b][1]} />
        ))}
      </g>
      {/* panduan sendi halus agar artikulasi 21 titik BISINDO tetap tajam dibaca */}
      <g stroke={C.bone} strokeOpacity={0.55} strokeWidth={sw * 0.013} strokeLinecap="round">
        {HAND_BONES.map(([a, b]) => (
          <line key={`b-${a}-${b}`} x1={p[a][0]} y1={p[a][1]} x2={p[b][0]} y2={p[b][1]} />
        ))}
      </g>
      {p.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={sw * (TIPS.has(i) ? 0.022 : 0.015)}
          fill={TIPS.has(i) ? C.tip : C.joint}
          fillOpacity={TIPS.has(i) ? 0.95 : 0.75}
        />
      ))}
    </g>
  );
}
