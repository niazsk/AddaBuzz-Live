import React, { useState } from 'react';
import { Bell, CheckCheck, ShieldAlert, X } from 'lucide-react';
import { NotificationItem } from '../../types/app';

interface NotificationsDrawerProps {
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
    >
      <div className="w-full max-w-md bg-[#111420] border-l border-white/12 h-full flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" />
            <h2 className="font-display text-base font-semibold text-white">
              Notifications
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {notifications.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-white">You are all caught up</p>
              <p className="mt-1 text-xs text-slate-400">
                Friend requests, new followers, messages and live invites appear here.
              </p>
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!item.isRead) onMarkRead(item.id);
              }}
              className={`block w-full p-4 text-left space-y-1 transition-colors hover:bg-white/[0.04] ${
                item.isRead ? 'opacity-70' : 'bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <span className="text-[11px] font-mono text-slate-500">
                  {item.timestampLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
              {!item.isRead && (
                <span className="inline-block rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-fuchsia-200">
                  New
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ReportModalProps {
  target: { type: 'ROOM' | 'USER'; id: string; label: string } | null;
  onClose: () => void;
  onSubmitReport: (reason: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  target,
  onClose,
  onSubmitReport,
}) => {
  const [reason, setReason] = useState('Harassment or abusive conduct');

  if (!target) return null;

  const REASONS = [
    'Harassment or abusive conduct',
    'Unsolicited spam or external scam links',
    'Inappropriate audio/video content',
    'Impersonation or misleading account',
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#111420] border border-white/12 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="report-modal-title" className="font-display text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Submit Safety Report</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Target: <span className="text-slate-200 font-medium">{target.label}</span>
        </p>

        <div className="space-y-2">
          {REASONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#090B12] border border-white/[0.08] cursor-pointer text-xs text-slate-200"
            >
              <input
                type="radio"
                name="report-reason"
                checked={reason === option}
                onChange={() => setReason(option)}
                className="accent-violet-600"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs font-medium text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmitReport(reason)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};
