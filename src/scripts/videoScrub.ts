/**
 * Scroll-driven video scrubbing.
 *
 * Seeking a <video> with currentTime is jerky: the browser only lands on
 * keyframes while it decodes. So we decode the whole clip once with WebCodecs,
 * keep every frame as a webp blob, and paint the nearest one to a canvas.
 * The video element stays underneath and handles scrubbing until the bank is
 * ready — and permanently if WebCodecs, CORS or the decoder fail.
 */

/** Exponential-decay rate for the scrub lerp. Higher = snappier. */
const LERP_TAU = 8;
/** Below this delta (seconds) stop easing and land exactly on target. */
const SNAP = 0.002;
/** Decoded bitmaps kept resident. */
const LRU_MAX = 24;
/** Max chunks in flight, so decoding never outruns webp encoding. */
const LEAD = 24;
/** If the bank is not ready by now, give up and scrub the video element. */
const WATCHDOG = 60000;

type Frame = { ts: number; blob: Blob };

type MP4Sample = {
  cts: number;
  duration: number;
  timescale: number;
  is_sync: boolean;
  data: Uint8Array;
};

export type ScrubOptions = {
  container: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  src: string;
  onProgress: (p: number) => void;
  onCanvasLive: (live: boolean) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Closest frame to `t` seconds. Bank timestamps are microseconds. */
function nearestIndex(bank: Frame[], t: number): number {
  if (bank.length === 0) return -1;
  const target = t * 1e6;
  let lo = 0;
  let hi = bank.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bank[mid].ts < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(bank[lo - 1].ts - target) <= Math.abs(bank[lo].ts - target)) return lo - 1;
  return lo;
}

function createSurface() {
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(1, 1);
    const ctx = c.getContext('2d');
    if (ctx) {
      return {
        resize: (w: number, h: number) => {
          if (c.width !== w || c.height !== h) {
            c.width = w;
            c.height = h;
          }
        },
        draw: (f: CanvasImageSource) => ctx.drawImage(f, 0, 0),
        toBlob: () => c.convertToBlob({ type: 'image/webp', quality: 0.82 }),
      };
    }
  }
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  return {
    resize: (w: number, h: number) => {
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
    },
    draw: (f: CanvasImageSource) => ctx.drawImage(f, 0, 0),
    toBlob: () =>
      new Promise<Blob>((resolve, reject) => {
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/webp', 0.82);
      }),
  };
}

