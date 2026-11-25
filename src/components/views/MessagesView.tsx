import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Coins,
  Copy,
  CornerUpLeft,
  FileText,
  Forward,
  Gift,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldBan,
  Smile,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  ChatSendPayload,
  Conversation,
  ConversationPrefs,
  DirectMessage,
  GiftCatalogItem,
  MessageKind,
  MessageReplyPreview,
  UserProfile,
} from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { GiftArtwork } from '../ui/GiftArtwork';
import { giftTier, GiftTier, GIFT_BY_ID } from '../../data/gifts';
import { formatRelativeMs, isPresenceOnline } from '../../lib/chatService';

interface MessagesViewProps {
  conversations: Conversation[];
  activeMessages: DirectMessage[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  blockedUids: string[];
  activeConversationId: string | null;
  gifts: GiftCatalogItem[];
  coinBalance: number;
  prefs: ConversationPrefs[];
  presence: Record<string, number>;
  typingUid: string | null;
  isOfflineSimulated: boolean;
  onSelectConversation: (conversationId: string | null) => void;
  onSendMessage: (
    conversationId: string,
    partnerUid: string,
    payload: ChatSendPayload
  ) => Promise<void>;
  onSendDirectGift: (
    conversationId: string,
    partnerUid: string,
    gift: GiftCatalogItem
  ) => Promise<void>;
  onUnblockUser: (uid: string) => void;
  onToggleBlock: (uid: string) => void;
  onReportUser: (user: UserProfile) => void;
  onSetPref: (
    conversationId: string,
    patch: Partial<
      Pick<ConversationPrefs, 'pinned' | 'muted' | 'archived' | 'hidden' | 'clearedAtMs'>
    >
  ) => Promise<void>;
  onDeleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  onUploadMedia: (
    conversationId: string,
    file: File
  ) => Promise<{ url: string; name: string; size: number }>;
  onTyping: (conversationId: string, isTyping: boolean) => void;
  onMarkRead: (conversationId: string) => void;
  onStartDirectMessage: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

const EMOJIS = [
  '😀', '😄', '😅', '😂', '🙂', '😉', '😍', '😘', '😎', '🤩',
  '🥳', '😢', '😭', '😡', '🤝', '👍', '👏', '🙏', '🔥', '💜',
  '💖', '✨', '🎉', '🎁', '🌹', '☕', '🎵', '🎤', '📷', '❤️',
  '👀', '💯',
];

const PANE =
  'rounded-2xl bg-[#111420] border border-white/[0.08] overflow-hidden';

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  action: () => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  conversations,
  activeMessages,
  users,
  currentUser,
  blockedUids,
  activeConversationId,
  gifts,
  coinBalance,
  prefs,
  presence,
  typingUid,
  isOfflineSimulated,
  onSelectConversation,
  onSendMessage,
  onSendDirectGift,
  onUnblockUser,
  onToggleBlock,
  onReportUser,
  onSetPref,
  onDeleteMessage,
  onUploadMedia,
  onTyping,
  onMarkRead,
  onStartDirectMessage,
  onOpenAuth,
}) => {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [listTab, setListTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [showNewChat, setShowNewChat] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [showGiftTray, setShowGiftTray] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>(gifts[0]?.giftId ?? '');
  const [giftTab, setGiftTab] = useState<'all' | GiftTier>('all');
  const [giftBusy, setGiftBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<DirectMessage | null>(null);
  const [replyTo, setReplyTo] = useState<MessageReplyPreview | null>(null);
  const [forwardMessage, setForwardMessage] = useState<DirectMessage | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);
  const typingTimerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const markedReadRef = useRef<string | null>(null);

  const prefByConv = useMemo(
    () => new Map(prefs.map((p) => [p.conversationId, p])),
    [prefs]
  );

  // One row per conversation even if Firestore ever returns a duplicate doc.
  const uniqueConversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    conversations.forEach((c) => {
      if (!map.has(c.conversationId)) map.set(c.conversationId, c);
    });
    return Array.from(map.values());
  }, [conversations]);

  const selectedConv =
    uniqueConversations.find((c) => c.conversationId === activeConversationId) ?? null;

  const getUser = (uid: string) => users.find((u) => u.uid === uid);
  const selectedPartner = selectedConv ? getUser(selectedConv.participantUid) : undefined;
  const selectedPref = selectedConv ? prefByConv.get(selectedConv.conversationId) : undefined;
  const isPartnerBlocked = selectedPartner
    ? blockedUids.includes(selectedPartner.uid)
    : false;

  const visibleMessages = useMemo(() => {
    const clearedAt = selectedPref?.clearedAtMs ?? 0;
    if (!clearedAt) return activeMessages;
    return activeMessages.filter((m) => (m.createdAtMs ?? 0) > clearedAt);
  }, [activeMessages, selectedPref?.clearedAtMs]);

  const lastIncoming = visibleMessages[visibleMessages.length - 1];
  const partnerReadAt = selectedConv?.readAt?.[selectedConv.participantUid] ?? 0;

  useEffect(() => {
    setShowGiftTray(false);
    setMenuOpen(false);
    setReplyTo(null);
    setEmojiOpen(false);
    setError(null);
  }, [selectedConv?.conversationId]);

  // Mark the open thread as read (badge + seen receipts) once per conversation
  // and again whenever a new incoming message arrives.
  useEffect(() => {
    if (!selectedConv || !currentUser) return;
    const key = `${selectedConv.conversationId}:${lastIncoming?.id ?? 'none'}`;
    if (markedReadRef.current === key) return;
    markedReadRef.current = key;
    onMarkRead(selectedConv.conversationId);
  }, [selectedConv?.conversationId, lastIncoming?.id, currentUser?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [visibleMessages.length, activeConversationId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, []);

  const onlineFor = (user?: UserProfile) => {
    if (!user || user.showPresence === false) return false;
    return isPresenceOnline({ uid: user.uid, lastSeenMs: presence[user.uid] ?? 0 });
  };

  const presenceText = (user?: UserProfile): string => {
    if (!user) return 'Offline';
    if (user.showPresence === false) return 'Presence hidden';
    const lastSeen = presence[user.uid] ?? 0;
    if (isPresenceOnline({ uid: user.uid, lastSeenMs: lastSeen })) return 'Active now';
    if (!lastSeen) return 'Offline';
    return `Active ${formatRelativeMs(lastSeen)} ago`;
  };

  const conversationRows = useMemo(() => {
    const rows = uniqueConversations.flatMap((conv) => {
      const pref = prefByConv.get(conv.conversationId);
      if (pref?.hidden) return [];
      const partner = users.find((u) => u.uid === conv.participantUid);
      const clearedAt = pref?.clearedAtMs ?? 0;
      const preview =
        clearedAt && (conv.lastMessageAtMs ?? 0) <= clearedAt
          ? 'Chat cleared'
          : conv.messages[conv.messages.length - 1]?.text ?? 'Open thread';
      return [{ conv, pref, partner, preview, clearedAt }];
    });

    const q = search.trim().toLowerCase();
    return rows
      .filter(({ conv, pref, partner }) => {
        if (listTab === 'archived' && !pref?.archived) return false;
        if (listTab !== 'archived' && pref?.archived) return false;
        if (listTab === 'unread' && conv.unreadCount === 0) return false;
        if (!q) return true;
        return (
          Boolean(partner?.displayName.toLowerCase().includes(q)) ||
          Boolean(partner?.username.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const pinDelta = Number(Boolean(b.pref?.pinned)) - Number(Boolean(a.pref?.pinned));
        if (pinDelta !== 0) return pinDelta;
        return (b.conv.lastMessageAtMs ?? 0) - (a.conv.lastMessageAtMs ?? 0);
      });
  }, [uniqueConversations, prefByConv, search, listTab, users]);

  const unreadTotal = uniqueConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const selectedGift = gifts.find((g) => g.giftId === selectedGiftId) ?? gifts[0] ?? null;
  const visibleGifts =
    giftTab === 'all' ? gifts : gifts.filter((g) => giftTier(g.price) === giftTab);

  if (!currentUser) {
    return (
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
          <p className="mt-1 text-sm text-slate-400">
            Private conversations protected by membership rules.
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-10 text-center">
          <p className="font-display text-base font-semibold text-white">
            Sign in to send and read private messages
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Open sign-in
          </button>
        </div>
      </div>
    );
  }

  const emitTyping = () => {
    if (!selectedConv) return;
    onTyping(selectedConv.conversationId, true);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      onTyping(selectedConv.conversationId, false);
    }, 2500);
  };

  const stopTyping = () => {
    if (!selectedConv) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    onTyping(selectedConv.conversationId, false);
  };

  const sendPayload = async (payload: ChatSendPayload) => {
    if (!selectedConv || !selectedPartner) return;
    if (isPartnerBlocked || isOfflineSimulated) return;
    setBusy(true);
    setError(null);
    try {
      await onSendMessage(selectedConv.conversationId, selectedPartner.uid, payload);
      stopTyping();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    setEmojiOpen(false);
    const payload: ChatSendPayload = { text, replyTo: replyTo ?? undefined };
    setReplyTo(null);
    await sendPayload(payload);
  };

  const uploadAndSend = async (file: File, kind: MessageKind) => {
    if (!selectedConv) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await onUploadMedia(selectedConv.conversationId, file);
      const fallbackText =
        kind === 'IMAGE'
          ? '📷 Photo'
          : kind === 'VOICE'
            ? '🎤 Voice message'
            : `📎 ${uploaded.name}`;
      await onSendMessage(selectedConv.conversationId, selectedConv.participantUid, {
        text: fallbackText,
        kind,
        mediaUrl: uploaded.url,
        mediaName: uploaded.name,
        replyTo: replyTo ?? undefined,
      });
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!selectedConv || busy || isPartnerBlocked) return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const seconds = recordSecondsRef.current;
        setRecording(false);
        setRecordSeconds(0);
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
        if (blob.size < 800) return;
        const file = new File([blob], `voice_${Date.now()}.webm`, {
          type: blob.type,
        });
        setBusy(true);
        onUploadMedia(selectedConv.conversationId, file)
          .then((uploaded) =>
            onSendMessage(selectedConv.conversationId, selectedConv.participantUid, {
              text: '🎤 Voice message',
              kind: 'VOICE',
              mediaUrl: uploaded.url,
              mediaName: uploaded.name,
              durationMs: seconds * 1000,
            })
          )
          .catch((err) =>
            setError(err instanceof Error ? err.message : 'Voice upload failed.')
          )
          .finally(() => setBusy(false));
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      recordTimerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
        if (recordSecondsRef.current >= 60) recorder.stop();
      }, 1000);
    } catch {
      setError('Microphone permission was denied.');
    }
  };

  const stopRecording = (cancel = false) => {
    if (cancel) chunksRef.current = [];
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
  };

  const handleSendGift = async () => {
    if (!selectedConv || !selectedPartner || !selectedGift) return;
    if (isOfflineSimulated || isPartnerBlocked || giftBusy) return;
    setGiftBusy(true);
    try {
      await onSendDirectGift(selectedConv.conversationId, selectedPartner.uid, selectedGift);
      setShowGiftTray(false);
    } finally {
      setGiftBusy(false);
    }
  };

  const peopleResults = users
    .filter((u) => u.uid !== currentUser.uid && !blockedUids.includes(u.uid))
    .filter((u) => {
      const q = peopleSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.platformId.toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  const lastMessageLabel = (msg: DirectMessage): string => {
    if (msg.kind === 'IMAGE') return '📷 Photo';
    if (msg.kind === 'VOICE') return '🎤 Voice message';
    if (msg.kind === 'FILE') return `📎 ${msg.mediaName ?? 'File'}`;
    return msg.text;
  };

  const requestDeleteMessage = (msg: DirectMessage) => {
    if (!selectedConv) return;
    setActionMessage(null);
    setConfirm({
      title: 'Delete this message?',
      body: 'The message will be removed for both people in this conversation.',
      confirmLabel: 'Delete',
      action: () => {
        void onDeleteMessage(selectedConv.conversationId, msg.id).catch((err) =>
          setError(err instanceof Error ? err.message : 'Delete failed.')
        );
        setConfirm(null);
      },
    });
  };

  const copyMessage = async (msg: DirectMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('Clipboard access is unavailable.');
    }
    setActionMessage(null);
  };

  const threadActions = () => {
    if (!selectedConv || !selectedPartner) return;
    const pref = selectedPref;
    const item = (
      label: string,
      icon: React.ReactNode,
      onClick: () => void,
      tone = 'default'
    ) => (
      <button
        key={label}
        type="button"
        onClick={() => {
          setMenuOpen(false);
          onClick();
        }}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.07] ${
          tone === 'danger' ? 'text-rose-200' : 'text-slate-200'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );

    return (
      <>
        {item(
          pref?.pinned ? 'Unpin conversation' : 'Pin conversation',
          pref?.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />,
          () =>
            void onSetPref(selectedConv.conversationId, { pinned: !pref?.pinned }).catch(() =>
              setError('Conversation settings need the Firestore rules update.')
            )
        )}
        {item(
          pref?.muted ? 'Unmute notifications' : 'Mute notifications',
          pref?.muted ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />,
          () =>
            void onSetPref(selectedConv.conversationId, { muted: !pref?.muted }).catch(() =>
              setError('Conversation settings need the Firestore rules update.')
            )
        )}
        {item(
          pref?.archived ? 'Move back to inbox' : 'Archive conversation',
          <Archive className="h-3.5 w-3.5" />,
          () => {
            void onSetPref(selectedConv.conversationId, { archived: !pref?.archived })
              .then(() => {
                if (!pref?.archived) onSelectConversation(null);
              })
              .catch(() => setError('Conversation settings need the Firestore rules update.'));
          }
        )}
        {item(
          'Clear chat (for me)',
          <Trash2 className="h-3.5 w-3.5" />,
          () =>
            setConfirm({
              title: 'Clear this chat?',
              body: 'Messages will be hidden from your view only. The other person keeps their copy.',
              confirmLabel: 'Clear chat',
              action: () => {
                void onSetPref(selectedConv.conversationId, {
                  clearedAtMs: Date.now(),
                }).catch(() => setError('Conversation settings need the Firestore rules update.'));
                setConfirm(null);
              },
            })
        )}
        {item(
          'Delete chat (for me)',
          <Trash2 className="h-3.5 w-3.5" />,
          () =>
            setConfirm({
              title: 'Delete this conversation?',
              body: 'It will be removed from your inbox and message history. The other person keeps their copy.',
              confirmLabel: 'Delete chat',
              action: () => {
                void onSetPref(selectedConv.conversationId, {
                  hidden: true,
                  clearedAtMs: Date.now(),
                })
                  .then(() => onSelectConversation(null))
                  .catch(() => setError('Conversation settings need the Firestore rules update.'));
                setConfirm(null);
              },
            }),
          'danger'
        )}
        {item(
          `Block @${selectedPartner.username}`,
          <ShieldBan className="h-3.5 w-3.5" />,
          () =>
            setConfirm({
              title: `Block @${selectedPartner.username}?`,
              body: 'They will no longer be able to message you, and this chat becomes read-only.',
              confirmLabel: 'Block',
              action: () => {
                onToggleBlock(selectedPartner.uid);
                setConfirm(null);
              },
            }),
          'danger'
        )}
        {item(
          'Report conversation',
          <ShieldAlert className="h-3.5 w-3.5" />,
          () => onReportUser(selectedPartner),
          'danger'
        )}
      </>
    );
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/40 ring-1 ring-white/25">
            <MessagesSquare className="h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {unreadTotal > 0
                ? `${unreadTotal} unread message${unreadTotal === 1 ? '' : 's'}`
                : 'Private conversations with block and privacy rules.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNewChat((v) => !v);
            setPeopleSearch('');
            if (selectedConv) onSelectConversation(null);
          }}
          disabled={isOfflineSimulated}
          aria-label="New chat"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 transition-transform hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] disabled:opacity-45"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </div>

      <div
        className={`${PANE} grid min-h-[560px] grid-cols-1 md:grid-cols-12`}
      >
        {/* Conversation list */}
        <div
          className={`flex flex-col md:col-span-4 md:border-r md:border-white/[0.08] ${
            selectedConv ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-2 border-b border-white/[0.08] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#090B12] pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-sky-500/60 focus:outline-none"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(
                [
                  ['all', 'All'],
                  ['unread', 'Unread'],
                  ['archived', 'Archived'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setListTab(key)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    listTab === key
                      ? 'bg-white/[0.12] text-white'
                      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showNewChat && (
            <div className="space-y-2 border-b border-white/[0.08] bg-white/[0.02] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Search people by name, @username or ID"
                  autoFocus
                  aria-label="Search people for a new chat"
                  className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#090B12] pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-sky-500/60 focus:outline-none"
                />
              </div>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {peopleResults.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] text-slate-400">
                    No matching people found.
                  </p>
                ) : (
                  peopleResults.map((person) => (
                    <button
                      key={person.uid}
                      type="button"
                      disabled={isOfflineSimulated}
                      onClick={() => {
                        onStartDirectMessage(person);
                        setShowNewChat(false);
                        setPeopleSearch('');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.06] disabled:opacity-45"
                    >
                      <span className="relative">
                        <Avatar
                          name={person.displayName}
                          color={person.avatarColor}
                          avatarUrl={person.avatarUrl}
                          size="xs"
                        />
                        {onlineFor(person) && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0D1017]" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-white">
                          {person.displayName}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          @{person.username} · {onlineFor(person) ? 'Active now' : 'Offline'}
                        </span>
                      </span>
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    </button>
                  ))
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Opening someone you already messaged reuses the same conversation.
              </p>
            </div>
          )}

          <div className="flex-1 divide-y divide-white/[0.06] overflow-y-auto">
            {conversationRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/20 to-teal-600/10 text-emerald-300">
                  <MessagesSquare className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {search || listTab !== 'all' ? 'No matching conversations' : 'No conversations yet'}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {search || listTab !== 'all'
                      ? 'Try another search or switch tabs.'
                      : 'Pick someone from the community and start chatting.'}
                  </p>
                </div>
              </div>
            ) : (
              conversationRows.map(({ conv, pref, partner, preview }) => {
                const label = partner?.displayName ?? 'Creator';
                const isSelected = selectedConv?.conversationId === conv.conversationId;
                const blocked = partner ? blockedUids.includes(partner.uid) : false;
                const online = onlineFor(partner);
                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => onSelectConversation(conv.conversationId)}
                    className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors ${
                      isSelected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="relative shrink-0">
                      <Avatar
                        name={label}
                        color={partner?.avatarColor}
                        avatarUrl={partner?.avatarUrl}
                        size="sm"
                      />
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#111420]" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                          {label}
                        </p>
                        {pref?.pinned && <Pin className="h-3 w-3 shrink-0 text-fuchsia-300" />}
                        {pref?.muted && <BellOff className="h-3 w-3 shrink-0 text-slate-500" />}
                        {conv.lastMessageAtMs ? (
                          <span className="shrink-0 text-[9px] text-slate-500">
                            {formatRelativeMs(conv.lastMessageAtMs)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p
                          className={`min-w-0 flex-1 truncate text-[11px] ${
                            conv.unreadCount > 0 ? 'font-medium text-slate-200' : 'text-slate-400'
                          }`}
                        >
                          {blocked
                            ? 'Blocked account'
                            : `${conv.lastSenderUid === currentUser.uid ? 'You: ' : ''}${preview}`}
                        </p>
                        {conv.unreadCount > 0 &&
                          (pref?.muted ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-fuchsia-400" />
                          ) : (
                            <span className="shrink-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </span>
                          ))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div
          className={`flex-col md:col-span-8 ${
            selectedConv && selectedPartner ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConv && selectedPartner ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] p-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectConversation(null)}
                    aria-label="Back to conversations"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.08] md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="relative shrink-0">
                    <Avatar
                      name={selectedPartner.displayName}
                      color={selectedPartner.avatarColor}
                      avatarUrl={selectedPartner.avatarUrl}
                      size="sm"
                    />
                    {onlineFor(selectedPartner) && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#111420]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {selectedPartner.displayName}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      @{selectedPartner.username} · {presenceText(selectedPartner)}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Conversation options"
                    aria-expanded={menuOpen}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#141827] py-1 shadow-2xl">
                      {threadActions()}
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-[46vh] min-h-[280px] flex-1 space-y-3 overflow-y-auto p-4 md:max-h-[420px]">
                {visibleMessages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-500">
                    {selectedPref?.clearedAtMs
                      ? 'Chat cleared. Send a new message to restart this conversation.'
                      : `Say hello to ${selectedPartner.displayName}.`}
                  </p>
                ) : (
                  visibleMessages.map((msg, index) => {
                    const isMine = msg.senderUid === currentUser.uid;
                    const isLastMine =
                      isMine && index === visibleMessages.length - 1;
                    const seen = Boolean(
                      isLastMine &&
                        msg.createdAtMs &&
                        partnerReadAt >= (msg.createdAtMs ?? 0) &&
                        selectedConv.lastSenderUid === currentUser.uid
                    );
                    const replySender =
                      msg.replyTo && msg.replyTo.senderName
                        ? msg.replyTo.senderName
                        : 'message';
                    return (
                      <div
                        key={msg.id}
                        className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`flex max-w-[88%] items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => setActionMessage(msg)}
                            className={`relative rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed transition-shadow ${
                              msg.isGiftEvent
                                ? 'border border-amber-300/30 bg-gradient-to-br from-amber-400/15 via-fuchsia-500/10 to-transparent'
                                : isMine
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-white/[0.06] text-slate-100'
                            }`}
                            title="Message actions"
                          >
                            {msg.isGiftEvent && (
                              <span className="mb-1.5 flex items-center gap-2">
                                <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/40">
                                  {msg.giftId ? (
                                    <GiftArtwork
                                      src={GIFT_BY_ID.get(msg.giftId)?.imageUrl ?? ''}
                                      alt={msg.giftName ?? 'Gift'}
                                      size={26}
                                    />
                                  ) : (
                                    <Gift className="h-4 w-4 text-amber-300" />
                                  )}
                                </span>
                                <span>
                                  <span className="block text-xs font-bold text-white">
                                    {msg.giftName ?? 'Gift'}
                                  </span>
                                  {typeof msg.giftRecipientDiamonds === 'number' && (
                                    <span className="block text-[10px] font-semibold text-cyan-300">
                                      +{msg.giftRecipientDiamonds.toLocaleString()} Diamonds
                                    </span>
                                  )}
                                </span>
                              </span>
                            )}
                            {msg.replyTo && (
                              <span
                                className={`mb-1.5 block rounded-lg border-l-2 px-2 py-1 text-[10px] ${
                                  isMine
                                    ? 'border-white/50 bg-black/15 text-violet-100'
                                    : 'border-fuchsia-400/60 bg-black/20 text-slate-300'
                                }`}
                              >
                                <span className="block truncate font-semibold">
                                  {msg.replyTo.senderName}
                                </span>
                                <span className="block truncate">{msg.replyTo.text}</span>
                              </span>
                            )}
                            {msg.kind === 'IMAGE' && msg.mediaUrl ? (
                              <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.mediaName ?? 'Shared image'}
                                  className="mb-1 max-h-60 w-full rounded-xl object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ) : msg.kind === 'VOICE' && msg.mediaUrl ? (
                              <audio controls src={msg.mediaUrl} className="mb-1 w-56 max-w-full">
                                Your browser does not support audio playback.
                              </audio>
                            ) : msg.kind === 'FILE' && msg.mediaUrl ? (
                              <a
                                href={msg.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={msg.mediaName}
                                className="mb-1 flex items-center gap-2 rounded-xl bg-black/20 px-2.5 py-2 text-xs underline-offset-2 hover:underline"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate">{msg.mediaName ?? 'Attachment'}</span>
                              </a>
                            ) : null}
                            {!msg.isGiftEvent && <span className="block break-words">{msg.text}</span>}
                            {msg.isGiftEvent && <span className="text-[11px] text-slate-300">{msg.text}</span>}
                          </button>
                        </div>
                        <span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-500">
                          {msg.timestampLabel}
                          {isMine && isLastMine && (
                            <span className={seen ? 'text-sky-400' : 'text-slate-500'}>
                              {seen ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <CheckCheck className="h-3 w-3" /> Seen
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5">
                                  <Check className="h-3 w-3" /> Sent
                                </span>
                              )}
                            </span>
                          )}
                          {copiedId === msg.id && <span className="text-emerald-400">Copied</span>}
                        </span>
                      </div>
                    );
                  })
                )}
                {typingUid && typingUid === selectedPartner.uid && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                    </span>
                    {selectedPartner.displayName} is typing…
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {error && (
                <div className="flex items-center justify-between gap-2 border-t border-rose-400/20 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-200">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {isPartnerBlocked ? (
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-rose-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs text-rose-300">
                    <ShieldBan className="h-4 w-4 shrink-0" />
                    <span>Messaging disabled while this user is blocked.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnblockUser(selectedPartner.uid)}
                    className="shrink-0 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.14]"
                  >
                    Unblock
                  </button>
                </div>
              ) : (
                <>
                  {showGiftTray && (
                    <div className="space-y-2.5 border-t border-white/[0.08] bg-[#0b0e17]/95 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-1.5 font-display text-xs font-bold text-white">
                          <Gift className="h-3.5 w-3.5 text-amber-300" />
                          Send a gift to {selectedPartner.displayName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowGiftTray(false)}
                          aria-label="Close gift tray"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-slate-300 hover:bg-white/[0.14]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {(
                          [
                            ['all', 'All'],
                            ['classic', 'Classic'],
                            ['premium', 'Premium'],
                            ['luxury', 'Luxury'],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setGiftTab(key)}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                              giftTab === key
                                ? 'border border-white/20 bg-white/[0.12] text-white'
                                : 'border border-white/[0.06] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                          {visibleGifts.map((gift) => {
                            const selected = gift.giftId === selectedGift?.giftId;
                            const affordable = gift.price <= coinBalance;
                            return (
                              <button
                                key={gift.giftId}
                                type="button"
                                disabled={isOfflineSimulated}
                                onClick={() => setSelectedGiftId(gift.giftId)}
                                title={gift.name}
                                className={`group relative flex flex-col items-center rounded-xl border p-1.5 pb-1 transition-all hover:-translate-y-px disabled:opacity-45 ${
                                  selected
                                    ? 'bg-white/[0.08]'
                                    : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07]'
                                }`}
                                style={
                                  selected
                                    ? {
                                        borderColor: gift.accentHex,
                                        boxShadow: `0 0 0 1px ${gift.accentHex}, 0 4px 14px ${gift.accentHex}45`,
                                      }
                                    : undefined
                                }
                              >
                                <GiftArtwork
                                  src={gift.imageUrl}
                                  alt={gift.name}
                                  size={32}
                                  className={`relative transition-transform duration-150 group-hover:scale-110 ${
                                    affordable ? '' : 'opacity-40 saturate-50'
                                  }`}
                                />
                                <span
                                  className={`mt-1 flex items-center gap-0.5 whitespace-nowrap font-mono text-[9px] tabular-nums ${
                                    affordable ? 'text-amber-200' : 'text-rose-300/80'
                                  }`}
                                >
                                  <Coins className="h-2.5 w-2.5" />
                                  {gift.price.toLocaleString()}
                                </span>
                                <p className="w-full truncate text-center text-[9px] font-medium text-slate-300">
                                  {gift.name}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {selectedGift && (
                          <>
                            <span
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
                              style={{
                                borderColor: `${selectedGift.accentHex}66`,
                                background: `radial-gradient(circle at 50% 40%, ${selectedGift.accentHex}33, rgba(10,13,22,0.7))`,
                              }}
                            >
                              <GiftArtwork src={selectedGift.imageUrl} alt={selectedGift.name} size={28} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-white">{selectedGift.name}</p>
                              <p className="font-mono text-[10px] tabular-nums text-amber-300">
                                {selectedGift.price.toLocaleString()} coins
                              </p>
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={
                            !selectedGift ||
                            isOfflineSimulated ||
                            giftBusy ||
                            coinBalance < (selectedGift?.price ?? 0)
                          }
                          onClick={() => void handleSendGift()}
                          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-4 text-xs font-extrabold text-[#1A1206] transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{giftBusy ? 'Sending…' : 'Send gift'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {recording && (
                    <div className="flex items-center gap-2 border-t border-rose-400/25 bg-rose-950/25 px-3 py-2 text-[11px] text-rose-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                      <span>Recording voice message · {recordSeconds}s / 60s</span>
                      <button
                        type="button"
                        onClick={() => stopRecording(true)}
                        className="ml-auto rounded-lg bg-white/[0.08] px-2 py-1 text-[10px] font-semibold text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => stopRecording(false)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white"
                      >
                        <Square className="h-2.5 w-2.5" /> Stop & send
                      </button>
                    </div>
                  )}

                  {replyTo && (
                    <div className="flex items-center gap-2 border-t border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px]">
                      <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-200">
                          Replying to {replyTo.senderName}
                        </p>
                        <p className="truncate text-slate-400">{replyTo.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        aria-label="Cancel reply"
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {emojiOpen && (
                    <div className="grid grid-cols-8 gap-1 border-t border-white/[0.08] bg-[#0b0e17] p-2">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setDraft((prev) => (prev + emoji).slice(0, 1000));
                            emitTyping();
                          }}
                          className="rounded-lg py-1 text-lg hover:bg-white/[0.08]"
                          aria-label={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-1.5 border-t border-white/[0.08] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void uploadAndSend(file, 'IMAGE');
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void uploadAndSend(file, 'FILE');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((v) => !v)}
                      disabled={isOfflineSimulated || busy}
                      aria-label="Emoji picker"
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors ${
                        emojiOpen
                          ? 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200'
                          : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isOfflineSimulated || busy}
                      aria-label="Send image"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1] disabled:opacity-45"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isOfflineSimulated || busy}
                      aria-label="Send file"
                      className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1] disabled:opacity-45 sm:grid"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        emitTyping();
                      }}
                      onBlur={stopTyping}
                      disabled={isOfflineSimulated || busy}
                      placeholder={
                        isOfflineSimulated
                          ? 'Offline — reconnect to message'
                          : `Message ${selectedPartner.displayName}…`
                      }
                      className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#090B12] px-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => (recording ? stopRecording(false) : void startRecording())}
                      disabled={isOfflineSimulated || busy}
                      aria-label={recording ? 'Stop and send voice message' : 'Record voice message'}
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors disabled:opacity-45 ${
                        recording
                          ? 'border-rose-400/50 bg-rose-500/20 text-rose-200'
                          : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGiftTray((s) => !s)}
                      disabled={isOfflineSimulated}
                      aria-label="Send a gift"
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors ${
                        showGiftTray
                          ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                          : 'border-white/[0.08] bg-white/[0.05] text-amber-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      <Gift className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={!draft.trim() || isOfflineSimulated || busy}
                      aria-label="Send message"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:opacity-40 sm:h-10 sm:w-10"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <MessagesSquare className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">Select a conversation to start messaging.</p>
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
              >
                <Plus className="h-3.5 w-3.5" /> New chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message action sheet */}
      {actionMessage && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Message actions"
          onClick={() => setActionMessage(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#141827] p-2 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-semibold text-slate-300">Message actions</p>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                aria-label="Close message actions"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setReplyTo({
                  id: actionMessage.id,
                  senderName:
                    actionMessage.senderUid === currentUser.uid
                      ? currentUser.displayName
                      : selectedPartner?.displayName ?? 'Partner',
                  text: lastMessageLabel(actionMessage).slice(0, 120),
                });
                setActionMessage(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/[0.07]"
            >
              <CornerUpLeft className="h-4 w-4" /> Reply
            </button>
            <button
              type="button"
              onClick={() => void copyMessage(actionMessage)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/[0.07]"
            >
              <Copy className="h-4 w-4" /> Copy text
            </button>
            <button
              type="button"
              onClick={() => {
                setForwardMessage(actionMessage);
                setActionMessage(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/[0.07]"
            >
              <Forward className="h-4 w-4" /> Forward
            </button>
            {actionMessage.senderUid === currentUser.uid && actionMessage.id !== 'preview' && (
              <button
                type="button"
                onClick={() => requestDeleteMessage(actionMessage)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-rose-200 hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" /> Delete message
              </button>
            )}
          </div>
        </div>
      )}

      {/* Forward picker */}
      {forwardMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Forward message"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141827] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white">Forward to…</h2>
              <button
                type="button"
                onClick={() => setForwardMessage(null)}
                aria-label="Close forward picker"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {uniqueConversations.filter((c) => c.conversationId !== selectedConv?.conversationId)
                .length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Start another conversation before forwarding.
                </p>
              ) : (
                uniqueConversations
                  .filter((c) => c.conversationId !== selectedConv?.conversationId)
                  .map((conv) => {
                    const partner = getUser(conv.participantUid);
                    return (
                      <button
                        key={conv.conversationId}
                        type="button"
                        onClick={() => {
                          const msg = forwardMessage;
                          setForwardMessage(null);
                          void onSendMessage(conv.conversationId, conv.participantUid, {
                            text: msg.text,
                            kind: msg.kind,
                            mediaUrl: msg.mediaUrl,
                            mediaName: msg.mediaName,
                            durationMs: msg.durationMs,
                          }).catch((err) =>
                            setError(err instanceof Error ? err.message : 'Forward failed.')
                          );
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-white/[0.06]"
                      >
                        <Avatar
                          name={partner?.displayName ?? 'Creator'}
                          color={partner?.avatarColor}
                          avatarUrl={partner?.avatarUrl}
                          size="xs"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-white">
                            {partner?.displayName ?? 'Creator'}
                          </span>
                          <span className="block truncate text-[10px] text-slate-400">
                            @{partner?.username ?? partner?.uid.slice(0, 8)}
                          </span>
                        </span>
                        <Forward className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Destructive confirmations */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={confirm.title}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#111420] p-5">
            <h2 className="font-display text-base font-bold text-white">{confirm.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{confirm.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.09]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirm.action()}
                className="rounded-xl border border-rose-400/25 bg-rose-500/15 px-3 py-2 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/25"
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
