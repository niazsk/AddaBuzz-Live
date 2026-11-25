import { RoomMode } from '../types/app';

export interface MediaSessionTokenResponse {
  mode: 'openvidu' | 'local-preview';
  url: string | null;
  token: string | null;
  role: 'host' | 'guest' | 'viewer';
  message?: string;
}

export async function requestMediaSessionToken(params: {
  roomId: string;
  uid: string;
  displayName: string;
  role: 'host' | 'guest' | 'viewer';
}): Promise<MediaSessionTokenResponse> {
  try {
    const res = await fetch('/api/media/session-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      return {
        mode: 'local-preview',
        url: null,
        token: null,
        role: params.role,
        message: 'Media token service unavailable; running local device preview.',
      };
    }
    return (await res.json()) as MediaSessionTokenResponse;
  } catch {
    return {
      mode: 'local-preview',
      url: null,
      token: null,
      role: params.role,
      message: 'Offline or unreachable token API; running local device preview.',
    };
  }
}

export interface LocalMediaHandle {
  stream: MediaStream;
  stop: () => void;
  setAudioMuted: (muted: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
}

const QUALITY_PRESETS = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
} as const;

export type VideoQuality = keyof typeof QUALITY_PRESETS;
export const VIDEO_QUALITIES = Object.keys(QUALITY_PRESETS) as VideoQuality[];

export interface MediaDeviceLists {
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
}

export async function listMediaDevices(): Promise<MediaDeviceLists> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { cameras: [], mics: [] };
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter((d) => d.kind === 'videoinput'),
      mics: devices.filter((d) => d.kind === 'audioinput'),
    };
  } catch {
    return { cameras: [], mics: [] };
  }
}

// User-facing explanation for the common getUserMedia failures so the page
// never dies with a raw DOMException message.
export function describeMediaError(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera / microphone permission denied. Allow access in your browser settings, then press Retry.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone found. Connect a device, then press Retry.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is busy in another app. Close it, then press Retry.';
    case 'OverconstrainedError':
      return 'The selected camera or microphone is unavailable. Pick another device in Settings.';
    case 'AbortError':
      return 'Media capture was interrupted. Press Retry to start again.';
    default:
      return err instanceof Error && err.message
        ? err.message
        : 'Camera / microphone could not be started. Press Retry.';
  }
}

export async function startLocalMediaCapture(options: {
  mode: RoomMode;
  facingMode: 'user' | 'environment';
  cameraDeviceId?: string;
  micDeviceId?: string;
  quality?: VideoQuality;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  onAudioLevel?: (level: number) => void;
}): Promise<LocalMediaHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser media capture is not supported on this device.');
  }

  const wantsVideo = options.mode !== 'AUDIO';
  const preset = QUALITY_PRESETS[options.quality ?? '720p'];
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: options.echoCancellation ?? true,
      noiseSuppression: options.noiseSuppression ?? true,
      ...(options.micDeviceId ? { deviceId: { exact: options.micDeviceId } } : {}),
    },
    video: wantsVideo
      ? {
          ...(options.cameraDeviceId
            ? { deviceId: { exact: options.cameraDeviceId } }
            : { facingMode: options.facingMode }),
          width: { ideal: preset.width },
          height: { ideal: preset.height },
        }
      : false,
  });

  let audioCtx: AudioContext | null = null;
  let rafId: number | null = null;

  if (options.onAudioLevel && stream.getAudioTracks().length > 0) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        options.onAudioLevel?.(normalized);
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    } catch {
      // Audio meter optional if AudioContext blocked
    }
  }

  return {
    stream,
    setAudioMuted: (muted: boolean) => {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    },
    setVideoEnabled: (enabled: boolean) => {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    },
    stop: () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (audioCtx) {
        void audioCtx.close().catch(() => {});
      }
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
