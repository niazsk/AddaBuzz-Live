import React, { useState } from 'react';
import { LogIn, Send, ShieldBan } from 'lucide-react';
import { Conversation, DirectMessage, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface MessagesViewProps {
  conversations: Conversation[];
  activeMessages: DirectMessage[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  blockedUids: string[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onSendDirectMessage: (
    conversationId: string,
    partnerUid: string,
    text: string
  ) => Promise<void>;
  onUnblockUser: (uid: string) => void;
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
  onSelectConversation,
  onSendDirectMessage,
  onUnblockUser,
  onOpenAuth,
  isOfflineSimulated,
}) => {
  const [draft, setDraft] = useState('');

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

  const selectedConv =
    conversations.find((c) => c.conversationId === activeConversationId) ??
    conversations[0] ??
    null;

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

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Direct Messages</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time conversations subject to block and privacy rules.
        </p>
      </div>

      <div className="rounded-2xl bg-[#111420] border border-white/[0.08] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Conversation List */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-white/[0.08] divide-y divide-white/[0.06]">
          {conversations.length === 0 ? (
            <div className="p-6 text-xs text-slate-400 leading-relaxed">
              No conversations yet. Open any creator profile from Home or Online Friends to start messaging.
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
        <div className="md:col-span-8 flex flex-col justify-between">
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
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px]">
                {activeMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    Send the first message to {selectedPartner.displayName}.
                  </p>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderUid === currentUser.uid;
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
                    type="submit"
                    disabled={!draft.trim() || isOfflineSimulated}
                    aria-label="Send message"
                    className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
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
