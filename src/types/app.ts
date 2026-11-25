export type AccountType = 'USER' | 'AGENT' | 'SUPER_AGENT';

export type GenderOption = 'Male' | 'Female' | 'Prefer not to say';

export type RoomMode = 'VIDEO' | 'AUDIO' | 'MULTI_GUEST';

export type RoomCategory =
  | 'All'
  | 'Popular'
  | 'Music'
  | 'Entertainment'
  | 'Friendship'
  | 'Chat'
  | 'Gaming'
  | 'Talent'
  | 'Education'
  | 'Talk Show'
  | 'New Live';

export type SeatStatus = 'AVAILABLE' | 'REQUESTED' | 'OCCUPIED' | 'LOCKED';

export type CurrencyType = 'COIN' | 'DIAMOND';

export type AppSection =
  | 'discover'
  | 'following'
  | 'messages'
  | 'games'
  | 'fruit-manor'
  | 'game-history'
  | 'golden-flower'
  | 'gf-history'
  | 'coin-flip'
  | 'bingo-bazaar'
  | 'plinko'
  | 'crash'
  | 'mines'
  | 'hi-lo'
  | 'roulette'
  | 'wallet'
  | 'coins-trading'
  | 'super-agent-list'
  | 'agent-list'
  | 'agent-promote'
  | 'my-agent'
  | 'my-host'
  | 'rank'
  | 'agent-ranking'
  | 'invite'
  | 'invite-agent'
  | 'store'
  | 'deposit'
  | 'coins-convert'
  | 'salary'
  | 'reward'
  | 'host-rewards'
  | 'withdraw'
  | 'profile'
  | 'edit-profile'
  | 'settings'
  | 'honor'
  | 'admin-panel'
  | 'signin';

export interface UserProfile {
  uid: string;
  platformId: string;
  username: string;
  displayName: string;
  bio: string;
  country: string;
  gender: GenderOption;
  accountType: AccountType;
  avatarColor: string;
  coverGradient: string;
  avatarUrl?: string;
  coverUrl?: string;
  followersCount: number;
  followingCount: number;
  visitorsCount: number;
  isOnline: boolean;
  showPresence: boolean;
  lastActiveLabel: string;
  isNewCreator?: boolean;
  isSuspended?: boolean;
  isHost?: boolean;
  superAgentUid?: string;
  hostAgencyUid?: string;
}

