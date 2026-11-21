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
  | 'withdraw'
  | 'profile'
  | 'admin'
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
  seatNumber: number; // 1 to 8 (server-enforced max 8 guest seats)
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
  seats: GuestSeat[]; // Always length 8 for multi-guest / room readiness
  joinRequests: JoinRequest[];
  comments: RoomComment[];
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

export interface DirectMessage {
  id: string;
  senderUid: string;
  text: string;
  timestampLabel: string;
}

export interface Conversation {
  conversationId: string;
  participantUid: string;
  unreadCount: number;
  messages: DirectMessage[];
}

export interface NotificationItem {
  id: string;
  type: 'FOLLOW' | 'SEAT_INVITE' | 'GIFT' | 'PROMOTION' | 'SYSTEM';
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