export function initVideoScrub(opts: ScrubOptions) {
  const { container, video, canvas, src, onProgress, onCanvasLive } = opts;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let bank: Frame[] = [];
  const lru = new Map<number, ImageBitmap>();
  const warming = new Set<number>();

  let current = 0;
  let target = 0;
  let dur = 0;
  let span = 1;
  let ready = false;
  let painted = false;
  let disposed = false;

  /* ---- scroll span ---- */
  const measure = () => {
    span = Math.max(1, container.offsetHeight - window.innerHeight);
  };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);

  /* ---- duration ---- */
  const onMeta = () => {
    if (Number.isFinite(video.duration) && video.duration > 0) dur = video.duration;
  };
  if (video.readyState >= 1) onMeta();
  video.addEventListener('loadedmetadata', onMeta);

  /* ---- paint ---- */
  const warm = (i: number) => {
    for (let k = i - 1; k <= i + 2; k++) {
      if (k < 0 || k >= bank.length || lru.has(k) || warming.has(k)) continue;
      warming.add(k);
      createImageBitmap(bank[k].blob)
        .then((bm) => {
          lru.set(k, bm);
          while (lru.size > LRU_MAX) {
            const oldest = lru.keys().next().value as number | undefined;
            if (oldest === undefined) break;
            lru.get(oldest)?.close();
            lru.delete(oldest);
          }
        })
        .catch(() => undefined)
        .finally(() => warming.delete(k));
    }
  };

  const drawNearest = (t: number) => {
    const i = nearestIndex(bank, t);
    if (i < 0) return;
    warm(i);
    const bm = lru.get(i);
    if (!bm) return;
    lru.delete(i);
    lru.set(i, bm);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(bm, 0, 0, canvas.width, canvas.height);
    if (!painted) {
      painted = true;
      onCanvasLive(true);
    }
  };

  const fallbackSeek = (t: number) => {
    if (video.seeking) return;
    if (Math.abs(video.currentTime - t) > 0.01) video.currentTime = t;
  };

  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    const p = clamp(window.scrollY / span, 0, 1);
    onProgress(p);

    if (dur > 0) {
      target = p * dur;
      if (reduced) {
        current = target;
      } else {
        current += (target - current) * (1 - Math.exp(-dt * LERP_TAU));
        if (Math.abs(target - current) < SNAP) current = target;
      }
      if (ready) drawNearest(current);
      else fallbackSeek(current);
    }

    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  /* ---- frame bank ---- */
  let watchdog = 0;
  let sourceBuffer: ArrayBuffer | null = null;

  const revert = () => {
    ready = false;
    painted = false;
    onCanvasLive(false);
  };

  const build = async (preferSoftware: boolean): Promise<void> => {
    if (disposed) return;
    const MP4Box = (await import('mp4box')).default as any;

    if (!sourceBuffer) {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      sourceBuffer = await res.arrayBuffer();
    }
    if (disposed) return;

    const file = MP4Box.createFile();
    const out: Frame[] = [];
    const queue: MP4Sample[] = [];
    const surface = createSurface();
    const pendingFrames: VideoFrame[] = [];

    let decoder: VideoDecoder | null = null;
    let nbSamples = 0;
    let received = 0;
    let flushed = false;
    let inFlight = 0;
    let encoding = false;

    const settle = new Promise<void>((resolve, reject) => {
      const fail = (e: unknown) => reject(e instanceof Error ? e : new Error(String(e)));

      const pump = () => {
        if (!decoder || decoder.state !== 'configured') return;
        while (queue.length > 0 && decoder.decodeQueueSize + inFlight < LEAD) {
          const s = queue.shift()!;
          try {
            decoder.decode(
              new EncodedVideoChunk({
                type: s.is_sync ? 'key' : 'delta',
                timestamp: (1e6 * s.cts) / s.timescale,
                duration: (1e6 * s.duration) / s.timescale,
                data: s.data,
              }),
            );
          } catch (e) {
            fail(e);
            return;
          }
        }
        if (!flushed && queue.length === 0 && nbSamples > 0 && received >= nbSamples && inFlight === 0) {
          flushed = true;
          decoder.flush().then(() => resolve()).catch(fail);
        }
      };

      const drainEncode = async () => {
        if (encoding) return;
        encoding = true;
        while (pendingFrames.length > 0) {
          const frame = pendingFrames.shift()!;
          try {
            const ts = frame.timestamp;
            surface.resize(frame.displayWidth, frame.displayHeight);
            surface.draw(frame);
            frame.close();
            out.push({ ts, blob: await surface.toBlob() });
          } catch {
            try {
              frame.close();
            } catch {
              /* already closed */
            }
          }
          inFlight--;
          pump();
        }
        encoding = false;
      };

      decoder = new VideoDecoder({
        output: (frame) => {
          inFlight++;
          pendingFrames.push(frame);
          void drainEncode();
        },
        error: fail,
      });

      file.onError = (e: string) => fail(new Error(e));

      file.onReady = (info: any) => {
        const vt = info.videoTracks[0];
        if (!vt) return fail(new Error('mp4: no video track'));
        nbSamples = vt.nb_samples;
        try {
          const trak = file.getTrackById(vt.id);
          let description: Uint8Array | null = null;
          for (const entry of trak.mdia.minf.stbl.stsd.entries) {
            const box = entry.avcC ?? entry.hvcC ?? entry.vpcC ?? entry.av1C;
            if (box) {
              const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
              box.write(stream);
              // Drop the 8-byte box header; VideoDecoder wants the payload.
              description = new Uint8Array(stream.buffer, 8);
              break;
            }
          }
          if (!description) return fail(new Error('mp4: no codec description'));
          const config: VideoDecoderConfig = {
            codec: vt.codec,
            description,
            codedWidth: vt.video.width,
            codedHeight: vt.video.height,
          };
          if (preferSoftware) config.hardwareAcceleration = 'prefer-software';
          decoder!.configure(config);
        } catch (e) {
          return fail(e);
        }
        file.setExtractionOptions(vt.id, null, { nbSamples: Infinity });
        file.start();
      };

      file.onSamples = (_id: number, _user: unknown, samples: MP4Sample[]) => {
        received += samples.length;
        for (const s of samples) queue.push(s);
        pump();
      };
    });

    const buf = sourceBuffer.slice(0) as ArrayBuffer & { fileStart: number };
    buf.fileStart = 0;
    file.appendBuffer(buf);
    file.flush();

    await settle;
    if (disposed) return;

    out.sort((a, b) => a.ts - b.ts);
    bank = out;
    ready = out.length > 0;
    try {
      (decoder as VideoDecoder | null)?.close();
    } catch {
      /* already closed */
    }
    file.stop();
  };

  const run = () => {
    if (disposed) return;
    watchdog = window.setTimeout(() => {
      if (!ready) revert();
    }, WATCHDOG);
    build(false)
      .catch(() => build(true))
      .catch(() => revert())
      .finally(() => window.clearTimeout(watchdog));
  };

  // Building the bank refetches the whole clip and decodes every frame. Not
  // something to force on a metered connection.
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  );

  if (!reduced && !saveData && typeof VideoDecoder !== 'undefined') {
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
  }

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(watchdog);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      window.removeEventListener('load', run);
      video.removeEventListener('loadedmetadata', onMeta);
      for (const bm of lru.values()) bm.close();
      lru.clear();
      bank = [];
    },
  };
}
