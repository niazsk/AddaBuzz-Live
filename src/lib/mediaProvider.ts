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

export async function startLocalMediaCapture(options: {
  mode: RoomMode;
  facingMode: 'user' | 'environment';
  onAudioLevel?: (level: number) => void;
}): Promise<LocalMediaHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser media capture is not supported on this device.');
  }

  const wantsVideo = options.mode !== 'AUDIO';
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: wantsVideo
      ? {
          facingMode: options.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