export interface GuestSeat {
  seatNumber: number; // 1 to 24 (room capacity is 8, 12, 16 or 24)
  status: SeatStatus;
  occupantUid?: string;
  occupantName?: string;
  occupantUsername?: string;
  occupantAvatarColor?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface JoinRequest {
  requestId: string;
  uid: string;
  username: string;
  displayName: string;
  avatarColor: string;
  preferredSeatNumber?: number;
  createdAtLabel: string;
}

export interface RoomComment {
  id: string;
  uid: string;
  username: string;
  displayName: string;
  accountType: AccountType;
  text: string;
  timestampLabel: string;
  isGiftEvent?: boolean;
  giftId?: string;
  giftName?: string;
  giftCurrency?: CurrencyType;
  giftAmount?: number;
  giftRecipientUid?: string;
  giftRecipientName?: string;
  giftRecipientDiamonds?: number;
}

export interface LiveRoom {
  roomId: string;
  title: string;
  description: string;
  category: Exclude<RoomCategory, 'All'>;
  mode: RoomMode;
  hostUid: string;
  status: 'LIVE' | 'ENDED';
  thumbnailUrl?: string;
  fallbackGradient: string;
  viewerCount: number;
  startedAtLabel: string;
  durationSeconds: number;
  lastHeartbeatMs: number;
  isFeatured?: boolean;
  isPrivateFollowersOnly?: boolean;
  seatCount?: number; // Multi-guest capacity: 8, 12, 16 or 24
  allowGuestRequests?: boolean; // Host can stop new seat requests
  allowViewerComments?: boolean; // Host can stop viewer chat (host/mods keep posting)
  allowGifts?: boolean; // Host can disable gifting in the room
  hostApprovalForGuests?: boolean; // false = seats open instantly without host approval
  seats: GuestSeat[]; // Guest seat grid (length matches seatCount for multi-guest rooms)
  joinRequests: JoinRequest[];
  comments: RoomComment[];
}

export interface RoomModerator {
  uid: string;
  username: string;
  displayName: string;
  addedBy: string;
}

export interface CreateLiveRoomPayload {
  title: string;
  description: string;
  category: Exclude<RoomCategory, 'All'>;
  mode: RoomMode;
  seatCount: number;
  isPrivateFollowersOnly: boolean;
  allowGuestRequests: boolean;
  allowViewerComments: boolean;
  allowGifts: boolean;
  hostApprovalForGuests: boolean;
}

export type GiftEffectKind =
  | 'burst'
  | 'hearts'
  | 'fireworks'
  | 'confetti'
  | 'notes'
  | 'glow'
  | 'streaks'
  | 'diamonds'
  | 'embers'
  | 'aurora'
  | 'petals'
  | 'stars';

export interface GiftCatalogItem {
  giftId: string;
  name: string;
  currency: CurrencyType;
  price: number;
  accentHex: string;
  imageUrl: string;
  effect: GiftEffectKind;
}

export interface WalletTransaction {
  transactionId: string;
  currency: CurrencyType;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  reason: string;
  counterparty?: string;
  idempotencyKey: string;
  timestampLabel: string;
}

export interface AccountPromotionRecord {
  promotionId: string;
  actorUid: string;
  actorUsername: string;
  targetUid: string;
  targetUsername: string;
  beforeType: AccountType;
  afterType: AccountType;
  timestampLabel: string;
}

export type MessageKind = 'TEXT' | 'IMAGE' | 'VOICE' | 'FILE';

export interface MessageReplyPreview {
  id: string;
  senderName: string;
  text: string;
}

export interface DirectMessage {
  id: string;
  senderUid: string;
  text: string;
  timestampLabel: string;
  createdAtMs?: number;
  kind?: MessageKind;
  mediaUrl?: string;
  mediaName?: string;
  durationMs?: number;
  replyTo?: MessageReplyPreview;
  isGiftEvent?: boolean;
  giftId?: string;
  giftName?: string;
  giftCurrency?: CurrencyType;
  giftAmount?: number;
  giftRecipientUid?: string;
  giftRecipientName?: string;
  giftRecipientDiamonds?: number;
}

export interface Conversation {
  conversationId: string;
  participantUid: string;
  unreadCount: number;
  messages: DirectMessage[];
  lastMessageAtMs?: number;
  lastSenderUid?: string;
  readAt?: Record<string, number>;
}

export interface ConversationPrefs {
  conversationId: string;
  uid: string;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  hidden?: boolean;
  clearedAtMs?: number;
}

export interface ChatSendPayload {
  text: string;
  kind?: MessageKind;
  mediaUrl?: string;
  mediaName?: string;
  durationMs?: number;
  replyTo?: MessageReplyPreview;
}

export interface FriendRequest {
  requestId: string;
  fromUid: string;
  toUid: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatarColor: string;
  fromAvatarUrl?: string;
  timestampLabel: string;
  createdAtMillis: number;
}

export interface PresenceRecord {
  uid: string;
  lastSeenMs: number;
}

export interface NotificationItem {
  id: string;
  type:
    | 'FOLLOW'
    | 'NEW_FOLLOWER'
    | 'SEAT_INVITE'
    | 'GIFT'
    | 'PROMOTION'
    | 'SYSTEM'
    | 'FRIEND_REQUEST'
    | 'FRIEND_ACCEPT'
    | 'MESSAGE'
    | 'LIVE_INVITE';
  title: string;
  body: string;
  timestampLabel: string;
  isRead: boolean;
}

export interface ReportRecord {
  reportId: string;
  targetType: 'ROOM' | 'USER';
  targetId: string;
  targetLabel: string;
  reason: string;
  reporterUsername: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  timestampLabel: string;
}

export interface AdminAuditRecord {
  auditId: string;
  actorUid: string;
  actorUsername: string;
  action: string;
  targetId: string;
  detail: string;
  timestampLabel: string;
}

export interface AnnouncementRecord {
  announcementId: string;
  title: string;
  message: string;
  status: 'ACTIVE' | 'ENDED';
  createdByUsername: string;
  timestampLabel: string;
}

export interface AdminWalletSnapshot {
  uid: string;
  coinBalance: number;
  diamondBalance: number;
  tradingCoinBalance: number;
}

export interface RewardProfile {
  uid: string;
  day: string;
  checkInDate: string;
  streak: number;
  watchSeconds: number;
  giftsSent: number;
  followsMade: number;
  gamesPlayed: number;
  claimed: string[];
}

export interface HostRewardProfile {
  uid: string;
  day: string;
  liveSeconds: number;
  giftsReceived: number;
  newFollowers: number;
  firstLiveDone: boolean;
  validDays: number;
  claimed: string[];
}

export type LanguageCode = 'en' | 'bn' | 'hi' | 'ur' | 'ar' | 'id' | 'tr' | 'es' | 'fr';

export interface NotificationPrefs {
  friendRequests: boolean;
  friendAccepts: boolean;
  newFollowers: boolean;
  messages: boolean;
  liveInvites: boolean;
  gifts: boolean;
  promotions: boolean;
}

export interface UserSettings {
  uid: string;
  language: LanguageCode;
  notifications: NotificationPrefs;
}

export interface ToastMessage {
  id: string;
  title: string;
  body?: string;
  kind?: 'info' | 'success' | 'error';
  description?: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
}

export interface AgencyMemberRecord {
  id: string;
  superAgentUid: string;
  memberUid: string;
  memberPlatformId: string;
  memberUsername: string;
  memberDisplayName: string;
  memberType: 'AGENT' | 'HOST';
  commissionRate: number; // 0.05 for AGENT, 0.10 for HOST
  totalGiftsReceived: number; // total diamonds or coins value of gifts
  totalCommissionEarned: number; // calculated commission
  createdAtLabel: string;
  createdAtMillis: number;
}

export interface AgencyCommissionStoryRecord {
  id: string;
  superAgentUid: string;
  memberUid: string;
  memberUsername: string;
  memberDisplayName: string;
  memberType: 'AGENT' | 'HOST';
  giftName: string;
  giftPrice: number;
  commissionRate: number;
  commissionAmount: number;
  dateKey: string; // YYYY-MM-DD
  timestampLabel: string;
  timestampMillis: number;
}
