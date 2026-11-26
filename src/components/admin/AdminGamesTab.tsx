import React, { useEffect, useState } from 'react';
import { Gamepad2, Gift, Save, Sparkles } from 'lucide-react';
import {
  GF_DEFAULT_CONFIG,
  GfRemoteConfig,
  saveGfConfig,
  subscribeGfConfig,
} from '../../lib/firestoreService';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminGamesTab: React.FC<AdminSharedProps> = ({ theme, currentUser, onToast }) => {
  const t = getThemeClasses(theme);
  const [gfConfig, setGfConfig] = useState<GfRemoteConfig>(GF_DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeGfConfig((cfg) => setGfConfig(cfg));
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGfConfig(currentUser!.uid, gfConfig, 'Updated Golden Flower config');
      onToast('Game configuration saved', 'Golden Flower settings updated', 'success');
    } catch (err) {
      onToast('Failed to save', err instanceof Error ? err.message : 'Unknown error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${t.card} p-4 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Gamepad2 className="w-4 h-4 text-violet-400" />
            Golden Flower & Game Configuration
          </h3>
          <button onClick={handleSave} disabled={saving} className={t.btnPrimary}>
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className={`${t.subCard} p-3 flex items-center justify-between`}>
            <span className={t.textPrimary}>Game Enabled</span>
            <input
              type="checkbox"
              checked={gfConfig.enabled}
              onChange={(e) => setGfConfig({ ...gfConfig, enabled: e.target.checked })}
              className="accent-violet-500"
            />
          </label>
          <div className={`${t.subCard} p-3`}>
            <p className={`text-[10px] mb-1 ${t.textSecondary}`}>Game Status</p>
            <p className={`text-xs font-semibold ${t.textPrimary}`}>
              {gfConfig.enabled ? 'Active' : 'Paused'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.card} p-4 space-y-2`}>
          <h4 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Gift className="w-4 h-4 text-pink-400" /> Gift Catalog & Animations
          </h4>
          <p className={`text-xs ${t.textSecondary}`}>
            Manage virtual gifts, animation tiers, and store items. All gift purchases are validated atomically via Firestore transactions.
          </p>
        </div>
        <div className={`${t.card} p-4 space-y-2`}>
          <h4 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Sparkles className="w-4 h-4 text-amber-400" /> Honor Levels & Rankings
          </h4>
          <p className={`text-xs ${t.textSecondary}`}>
            Honor levels and host/user rankings are computed from verified coin/diamond activity and live room engagement.
          </p>
        </div>
      </div>
    </div>
  );
};
