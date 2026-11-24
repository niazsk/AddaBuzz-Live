import React, { useEffect, useState } from 'react';
import { Coins, Gift, LogIn, MessagesSquare, Plus, Search, Send, ShieldBan, X } from 'lucide-react';
import { Conversation, DirectMessage, GiftCatalogItem, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { GiftArtwork } from '../ui/GiftArtwork';
import { giftTier, GiftTier, GIFT_BY_ID } from '../../data/gifts';

interface MessagesViewProps {
  conversations: Conversation[];
  activeMessages: DirectMessage[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  blockedUids: string[];
  activeConversationId: string | null;
  gifts: GiftCatalogItem[];
  coinBalance: number;
  onSelectConversation: (conversationId: string) => void;
  onSendDirectMessage: (
    conversationId: string,
    partnerUid: string,
    text: string
  ) => Promise<void>;
  onSendDirectGift: (
    conversationId: string,
    partnerUid: string,
    gift: GiftCatalogItem
  ) => Promise<void>;
  onUnblockUser: (uid: string) => void;
  onStartDirectMessage: (user: UserProfile) => void;
  onOpenAuth: () => void;
  isOfflineSimulated: boolean;
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
  onSelectConversation,
  onSendDirectMessage,
  onSendDirectGift,
  onUnblockUser,
  onStartDirectMessage,
  onOpenAuth,
  isOfflineSimulated,
}) => {
  const [draft, setDraft] = useState('');
  const [showGiftTray, setShowGiftTray] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>(gifts[0]?.giftId ?? '');
  const [giftTab, setGiftTab] = useState<'all' | GiftTier>('all');
  const [giftBusy, setGiftBusy] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');

  const selectedConv =
    conversations.find((c) => c.conversationId === activeConversationId) ??
    conversations[0] ??
    null;

  const selectedGift = gifts.find((g) => g.giftId === selectedGiftId) ?? gifts[0] ?? null;
  const visibleGifts =
    giftTab === 'all' ? gifts : gifts.filter((g) => giftTier(g.price) === giftTab);

  useEffect(() => {
    setShowGiftTray(false);
  }, [selectedConv?.conversationId]);

  if (!currentUser) {
    return (
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Direct Messages</h1>
          <p className="text-sm text-slate-400 mt-1">
            Private conversations protected by membership rules.
          </p>
        </div>
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-10 text-center space-y-4">
          <p className="font-display text-base font-semibold text-white">
            Sign in to send and read private messages
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Open Sign-In Page</span>
          </button>
        </div>
      </div>
    );
  }

  const getUser = (uid: string) => users.find((u) => u.uid === uid);

  const selectedPartner = selectedConv ? getUser(selectedConv.participantUid) : undefined;
  const isPartnerBlocked = selectedPartner
    ? blockedUids.includes(selectedPartner.uid)
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedConv ||
      !selectedPartner ||
      !draft.trim() ||
      isPartnerBlocked ||
      isOfflineSimulated
    )
      return;
    const text = draft.trim();
    setDraft('');
    await onSendDirectMessage(
      selectedConv.conversationId,
      selectedPartner.uid,
      text
    );
  };

  const handleSendGift = async () => {
    if (!selectedConv || !selectedPartner || !selectedGift) return;
    if (isOfflineSimulated || isPartnerBlocked || giftBusy) return;
    setGiftBusy(true);
    try {
      await onSendDirectGift(
        selectedConv.conversationId,
        selectedPartner.uid,
        selectedGift
      );
      setShowGiftTray(false);
    } finally {
      setGiftBusy(false);
    }
  };

  const peopleResults = users
    .filter((u) => u.uid !== currentUser.uid)
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

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-600 ring-1 ring-white/25 shadow-lg shadow-emerald-500/40">
            <MessagesSquare className="h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Private conversations subject to block and privacy rules.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNewChat((v) => !v);
            setPeopleSearch('');
          }}
          disabled={isOfflineSimulated}
          aria-label="New message"
          className="shrink-0 h-10 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New message</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#111420] border border-white/[0.08] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Conversation List */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-white/[0.08] divide-y divide-white/[0.06]">
          {showNewChat && (
            <div className="p-3 space-y-2 bg-white/[0.02]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Search people by name, @username or ID"
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#090B12] border border-white/[0.08] focus:border-sky-500/60 focus:outline-none text-xs text-white placeholder:text-slate-500"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {peopleResults.length === 0 ? (
                  <p className="text-[11px] text-slate-400 px-1 py-2">
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
                      className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-white/[0.06] disabled:opacity-45 transition-colors"
                    >
                      <Avatar
                        name={person.displayName}
                        color={person.avatarColor}
                        size="xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-white truncate">
                          {person.displayName}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          @{person.username} · {person.platformId}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                        {person.accountType.replace('_', ' ')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/20 to-teal-600/10 text-emerald-300">
                <MessagesSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">No conversations yet</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Pick someone from the community and start chatting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewChat(true);
                  setPeopleSearch('');
                }}
                disabled={isOfflineSimulated}
                className="mt-1 h-9 px-4 rounded-xl border border-emerald-300/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-45 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Start a chat
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const partner = getUser(conv.participantUid);
              const label = partner?.displayName ?? 'Creator';
              const lastMsg = conv.messages[conv.messages.length - 1];
              const isSelected = selectedConv?.conversationId === conv.conversationId;
              const blocked = partner ? blockedUids.includes(partner.uid) : false;

              return (
                <button
                  key={conv.conversationId}
                  type="button"
                  onClick={() => onSelectConversation(conv.conversationId)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                    isSelected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <Avatar
                    name={label}
                    color={partner?.avatarColor}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{label}</p>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {blocked
                        ? 'Blocked account'
                        : lastMsg?.text ?? 'Open thread'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Active Thread */}
        <div
          className={`md:col-span-8 flex-col justify-between ${
            selectedConv && selectedPartner ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConv && selectedPartner ? (
            <>
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={selectedPartner.displayName}
                    color={selectedPartner.avatarColor}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {selectedPartner.displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      @{selectedPartner.username} · {selectedPartner.lastActiveLabel}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-300 to-orange-500" />
                  <span className="font-mono text-[11px] font-bold text-amber-200 tabular-nums">
                    {coinBalance.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px]">
                {activeMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    Send the first message to {selectedPartner.displayName}.
                  </p>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderUid === currentUser.uid;
                    if (msg.isGiftEvent) {
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div className="max-w-[85%] rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-400/15 via-fuchsia-500/10 to-transparent px-3.5 py-2.5 flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/40 border border-white/10">
                              {msg.giftId ? (
                                <GiftArtwork
                                  src={GIFT_BY_ID.get(msg.giftId)?.imageUrl ?? ''}
                                  alt={msg.giftName ?? 'Gift'}
                                  size={30}
                                />
                              ) : (
                                <Gift className="w-5 h-5 text-amber-300" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {msg.giftName ?? 'Gift'}
                              </p>
                              <p className="text-[11px] text-slate-300">{msg.text}</p>
                              {typeof msg.giftRecipientDiamonds === 'number' && (
                                <p className="mt-0.5 text-[11px] font-semibold text-cyan-300">
                                  +{msg.giftRecipientDiamonds.toLocaleString()} Diamonds to @
                                  {msg.giftRecipientName ?? 'recipient'}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 font-mono">
                            {msg.timestampLabel}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMine
                              ? 'bg-violet-600 text-white'
                              : 'bg-white/[0.06] text-slate-100'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 font-mono">
                          {msg.timestampLabel}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {isPartnerBlocked ? (
                <div className="p-4 border-t border-white/[0.08] bg-rose-950/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-rose-300">
                    <ShieldBan className="w-4 h-4 shrink-0" />
                    <span>Messaging disabled while this user is blocked.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnblockUser(selectedPartner.uid)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white shrink-0"
                  >
                    Unblock
                  </button>
                </div>
              ) : (
                <>
                  {showGiftTray && (
                    <div className="border-t border-white/[0.08] bg-[#0b0e17]/95 p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-1.5 font-display text-xs font-bold text-white">
                          <Gift className="w-3.5 h-3.5 text-amber-300" />
                          Send a gift to {selectedPartner.displayName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowGiftTray(false)}
                          aria-label="Close gift tray"
                          className="w-7 h-7 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
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
                        ).map(([key, label]) => {
                          const active = giftTab === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setGiftTab(key)}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                                active
                                  ? 'bg-white/[0.12] text-white border border-white/20'
                                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
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
                                className={`group relative rounded-xl border p-1.5 pb-1 flex flex-col items-center transition-all hover:-translate-y-px disabled:opacity-45 ${
                                  selected
                                    ? 'bg-white/[0.08]'
                                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
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
                                  size={34}
                                  className={`relative transition-transform duration-150 group-hover:scale-110 ${
                                    affordable ? '' : 'opacity-40 saturate-50'
                                  }`}
                                />
                                <span
                                  className={`mt-1 flex items-center gap-0.5 text-[9px] font-mono tabular-nums whitespace-nowrap ${
                                    affordable ? 'text-amber-200' : 'text-rose-300/80'
                                  }`}
                                >
                                  <Coins className="w-2.5 h-2.5" />
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
                              <p className="truncate text-xs font-bold text-white">
                                {selectedGift.name}
                              </p>
                              <p className="text-[10px] font-mono text-amber-300 tabular-nums">
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
                          className="ml-auto h-9 px-4 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-extrabold text-[#1A1206] inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{giftBusy ? 'Sending…' : 'Send Gift'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={handleSubmit}
                    className="p-3 border-t border-white/[0.08] flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={isOfflineSimulated}
                      placeholder={
                        isOfflineSimulated
                          ? 'Offline — reconnect to message'
                          : `Message ${selectedPartner.displayName}...`
                      }
                      className="flex-1 h-10 px-4 rounded-xl bg-[#090B12] border border-white/[0.08] focus:border-sky-500/60 focus:outline-none text-sm text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGiftTray((s) => !s)}
                      disabled={isOfflineSimulated}
                      aria-label="Send a gift"
                      className={`h-10 w-10 rounded-xl border inline-flex items-center justify-center transition-colors shrink-0 ${
                        showGiftTray
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/[0.05] border-white/[0.08] text-amber-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={!draft.trim() || isOfflineSimulated}
                      aria-label="Send message"
                      className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-400">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
