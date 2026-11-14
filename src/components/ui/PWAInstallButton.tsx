import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/25 transition-colors'
            : 'w-full h-10 px-3 rounded-xl bg-sky-500/12 border border-sky-400/25 hover:bg-sky-500/20 text-sky-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{compact ? 'Install' : 'Install AddaBuzz App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.12] transition-colors'
              : 'w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.1] text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors'
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0 text-sky-400" />
          <span>{compact ? 'Install' : 'Add to Home Screen'}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-pwa-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-[#111420] border border-white/12 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3
                  id="ios-pwa-title"
                  className="font-display text-base font-bold text-white"
                >
                  Install AddaBuzz Live on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
                <li>
                  Tap the <strong className="text-white">Share</strong> button
                  in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-white">Add</strong> to launch
                  AddaBuzz Live full-screen.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
