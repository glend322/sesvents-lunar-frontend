/**
 * Pengaturan animasi kerangka. Ubah angka di sini, tidak perlu menyentuh komponen.
 */
export const SKELETON = {
  /** 1 = kecepatan asli video. 0.75 = sedikit lebih pelan agar lebih mudah diikuti. */
  speed: 1,
  /** Tahan pose awal sebelum bergerak (ms). */
  holdStartMs: 400,
  /** Tahan pose akhir setelah selesai (ms). */
  holdEndMs: 700,
  /**
   * Kalimat: transisi antar kata (ms). Jeda awal/akhir di atas hanya dipakai di kata pertama & terakhir,
   * dan bagian "tangan turun lalu naik lagi" di sambungan antar kata dipotong supaya terasa satu kalimat.
   */
  transitionMs: 150,
  /** Kalimat: gerak tangan per frame di bawah ini (satuan lebar bahu) dianggap diam & dipotong di sambungan. */
  stillMotion: 0.01,
  /** Kalimat: frame diam yang tetap disisakan di sambungan supaya pose akhir masih terbaca. */
  keepStillFrames: 3,
  /** Celah deteksi tangan sampai sekian frame diisi interpolasi agar tidak berkedip. */
  maxGapFrames: 8,
  /** Tangan dianggap "istirahat" bila pergelangan lebih dari N lebar bahu di bawah garis bahu (aturan ML). */
  restBelowShoulders: 1.35,
  /** Opasitas tangan yang sedang istirahat (0 = disembunyikan). */
  restingAlpha: 0.28,
  /** Jarak tepi tampilan di sekitar badan, dalam satuan lebar bahu. */
  paddingShoulders: 0.45,
  /** Tampilkan muka sederhana (mata, telinga, mulut) supaya letak tangan terhadap wajah jelas. */
  showFace: true,
  colors: {
    /** Mata & mulut. */
    face: '#2B1E16',
    /** Rambut karakter (selaras SignerAvatar). */
    hair: '#4A2E1F',
    /** Kepala & telapak: warna kulit hangat. */
    head: '#F1D5C1',
    /** Leher & bayangan kulit halus. */
    neck: '#E3B99B',
    /** Telinga, sedikit lebih teduh dari kepala. */
    ear: '#E2B48A',
    /** Lengan bawah warna kulit. */
    forearm: '#ECC8AE',
    /** Garis tepi tipis agar lengan/jari tetap terpisah jelas saat menyilang di depan wajah/badan. */
    outline: '#241A14',
    /** Badan bawaan: biru tua. JANGAN sama dengan latar panel (#2A2520), nanti tak terlihat. */
    body: '#2B3A55',
    arm: '#36496B',
    collar: '#3E5378',
    bone: '#FFFFFF',
    joint: '#FFFFFF',
    tip: '#F28A2E',
  },
  tones: {
    brand: { body: '#2B3A55', sleeve: '#36496B', collar: '#465D86' },
    ink: { body: '#35302B', sleeve: '#433D37', collar: '#574F47' },
    violet: { body: '#2E5A9C', sleeve: '#396BB5', collar: '#5282CA' },
  },
} as const;
