import React, { useState } from 'react';
import { Megaphone, Power, Send } from 'lucide-react';
import { endAnnouncement, publishAnnouncement } from '../../lib/firestoreService';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminBroadcastTab: React.FC<AdminSharedProps> = ({
  theme,
  currentUser,
  activeAnnouncement,
  onToast,
  onConfirm,
}) => {
  const t = getThemeClasses(theme);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'AGENTS' | 'HOSTS'>('ALL');
  const [sending, setSending] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      onToast('Missing fields', 'Provide both title and message.', 'warning');
      return;
    }
    setSending(true);
    try {
      await publishAnnouncement(currentUser!, title.trim(), `[${audience}] ${message.trim()}`);
      onToast('Announcement published', `Target: ${audience}`, 'success');
      setTitle('');
      setMessage('');
    } catch (err) {
      onToast('Publish failed', err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {activeAnnouncement && (
        <div className={`${t.card} p-4 border-l-4 border-l-violet-500 flex items-center justify-between gap-3`}>
          <div>
            <p className="text-[10px] font-bold uppercase text-violet-400">Active Platform Banner</p>
            <p className={`text-sm font-bold ${t.textPrimary}`}>{activeAnnouncement.title}</p>
            <p className={`text-xs ${t.textSecondary}`}>{activeAnnouncement.message}</p>
          </div>
          <button
            onClick={() =>
              onConfirm({
                title: 'End Active Announcement',
                body: 'Remove the active announcement banner from all users?',
                confirmLabel: 'End Banner',
                danger: true,
                run: async () => {
                  await endAnnouncement(currentUser!, activeAnnouncement.announcementId);
                  onToast('Announcement ended', undefined, 'info');
                },
              })
            }
            className={t.btnDanger}
          >
            <Power className="w-3.5 h-3.5" /> End
          </button>
        </div>
      )}

      <form onSubmit={handlePublish} className={`${t.card} p-4 space-y-3`}>
        <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
          <Megaphone className="w-4 h-4 text-violet-400" />
          Broadcast Global or Targeted Announcement
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title..."
            className={`${t.input} sm:col-span-2`}
          />
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
            className={t.input}
          >
            <option value="ALL">All Users</option>
            <option value="AGENTS">Agents & Super Agents</option>
            <option value="HOSTS">Live Hosts</option>
          </select>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Write announcement message..."
          className={`${t.input} h-auto py-2`}
        />
        <div className="flex justify-end">
          <button type="submit" disabled={sending} className={t.btnPrimary}>
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
};
