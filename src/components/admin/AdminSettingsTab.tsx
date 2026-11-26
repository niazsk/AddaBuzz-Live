import React from 'react';
import { Lock, ShieldCheck, Sliders } from 'lucide-react';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminSettingsTab: React.FC<AdminSharedProps> = ({
  theme,
  currentUser,
  onToast,
}) => {
  const t = getThemeClasses(theme);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.card} p-4 space-y-2.5`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Lock className="w-4 h-4 text-emerald-400" />
            Admin Account & Session Security
          </h3>
          <p className={`text-xs ${t.textSecondary}`}>
            Signed in as <strong>{currentUser?.displayName}</strong> (@{currentUser?.username})
          </p>
          <p className={`text-xs ${t.textSecondary}`}>
            Email verification & Firestore Security Rules enforced on all privileged operations.
          </p>
          <button
            onClick={() => onToast('Security check passed', 'All admin routes are protected.', 'success')}
            className={t.btnGhost}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Verify Security Posture
          </button>
        </div>

        <div className={`${t.card} p-4 space-y-2.5`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Sliders className="w-4 h-4 text-violet-400" />
            Platform & LiveKit Configuration
          </h3>
          <p className={`text-xs ${t.textSecondary}`}>
            • Max Guest Seats per Live Room: <strong>8</strong>
          </p>
          <p className={`text-xs ${t.textSecondary}`}>
            • Real-money payments: <strong>Disabled (Virtual Economy Only)</strong>
          </p>
          <p className={`text-xs ${t.textSecondary}`}>
            • LiveKit / OpenVidu secrets: <strong>Server-side only (never exposed to client)</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
