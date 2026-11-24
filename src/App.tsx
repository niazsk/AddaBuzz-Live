import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WifiOff, RefreshCw, Loader2, Megaphone, X } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  AccountPromotionRecord,
  AnnouncementRecord,
  AppSection,
  Conversation,
  DirectMessage,
  GiftCatalogItem,
  GuestSeat,
  JoinRequest,
  LiveRoom,
  NotificationItem,
  ReportRecord,
  RoomCategory,
  RoomComment,
  RoomMode,
  ToastMessage,
  UserProfile,
  WalletTransaction,
} from './types/app';
import { GIFT_CATALOG } from './data/gifts';
import type { LuckyGiftBox, LuckyRoll } from './data/luckyGifts';
import { auth } from './lib/firebase';
import {
  adjustRoomViewerCountDoc,
  approveJoinRequestDoc,
  completeUserOnboarding,
  createLiveRoomDoc,
  endLiveRoomDoc,
  ensureConversationDoc,
  fetchUserProfile,
  isAdminBootstrapEmail,
  isBdAgentProfile,
  leaveRoomSeatDoc,
  normalizeSeatCount,
  postRoomMessageDoc,
  promoteUserDoc,
  registerWithEmailPassword,
  rejectJoinRequestDoc,
  reloadCurrentAuthUser,
  requestRoomSeatDoc,
  resendVerificationEmail,
  resolveReportDoc,
  sendDirectMessageDoc,
  sendLuckyGiftTransaction,
  sendPasswordReset,
  sendVirtualGiftTransaction,
  transferCoins,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFirebase,
  submitReportDoc,
  subscribeActiveAnnouncement,
  subscribeConversationMessages,
  subscribeConversationsList,
  subscribeFollowsAndBlocks,
  subscribeFollowerUids,
  incrementProfileVisitors,
  heartbeatLiveRoom,
  subscribeLiveRooms,
  subscribePromotions,
  subscribePublicUsers,
  subscribeReports,
  subscribeRoomDetails,
  subscribeWalletBalance,
  subscribeWalletTransactions,
  toggleBlockDoc,
  toggleFollowDoc,
  bumpRewardProgress,
  bumpHostRewardProgress,
  updateOwnProfile,
  updateSeatStateDoc,
} from './lib/firestoreService';
import { classifySyncError, subscribeSyncStatus, type SyncStatus } from './lib/sync';
import { SidebarNav } from './components/layout/SidebarNav';
import { MobileBottomBar, MobileTopBar } from './components/layout/MobileNav';
import { RightRail } from './components/layout/RightRail';
import { DiscoverView } from './components/views/DiscoverView';
import { FollowingView } from './components/views/FollowingView';
import { LiveRoomView } from './components/views/LiveRoomView';
import { WalletView } from './components/views/WalletView';
import { CoinsTradingView } from './components/views/CoinsTradingView';
import { AgentDirectoryView } from './components/views/AgentDirectoryView';
import { MessagesView } from './components/views/MessagesView';
import { FruitManorView } from './components/views/FruitManorView';
import { GamesView } from './components/views/GamesView';
import { GameHistoryView } from './components/views/GameHistoryView';
import { GoldenFlowerView } from './components/views/GoldenFlowerView';
import { GfHistoryView } from './components/views/GfHistoryView';
import { CoinFlipView } from './components/views/CoinFlipView';
import { BingoView } from './components/views/BingoView';
import { PlinkoView } from './components/views/PlinkoView';
import { CrashView } from './components/views/CrashView';
import { MinesView } from './components/views/MinesView';
import { HiLoView } from './components/views/HiLoView';
import { RouletteView } from './components/views/RouletteView';
import { ProfileView } from './components/views/ProfileView';
import { AdminPanelView } from './components/views/AdminPanelView';
import { AgentPromoteView } from './components/views/AgentPromoteView';
import { RankView } from './components/views/RankView';
import { AgentRankingView } from './components/views/AgentRankingView';
import { SuperAgencyManagementView } from './components/views/SuperAgencyManagementView';
import { InviteView } from './components/views/InviteView';
import { InviteAgentView } from './components/views/InviteAgentView';
import { StoreView } from './components/views/StoreView';
import { DepositView } from './components/views/DepositView';
import { CoinsConvertView } from './components/views/CoinsConvertView';
import { SalaryView } from './components/views/SalaryView';
import { RewardView } from './components/views/RewardView';
import { HostRewardView } from './components/views/HostRewardView';
import { SignInView } from './components/views/SignInView';
import { GoLiveModal } from './components/modals/GoLiveModal';
import { AuthModal } from './components/modals/AuthModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import {
  NotificationsDrawer,
  ReportModal,
} from './components/modals/NotificationsAndReport';
import { ToastContainer } from './components/ui/ToastContainer';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('discover');

  // Firebase Auth & Profile State
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Live Firestore Collections
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeSeats, setActiveSeats] = useState<GuestSeat[]>([]);
  const [activeJoinRequests, setActiveJoinRequests] = useState<JoinRequest[]>([]);
  const [activeComments, setActiveComments] = useState<RoomComment[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>('All');
  const [selectedMode, setSelectedMode] = useState<'ALL' | RoomMode>('ALL');

  // User-scoped Firestore State
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [followerUids, setFollowerUids] = useState<string[]>([]);
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const visitedProfilesRef = useRef<Set<string>>(new Set());
  const walletReturnRef = useRef<AppSection>('profile');
  const adminReturnRef = useRef<AppSection>('profile');
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [tradingCoinBalance, setTradingCoinBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeDirectMessages, setActiveDirectMessages] = useState<DirectMessage[]>([]);
  const [promotions, setPromotions] = useState<AccountPromotionRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);

  // Modals & Drawers
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: 'ROOM' | 'USER';
    id: string;
    label: string;
  } | null>(null);

  // Online-first connectivity monitoring + simulator toggle
  const [browserOffline, setBrowserOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [offlineSimulated, setOfflineSimulated] = useState(false);
  const isOffline = browserOffline || offlineSimulated;

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (
    title: string,
    description?: string,
    tone: ToastMessage['tone'] = 'info'
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const isAdminUser = Boolean(
    isEmailVerified && isAdminBootstrapEmail(firebaseUser?.email)
  );
  const isBdAgent = isBdAgentProfile(currentUser);
  const needsEmailVerification = Boolean(firebaseUser && !isEmailVerified);

  // Connectivity listeners
  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncSignedInProfile = async (fbUser: User) => {
    setIsEmailVerified(Boolean(fbUser.emailVerified));
    if (!fbUser.emailVerified) {
      setCurrentUser(null);
      setNeedsOnboarding(false);
      return;
    }
    const profile = await fetchUserProfile(fbUser.uid);
    if (profile) {
      setCurrentUser(profile);
      setNeedsOnboarding(false);
    } else {
      setCurrentUser(null);
      setNeedsOnboarding(true);
    }
  };

  // 1. Firebase Auth state subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setIsEmailVerified(false);
        setCurrentUser(null);
        setNeedsOnboarding(false);
        setFollowingUids([]);
        setBlockedUids([]);
        setCoinBalance(0);
        setDiamondBalance(0);
        setTradingCoinBalance(0);
        setTransactions([]);
        setConversations([]);
        setPromotions([]);
        setReports([]);
        setAuthReady(true);
        return;
      }

      try {
        await syncSignedInProfile(fbUser);
      } catch (error) {
        if (classifySyncError(error) === 'fatal') {
          pushToast(
            'Profile lookup error',
            error instanceof Error ? error.message : 'Unable to load profile.',
            'error'
          );
        }
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    paused: false,
    reason: null,
    retryAt: 0,
  });
  useEffect(() => subscribeSyncStatus(setSyncStatus), []);

  const prevSyncPausedRef = useRef(false);
  useEffect(() => {
    const wasPaused = prevSyncPausedRef.current;
    prevSyncPausedRef.current = syncStatus.paused;
    if (wasPaused && !syncStatus.paused && firebaseUser && !currentUser) {
      void syncSignedInProfile(firebaseUser).catch(() => undefined);
    }
  }, [syncStatus.paused, firebaseUser?.uid, currentUser?.uid]);

  const handleRefreshVerification = async () => {
    const refreshed = await reloadCurrentAuthUser();
    if (!refreshed) return;
    setFirebaseUser(refreshed);
    setIsEmailVerified(Boolean(refreshed.emailVerified));
    if (!refreshed.emailVerified) {
      throw new Error(
        'Email is still not verified yet. Please click the link sent to your inbox first.'
      );
    }
    await syncSignedInProfile(refreshed);
    pushToast('Email verified!', 'You can now complete your profile.', 'success');
  };

  // 2. Public liveRooms & users subscriptions
  useEffect(() => {
    const unsubUsers = subscribePublicUsers(
      (list) => {
        setUsers(list);
        if (firebaseUser) {
          const mine = list.find((u) => u.uid === firebaseUser.uid);
          if (mine) setCurrentUser(mine);
        }
      },
      (err) => pushToast('Users sync error', err.message, 'error')
    );

    const unsubRooms = subscribeLiveRooms(
      (list) => setRooms(list),
      (err) => pushToast('Live rooms sync error', err.message, 'error')
    );

    return () => {
      unsubUsers();
      unsubRooms();
    };
  }, [firebaseUser?.uid]);

  // 3. Authenticated user subscriptions (Wallet, Follows/Blocks, Conversations, Promotions, Reports)
  useEffect(() => {
    if (!authReady || !firebaseUser || !currentUser) return;

    const unsubWallet = subscribeWalletBalance(
      currentUser.uid,
      (coins, diamonds, tradingCoins) => {
        setCoinBalance(coins);
        setDiamondBalance(diamonds);
        setTradingCoinBalance(tradingCoins);
      }
    );

    const unsubSocial = subscribeFollowsAndBlocks(
      currentUser.uid,
      (f) => setFollowingUids(f),
      (b) => setBlockedUids(b)
    );

    const unsubFollowers = subscribeFollowerUids(currentUser.uid, setFollowerUids);

    const unsubConvs = subscribeConversationsList(currentUser.uid, (convs) => {
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].conversationId);
      }
    });

    return () => {
      unsubWallet();
      unsubSocial();
      unsubFollowers();
      unsubConvs();
    };
  }, [authReady, firebaseUser?.uid, currentUser?.uid, currentUser?.accountType, isAdminUser]);

  // Ledger window re-reads on every transaction, so attach it only while a
  // money view is open instead of for the whole signed-in session.
  useEffect(() => {
    if (!currentUser) return;
    if (!['wallet', 'coins-trading', 'salary', 'withdraw'].includes(activeSection)) {
      return;
    }
    return subscribeWalletTransactions(currentUser.uid, setTransactions);
  }, [currentUser?.uid, activeSection]);

  // Admin-only directories stay detached until the Admin Panel is opened.
  useEffect(() => {
    if (!currentUser || activeSection !== 'admin-panel') return;
    const isSuperAgentUser = currentUser.accountType === 'SUPER_AGENT';
    const unsubPromos =
      isSuperAgentUser || isAdminUser
        ? subscribePromotions((recs) => setPromotions(recs))
        : () => {};
    const unsubReports = subscribeReports(
      currentUser.uid,
      isSuperAgentUser || isAdminUser,
      (reps) => setReports(reps)
    );
    return () => {
      unsubPromos();
      unsubReports();
    };
  }, [currentUser?.uid, currentUser?.accountType, activeSection, isAdminUser]);

  // Platform-wide announcement banner (admin-published)
  useEffect(() => {
    return subscribeActiveAnnouncement(setAnnouncement);
  }, []);

  // Every section opens at the top — otherwise a page opened from a scrolled
  // list (e.g. Profile tiles) lands mid-page and shows its bottom half.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    const target = inspectedUser;
    const me = firebaseUser;
    if (!target || !me || target.uid === me.uid) return;
    if (visitedProfilesRef.current.has(target.uid)) return;
    visitedProfilesRef.current.add(target.uid);
    incrementProfileVisitors(target.uid).catch(() => undefined);
  }, [inspectedUser?.uid, firebaseUser?.uid]);

  const handleToggleWallet = () => {
    if (isBdAgent) return;
    if (activeSection === 'wallet') {
      setActiveSection(walletReturnRef.current);
    } else {
      walletReturnRef.current = activeSection;
      setActiveSection('wallet');
    }
  };

  const handleSelectSection = (section: AppSection) => {
    if (section === 'wallet') {
      handleToggleWallet();
    } else if (section === 'admin-panel') {
      // The Admin Panel is an admin-only area.
      if (!isAdminUser) return;
      if (activeSection !== section) adminReturnRef.current = activeSection;
      setActiveSection(section);
    } else {
      setActiveSection(section);
    }
  };

  const handleCloseAdmin = () => setActiveSection(adminReturnRef.current);

  // 4. Active Live Room details subscription (seats, join requests, messages) + viewer count
  const activeRoomSeatCount = normalizeSeatCount(
    rooms.find((r) => r.roomId === activeRoomId)?.seatCount
  );

  useEffect(() => {
    if (!activeRoomId) {
      setActiveSeats([]);
      setActiveJoinRequests([]);
      setActiveComments([]);
      return;
    }

    const unsub = subscribeRoomDetails(
      activeRoomId,
      {
        onSeats: (s) => setActiveSeats(s),
        onJoinRequests: (r) => setActiveJoinRequests(r),
        onMessages: (m) => setActiveComments(m),
      },
      activeRoomSeatCount
    );

    void adjustRoomViewerCountDoc(activeRoomId, 1);

    return () => {
      unsub();
      void adjustRoomViewerCountDoc(activeRoomId, -1);
    };
  }, [activeRoomId, currentUser?.uid, activeRoomSeatCount]);

  // 5. Active Direct Message thread subscription
  useEffect(() => {
    if (!activeConversationId || !currentUser) {
      setActiveDirectMessages([]);
      return;
    }
    const unsub = subscribeConversationMessages(
      activeConversationId,
      currentUser.uid,
      (msgs) => setActiveDirectMessages(msgs)
    );
    return () => unsub();
  }, [activeConversationId, currentUser?.uid]);

  // Live duration tick
  useEffect(() => {
    if (!activeRoomId || isOffline) return;
    const timer = window.setInterval(() => {
      setRooms((prev) =>
        prev.map((r) =>
          r.roomId === activeRoomId
            ? { ...r, durationSeconds: r.durationSeconds + 1 }
            : r
        )
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeRoomId, isOffline]);

  // Reward task: accumulate live-watch seconds, flush to Firestore every 30s.
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!activeRoomId || !uid || isOffline) return;
    let pending = 0;
    const flush = () => {
      if (pending <= 0) return;
      const seconds = pending;
      pending = 0;
      void bumpRewardProgress(uid, 'watchSeconds', seconds);
    };
    const timer = window.setInterval(() => {
      pending += 1;
      if (pending >= 30) flush();
    }, 1000);
    return () => {
      window.clearInterval(timer);
      flush();
    };
  }, [activeRoomId, currentUser?.uid, isOffline]);

  const [freshTick, setFreshTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setFreshTick((t) => t + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Only rooms with a recent host heartbeat are truly live; stale/abandoned
  // rooms drop off Home instead of accumulating as dead entries.
  const liveRooms = useMemo(
    () => rooms.filter((r) => Date.now() - r.lastHeartbeatMs < 120000),
    [rooms, freshTick]
  );

  const activeRoom = useMemo(
    () => liveRooms.find((r) => r.roomId === activeRoomId) ?? null,
    [liveRooms, activeRoomId]
  );

  const hostingRoomId =
    activeRoom && currentUser && activeRoom.hostUid === currentUser.uid
      ? activeRoom.roomId
      : null;

  useEffect(() => {
    if (!hostingRoomId || isOffline) return;
    const timer = window.setInterval(() => {
      heartbeatLiveRoom(hostingRoomId).catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [hostingRoomId, isOffline]);

  // Host rewards: accumulate own live-stream seconds, flush every 30s.
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!hostingRoomId || !uid || isOffline || currentUser?.gender !== 'Female') return;
    let pending = 0;
    const flush = () => {
      if (pending <= 0) return;
      const seconds = pending;
      pending = 0;
      void bumpHostRewardProgress(uid, 'liveSeconds', seconds);
    };
    const timer = window.setInterval(() => {
      pending += 1;
      if (pending >= 30) flush();
    }, 1000);
    return () => {
      window.clearInterval(timer);
      flush();
    };
  }, [hostingRoomId, currentUser?.uid, currentUser?.gender, isOffline]);

  // Host rewards: count gifts received today (new diamond gift credits).
  const seenGiftCreditsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || currentUser?.gender !== 'Female') return;
    const giftCredits = transactions.filter(
      (t) =>
        t.currency === 'DIAMOND' &&
        t.direction === 'CREDIT' &&
        t.reason.startsWith('Received ')
    );
    if (seenGiftCreditsRef.current === null) {
      seenGiftCreditsRef.current = new Set(giftCredits.map((t) => t.transactionId));
      return;
    }
    const seen = seenGiftCreditsRef.current;
    let fresh = 0;
    giftCredits.forEach((t) => {
      if (!seen.has(t.transactionId)) {
        seen.add(t.transactionId);
        fresh += 1;
      }
    });
    if (fresh > 0) void bumpHostRewardProgress(uid, 'giftsReceived', fresh);
  }, [transactions, currentUser?.uid, currentUser?.gender]);

  // Host rewards: count new followers as they arrive.
  const prevFollowerCountRef = useRef<number | null>(null);
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || currentUser?.gender !== 'Female') return;
    const count = followerUids.length;
    if (prevFollowerCountRef.current === null) {
      prevFollowerCountRef.current = count;
      return;
    }
    if (count > prevFollowerCountRef.current) {
      void bumpHostRewardProgress(uid, 'newFollowers', count - prevFollowerCountRef.current);
    }
    prevFollowerCountRef.current = count;
  }, [followerUids, currentUser?.uid, currentUser?.gender]);

  const unreadMessagesCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const mergedNotifications = useMemo(() => {
    const dynamic: NotificationItem[] = [];
    if (activeRoom && currentUser && activeRoom.hostUid === currentUser.uid) {
      activeJoinRequests.forEach((req) => {
        dynamic.push({
          id: `notif_req_${req.requestId}`,
          type: 'SEAT_INVITE',
          title: 'Guest seat request',
          body: `${req.displayName} (@${req.username}) requested Seat ${req.preferredSeatNumber ?? 'any'} in ${activeRoom.title}.`,
          timestampLabel: req.createdAtLabel,
          isRead: false,
        });
      });
    }
    promotions.slice(0, 3).forEach((p) => {
      dynamic.push({
        id: `notif_promo_${p.promotionId}`,
        type: 'PROMOTION',
        title: 'Role promotion recorded',
        body: `@${p.targetUsername} promoted to Agent by @${p.actorUsername}.`,
        timestampLabel: p.timestampLabel,
        isRead: true,
      });
    });
    return [...dynamic, ...notifications];
  }, [activeRoom, currentUser, activeJoinRequests, promotions, notifications]);

  const unreadNotificationsCount = useMemo(
    () => mergedNotifications.filter((n) => !n.isRead).length,
    [mergedNotifications]
  );

  const requireSignedIn = (): UserProfile | null => {
    if (!currentUser) {
      setAuthOpen(true);
      pushToast('Sign in required', 'Continue with Google to interact.', 'info');
      return null;
    }
    return currentUser;
  };

  const handleToggleFollow = async (targetUid: string) => {
    const me = requireSignedIn();
    if (!me || targetUid === me.uid) return;
    const target = users.find((u) => u.uid === targetUid);
    const currentlyFollowing = followingUids.includes(targetUid);
    try {
      await toggleFollowDoc(me.uid, targetUid, currentlyFollowing);
      if (!currentlyFollowing) {
        void bumpRewardProgress(me.uid, 'followsMade', 1);
      }
      pushToast(
        currentlyFollowing
          ? `Unfollowed ${target?.displayName ?? 'creator'}`
          : `Following ${target?.displayName ?? 'creator'}`,
        undefined,
        currentlyFollowing ? 'info' : 'success'
      );
    } catch (err) {
      pushToast(
        'Follow update failed',
        err instanceof Error ? err.message : 'Unable to update follow status.',
        'error'
      );
    }
  };

  const handleToggleBlock = async (targetUid: string) => {
    const me = requireSignedIn();
    if (!me || targetUid === me.uid) return;
    const target = users.find((u) => u.uid === targetUid);
    const currentlyBlocked = blockedUids.includes(targetUid);
    try {
      await toggleBlockDoc(me.uid, targetUid, currentlyBlocked);
      if (!currentlyBlocked && followingUids.includes(targetUid)) {
        await toggleFollowDoc(me.uid, targetUid, true);
      }
      pushToast(
        currentlyBlocked
          ? `Unblocked @${target?.username ?? 'user'}`
          : `Blocked @${target?.username ?? 'user'}`,
        undefined,
        currentlyBlocked ? 'info' : 'warning'
      );
      setInspectedUser(null);
    } catch (err) {
      pushToast(
        'Block action failed',
        err instanceof Error ? err.message : 'Unable to update block.',
        'error'
      );
    }
  };

  const handleStartLiveRoom = async (payload: {
    title: string;
    description: string;
    category: Exclude<RoomCategory, 'All'>;
    mode: RoomMode;
    seatCount?: number;
    isPrivateFollowersOnly: boolean;
  }) => {
    const me = requireSignedIn();
    if (!me) return;
    try {
      const roomId = await createLiveRoomDoc(me, payload);
      setGoLiveOpen(false);
      setActiveRoomId(roomId);
      pushToast('Live room created', payload.title, 'success');
    } catch (err) {
      pushToast(
        'Could not create live room',
        err instanceof Error ? err.message : 'Could not save the room. Please try again.',
        'error'
      );
    }
  };

  const handleEndRoom = async (roomId: string) => {
    try {
      await endLiveRoomDoc(roomId);
      setActiveRoomId(null);
      pushToast('Live room ended', 'Room status updated to ENDED.');
    } catch (err) {
      pushToast(
        'End room failed',
        err instanceof Error ? err.message : 'Unable to end room.',
        'error'
      );
    }
  };

  const handleSendRoomComment = async (roomId: string, text: string) => {
    const me = requireSignedIn();
    if (!me) return;
    try {
      await postRoomMessageDoc(roomId, me, text);
    } catch (err) {
      pushToast(
        'Comment failed',
        err instanceof Error ? err.message : 'Unable to post message.',
        'error'
      );
    }
  };

  const resolveGiftRecipient = (
    me: UserProfile,
    roomId: string,
    recipientUid?: string
  ) => {
    const room = liveRooms.find((r) => r.roomId === roomId);
    if (!room) {
      pushToast('Gift failed', 'This room is no longer available.', 'warning');
      return null;
    }

    const targetUid =
      recipientUid && recipientUid !== room.hostUid ? recipientUid : room.hostUid;
    if (targetUid === me.uid) {
      pushToast(
        'Cannot Gift Yourself',
        'You cannot send a gift to yourself in your own live room.',
        'warning'
      );
      return null;
    }

    const seat = activeSeats.find(
      (s) => s.status === 'OCCUPIED' && s.occupantUid === targetUid
    );
    if (targetUid !== room.hostUid && !seat) {
      pushToast('Gift failed', 'That guest is no longer on stage.', 'warning');
      return null;
    }

    const host = users.find((u) => u.uid === room.hostUid);
    const profile = users.find((u) => u.uid === targetUid);
    return {
      recipient: {
        uid: targetUid,
        username:
          profile?.username ??
          seat?.occupantUsername ??
          (targetUid === room.hostUid ? host?.username : undefined) ??
          'user',
        displayName:
          profile?.displayName ??
          seat?.occupantName ??
          (targetUid === room.hostUid ? host?.displayName : undefined) ??
          'Guest',
      },
    };
  };

  const handleSendGift = async (
    roomId: string,
    gift: GiftCatalogItem,
    recipientUid?: string
  ) => {
    const me = requireSignedIn();
    if (!me) return;
    const resolved = resolveGiftRecipient(me, roomId, recipientUid);
    if (!resolved) return;
    const { recipient } = resolved;

    try {
      const result = await sendVirtualGiftTransaction(
        { type: 'ROOM', id: roomId },
        me,
        recipient,
        gift
      );
      void bumpRewardProgress(me.uid, 'giftsSent', 1);
      pushToast(
        `Sent ${gift.name}`,
        `Gift delivered to @${recipient.username} (+${result.recipientDiamonds.toLocaleString()} Diamonds, -${gift.price} ${
          gift.currency === 'COIN' ? 'Coins' : 'Diamonds'
        }).`,
        'success'
      );
    } catch (err) {
      pushToast(
        'Gift failed',
        err instanceof Error ? err.message : 'Unable to process gift.',
        'warning'
      );
    }
  };

  const handleSendLuckyGift = async (
    roomId: string,
    box: LuckyGiftBox,
    roll: LuckyRoll,
    recipientUid?: string
  ): Promise<number | null> => {
    const me = requireSignedIn();
    if (!me) return null;
    const resolved = resolveGiftRecipient(me, roomId, recipientUid);
    if (!resolved) return null;

    try {
      const result = await sendLuckyGiftTransaction(
        { type: 'ROOM', id: roomId },
        me,
        resolved.recipient,
        box,
        roll
      );
      void bumpRewardProgress(me.uid, 'giftsSent', 1);
      return result.recipientDiamonds;
    } catch (err) {
      pushToast(
        'Lucky open failed',
        err instanceof Error ? err.message : 'Unable to process lucky gift.',
        'warning'
      );
      return null;
    }
  };

  const handleTransferCoins = async (recipient: UserProfile, amount: number) => {
    const me = requireSignedIn();
    if (!me) return;
    await transferCoins(me, recipient, amount, { isAdmin: isAdminUser });
    pushToast(
      'Coins transferred',
      `Sent ${amount.toLocaleString()} coins to @${recipient.username}.`,
      'success'
    );
  };

  const handleRequestSeat = async (roomId: string, seatNumber: number) => {
    const me = requireSignedIn();
    if (!me) return;
    try {
      await requestRoomSeatDoc(roomId, me, seatNumber);
      pushToast(
        `Seat ${seatNumber} requested`,
        'Host can approve from Guests & Requests.',
        'info'
      );
    } catch (err) {
      pushToast(
        'Seat request failed',
        err instanceof Error ? err.message : 'Unable to request seat.',
        'warning'
      );
    }
  };

  const handleApproveJoinRequest = async (
    roomId: string,
    request: JoinRequest
  ) => {
    try {
      const assignedSeat = await approveJoinRequestDoc(roomId, request);
      pushToast(
        `Approved @${request.username}`,
        `Assigned Seat ${assignedSeat} transactionally.`,
        'success'
      );
    } catch (err) {
      pushToast(
        'Seat assignment failed',
        err instanceof Error ? err.message : 'Unable to approve request.',
        'warning'
      );
    }
  };

  const handleRejectJoinRequest = async (
    roomId: string,
    request: JoinRequest
  ) => {
    try {
      await rejectJoinRequestDoc(roomId, request);
      pushToast('Join request declined');
    } catch (err) {
      pushToast(
        'Decline failed',
        err instanceof Error ? err.message : 'Unable to decline request.',
        'error'
      );
    }
  };

  const handleToggleSeatLock = async (roomId: string, seat: GuestSeat) => {
    try {
      await updateSeatStateDoc(roomId, seat.seatNumber, {
        status: seat.status === 'LOCKED' ? 'AVAILABLE' : 'LOCKED',
      });
    } catch (err) {
      pushToast(
        'Seat lock update failed',
        err instanceof Error ? err.message : 'Permission denied.',
        'error'
      );
    }
  };

  const handleToggleMuteGuest = async (roomId: string, seat: GuestSeat) => {
    try {
      await updateSeatStateDoc(roomId, seat.seatNumber, {
        isMuted: !seat.isMuted,
      });
    } catch (err) {
      pushToast(
        'Mute update failed',
        err instanceof Error ? err.message : 'Permission denied.',
        'error'
      );
    }
  };

  const handleRemoveGuest = async (roomId: string, seatNumber: number) => {
    try {
      await updateSeatStateDoc(roomId, seatNumber, {
        status: 'AVAILABLE',
        occupantUid: '',
        occupantName: '',
        occupantUsername: '',
        occupantAvatarColor: '#6366F1',
        isMuted: false,
        isSpeaking: false,
      });
      pushToast(`Guest removed from Seat ${seatNumber}`);
    } catch (err) {
      pushToast(
        'Remove guest failed',
        err instanceof Error ? err.message : 'Permission denied.',
        'error'
      );
    }
  };

  const handleLeaveSeat = async (roomId: string, seatNumber: number) => {
    try {
      await leaveRoomSeatDoc(roomId, seatNumber);
      pushToast(`Stepped down from Seat ${seatNumber}`);
    } catch (err) {
      pushToast(
        'Step down failed',
        err instanceof Error ? err.message : 'Unable to leave seat.',
        'error'
      );
    }
  };

  const handlePromoteUser = async (
    target: UserProfile,
    afterType: 'AGENT' | 'SUPER_AGENT'
  ) => {
    const me = requireSignedIn();
    if (!me) return;
    if (afterType === 'SUPER_AGENT' && !isBdAgentProfile(me)) {
      pushToast(
        'Promotion rejected',
        'Only the main BD Agent can promote a USER to BD Agent.',
        'error'
      );
      return;
    }
    try {
      await promoteUserDoc(me, target, afterType);
      pushToast(
        `Promoted @${target.username} to ${afterType === 'SUPER_AGENT' ? 'BD Agent' : 'Agent'}`,
        'Immutable promotion audit record saved.',
        'success'
      );
    } catch (err) {
      pushToast(
        'Promotion rejected',
        err instanceof Error ? err.message : 'Authorization failed.',
        'error'
      );
    }
  };

  const handleStartDirectMessage = async (targetUser: UserProfile) => {
    const me = requireSignedIn();
    if (!me || targetUser.uid === me.uid) return;
    try {
      const convId = await ensureConversationDoc(me.uid, targetUser.uid);
      setActiveConversationId(convId);
      setInspectedUser(null);
      setActiveRoomId(null);
      setActiveSection('messages');
    } catch (err) {
      pushToast(
        'Conversation failed',
        err instanceof Error ? err.message : 'Unable to open conversation.',
        'error'
      );
    }
  };

  const handleSendDirectMessage = async (
    conversationId: string,
    partnerUid: string,
    text: string
  ) => {
    const me = requireSignedIn();
    if (!me) return;
    const memberUids = [me.uid, partnerUid].sort();
    try {
      await sendDirectMessageDoc(conversationId, memberUids, me.uid, text);
    } catch (err) {
      pushToast(
        'Message failed',
        err instanceof Error ? err.message : 'Unable to send message.',
        'error'
      );
    }
  };

  const handleSendDirectGift = async (
    conversationId: string,
    partnerUid: string,
    gift: GiftCatalogItem
  ) => {
    const me = requireSignedIn();
    if (!me) return;
    const partner = users.find((u) => u.uid === partnerUid);
    if (!partner) {
      pushToast('Gift failed', 'This person is no longer available.', 'warning');
      return;
    }
    if (partnerUid === me.uid) {
      pushToast('Cannot Gift Yourself', 'Pick another person to send a gift.', 'warning');
      return;
    }
    try {
      const result = await sendVirtualGiftTransaction(
        { type: 'CONVERSATION', id: conversationId },
        me,
        {
          uid: partner.uid,
          username: partner.username,
          displayName: partner.displayName,
        },
        gift
      );
      void bumpRewardProgress(me.uid, 'giftsSent', 1);
      pushToast(
        `Sent ${gift.name}`,
        `Gift delivered to @${partner.username} (+${result.recipientDiamonds.toLocaleString()} Diamonds).`,
        'success'
      );
    } catch (err) {
      pushToast(
        'Gift failed',
        err instanceof Error ? err.message : 'Unable to send gift in this chat.',
        'warning'
      );
    }
  };

  const handleSubmitReport = async (reason: string) => {
    const me = requireSignedIn();
    if (!me || !reportTarget) return;
    try {
      await submitReportDoc({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        targetLabel: reportTarget.label,
        reason,
        reporter: me,
      });
      setReportTarget(null);
      pushToast(
        'Safety report saved',
        'Queued for moderation review.',
        'success'
      );
    } catch (err) {
      pushToast(
        'Report failed',
        err instanceof Error ? err.message : 'Unable to submit report.',
        'error'
      );
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#08090E] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
          <span>Connecting to AddaBuzz Live...</span>
        </div>
      </div>
    );
  }

  // Signed in but profile not loaded yet (e.g. server quota pause): never
  // bounce the user back to the sign-in form — hold a restore screen instead.
  if (!currentUser && firebaseUser && !needsOnboarding && isEmailVerified) {
    return (
      <div className="min-h-screen bg-[#08090E] text-[#F4F6FB] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-[#0D1017] p-6 text-center space-y-4">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400 mx-auto" />
          <div className="text-sm font-semibold">Restoring your profile…</div>
          <p className="text-xs text-slate-400">
            {syncStatus.paused
              ? 'Retrying automatically — you stay signed in.'
              : 'Loading your account details.'}
          </p>
          <button
            type="button"
            onClick={() => {
              void syncSignedInProfile(firebaseUser).catch(() => undefined);
            }}
            className="px-4 py-2 rounded-xl bg-sky-500 text-black text-xs font-semibold inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry now</span>
          </button>
        </div>
      </div>
    );
  }

  // Auth gate: nothing in the app is accessible until sign-in + onboarding complete
  // (In dev or preview, allow entering as a tester to test games and UI)
  if (!currentUser) {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return (
      <div className="min-h-screen bg-[#08090E] text-[#F4F6FB] flex flex-col items-center justify-center px-4 py-8">
        <SignInView
          currentUser={null}
          userEmail={firebaseUser?.email}
          needsEmailVerification={needsEmailVerification}
          needsOnboarding={needsOnboarding}
          defaultDisplayName={firebaseUser?.displayName ?? ''}
          showBackToDiscover={false}
          onBackToDiscover={() => {}}
          onGoogleSignIn={async () => {
            await signInWithGooglePopup();
          }}
          onEmailSignIn={async (email, password) => {
            await signInWithEmailPassword(email, password);
          }}
          onEmailRegister={async (email, password, name) => {
            await registerWithEmailPassword(email, password, name);
          }}
          onSendPasswordReset={sendPasswordReset}
          onResendVerification={resendVerificationEmail}
          onRefreshVerification={handleRefreshVerification}
          onCompleteOnboarding={async (payload) => {
            const activeAuthUser = auth.currentUser ?? firebaseUser;
            if (!activeAuthUser) return;
            const created = await completeUserOnboarding(activeAuthUser, payload);
            setCurrentUser(created);
            setNeedsOnboarding(false);
            pushToast(
              'Account created!',
              `@${created.username} (${created.accountType})`,
              'success'
            );
          }}
          onSignOut={async () => {
            await signOutFirebase();
            pushToast('Signed out');
          }}
          onOpenAdminPanel={() => setActiveSection('admin-panel')}
        />
        {isLocalDev && (
          <div className="mt-4">
            <button
              type="button"
              id="dev-guest-login-btn"
              onClick={() => {
                setCurrentUser({
                  uid: 'dev-player-test',
                  platformId: 'AB-999999',
                  username: 'tester',
                  displayName: 'Test Player',
                  bio: 'Testing games',
                  country: 'Bangladesh',
                  gender: 'Male',
                  accountType: 'USER',
                  avatarColor: '#F59E0B',
                  coverGradient: 'linear-gradient(135deg, #701518 0%, #1e0505 100%)',
                  followersCount: 12,
                  followingCount: 5,
                  visitorsCount: 42,
                  isOnline: true,
                  showPresence: true,
                  lastActiveLabel: 'Active now',
                });
                setCoinBalance(2000);
                setDiamondBalance(500);
                setTradingCoinBalance(0);
              }}
              className="text-xs text-amber-400/80 hover:text-amber-300 underline underline-offset-4"
            >
              Continue as Local Test Player (Dev Mode)
            </button>
          </div>
        )}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Fullscreen Live Room View
  if (activeRoom) {
    const host = users.find((u) => u.uid === activeRoom.hostUid) ??
      currentUser ?? {
        uid: activeRoom.hostUid,
        platformId: 'AB-HOST',
        username: 'host',
        displayName: 'Live Host',
        bio: '',
        country: 'USA',
        gender: 'Prefer not to say',
        accountType: 'USER',
        avatarColor: '#6366F1',
        coverGradient: 'linear-gradient(135deg, #2E1065 0%, #1E3A8A 100%)',
        followersCount: 0,
        followingCount: 0,
        isOnline: true,
        showPresence: true,
        lastActiveLabel: 'Live now',
      };

    return (
      <>
        {isOffline && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-100 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Connection lost — AddaBuzz Live requires an active internet connection. Room actions paused until reconnected.
              </span>
            </span>
            {offlineSimulated && (
              <button
                type="button"
                onClick={() => setOfflineSimulated(false)}
                className="px-3 py-1 rounded-lg bg-amber-500 text-black font-semibold inline-flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reconnect</span>
              </button>
            )}
          </div>
        )}

        <LiveRoomView
          room={activeRoom}
          seats={activeSeats.length > 0 ? activeSeats : activeRoom.seats}
          joinRequests={activeJoinRequests}
          comments={activeComments}
          host={host}
          currentUser={currentUser}
          isAdminUser={isAdminUser}
          gifts={GIFT_CATALOG}
          coinBalance={coinBalance}
          isFollowingHost={followingUids.includes(host.uid)}
          isOfflineSimulated={isOffline}
          onLeaveRoom={() => setActiveRoomId(null)}
          onEndRoom={handleEndRoom}
          onToggleFollow={handleToggleFollow}
          onSendComment={handleSendRoomComment}
          onSendGift={handleSendGift}
          onSendLuckyGift={handleSendLuckyGift}
          onRequestSeat={handleRequestSeat}
          onLeaveSeat={handleLeaveSeat}
          onApproveJoinRequest={handleApproveJoinRequest}
          onRejectJoinRequest={handleRejectJoinRequest}
          onToggleSeatLock={handleToggleSeatLock}
          onToggleMuteGuest={handleToggleMuteGuest}
          onRemoveGuest={handleRemoveGuest}
          onShareRoom={(r) => {
            if (navigator.clipboard?.writeText) {
              navigator.clipboard
                .writeText(`${window.location.origin}/room/${r.roomId}`)
                .catch(() => {});
            }
            pushToast('Room link copied', r.title, 'success');
          }}
          onOpenReportRoom={(r) => {
            if (!requireSignedIn()) return;
            setReportTarget({ type: 'ROOM', id: r.roomId, label: r.title });
          }}
          onOpenProfile={(u) => setInspectedUser(u)}
          onOpenAuth={() => setAuthOpen(true)}
        />

        <AuthModal
          open={authOpen}
          needsEmailVerification={needsEmailVerification}
          needsOnboarding={needsOnboarding}
          defaultDisplayName={firebaseUser?.displayName ?? ''}
          userEmail={firebaseUser?.email}
          onClose={() => setAuthOpen(false)}
          onGoogleSignIn={async () => {
            await signInWithGooglePopup();
            setAuthOpen(false);
          }}
          onEmailSignIn={async (email, password) => {
            await signInWithEmailPassword(email, password);
            setAuthOpen(false);
          }}
          onEmailRegister={async (email, password, name) => {
            await registerWithEmailPassword(email, password, name);
          }}
          onResendVerification={resendVerificationEmail}
          onRefreshVerification={handleRefreshVerification}
          onSignOut={async () => {
            await signOutFirebase();
            setAuthOpen(false);
            pushToast('Signed out');
          }}
          onCompleteOnboarding={async (payload) => {
            const activeAuthUser = auth.currentUser ?? firebaseUser;
            if (!activeAuthUser) return;
            const created = await completeUserOnboarding(activeAuthUser, payload);
            setCurrentUser(created);
            setNeedsOnboarding(false);
            pushToast('Welcome to AddaBuzz Live!', `@${created.username} created.`, 'success');
          }}
        />

        <UserProfileModal
          user={inspectedUser}
          isFollowing={
            inspectedUser ? followingUids.includes(inspectedUser.uid) : false
          }
          isBlocked={
            inspectedUser ? blockedUids.includes(inspectedUser.uid) : false
          }
          onClose={() => setInspectedUser(null)}
          onToggleFollow={handleToggleFollow}
          onStartMessage={handleStartDirectMessage}
          onToggleBlock={handleToggleBlock}
          onReportUser={(u) => {
            if (!requireSignedIn()) return;
            setInspectedUser(null);
            setReportTarget({
              type: 'USER',
              id: u.uid,
              label: `${u.displayName} (@${u.username})`,
            });
          }}
        />

        <ReportModal
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmitReport={handleSubmitReport}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="app-ambient min-h-screen bg-[#08090E] text-[#F4F6FB] flex flex-col">
      {isOffline && (
        <div className="bg-gradient-to-r from-amber-950/95 via-amber-950/90 to-amber-900/80 backdrop-blur-md border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-100 flex items-center justify-between gap-3 shadow-[0_10px_30px_-24px_rgba(245,158,11,0.9)]">
          <span className="inline-flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              You are offline. AddaBuzz Live is an online-first platform — server actions, live streaming, and chat are paused until connectivity returns.
            </span>
          </span>
          {offlineSimulated && (
            <button
              type="button"
              onClick={() => setOfflineSimulated(false)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-black font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reconnect</span>
            </button>
          )}
        </div>
      )}

      {announcement && announcement.announcementId !== dismissedAnnouncementId && (
        <div className="bg-gradient-to-r from-violet-950/95 via-violet-950/85 to-fuchsia-950/80 backdrop-blur-md border-b border-violet-500/30 px-4 py-2.5 text-xs text-violet-100 flex items-center justify-between gap-3 shadow-[0_10px_30px_-24px_rgba(139,92,246,0.9)]">
          <span className="inline-flex items-center gap-2 min-w-0">
            <Megaphone className="w-4 h-4 text-violet-300 shrink-0" />
            <span className="truncate">
              <strong className="font-semibold">{announcement.title}</strong>
              {' — '}
              {announcement.message}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setDismissedAnnouncementId(announcement.announcementId)}
            aria-label="Dismiss announcement"
            className="p-1 rounded-lg hover:bg-white/10 text-violet-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <MobileTopBar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onToggleWallet={handleToggleWallet}
        onOpenGoLive={() => {
          if (requireSignedIn()) setGoLiveOpen(true);
        }}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
        isOfflineSimulated={isOffline}
        isSignedIn={Boolean(currentUser)}
        hideWallet={isBdAgent}
      />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <SidebarNav
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          onOpenGoLive={() => {
            if (requireSignedIn()) setGoLiveOpen(true);
          }}
          onOpenAuth={() => setActiveSection('signin')}
          onSignOut={async () => {
            await signOutFirebase();
            pushToast('Signed out');
          }}
          currentUser={currentUser}
          unreadMessagesCount={unreadMessagesCount}
          isOffline={isOffline}
          hideWallet={isBdAgent}
          isAdminUser={isAdminUser && !isBdAgent}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-10">
          <div key={activeSection} className="page-enter">
          {activeSection === 'discover' && (
            <DiscoverView
              rooms={liveRooms}
              users={users}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
              blockedUids={blockedUids}
              onJoinRoom={(r) => setActiveRoomId(r.roomId)}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onOpenNotifications={() => setNotificationsOpen(true)}
              onOpenGoLive={() => {
                if (requireSignedIn()) setGoLiveOpen(true);
              }}
              onOpenGames={() => setActiveSection('games')}
              onOpenReward={() => setActiveSection('reward')}
              onOpenStore={() => setActiveSection('store')}
              unreadNotificationsCount={unreadNotificationsCount}
            />
          )}

          {activeSection === 'following' && (
            <FollowingView
              rooms={liveRooms}
              users={users}
              followingUids={followingUids}
              blockedUids={blockedUids}
              onToggleFollow={handleToggleFollow}
              onJoinRoom={(r) => setActiveRoomId(r.roomId)}
              onOpenUserProfile={(u) => setInspectedUser(u)}
            />
          )}

          {activeSection === 'messages' && (
            <MessagesView
              conversations={conversations}
              activeMessages={activeDirectMessages}
              users={users}
              currentUser={currentUser}
              blockedUids={blockedUids}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onSendDirectMessage={handleSendDirectMessage}
              gifts={GIFT_CATALOG}
              coinBalance={coinBalance}
              onSendDirectGift={handleSendDirectGift}
              onUnblockUser={handleToggleBlock}
              onStartDirectMessage={handleStartDirectMessage}
              onOpenAuth={() => setActiveSection('signin')}
              isOfflineSimulated={isOffline}
            />
          )}

          {activeSection === 'games' && (
            <GamesView
              coinBalance={coinBalance}
              onBack={() => setActiveSection('profile')}
              onOpenFruitManor={() => setActiveSection('fruit-manor')}
              onOpenGoldenFlower={() => setActiveSection('golden-flower')}
              onOpenCoinFlip={() => setActiveSection('coin-flip')}
              onOpenBingoBazaar={() => setActiveSection('bingo-bazaar')}
              onOpenPlinko={() => setActiveSection('plinko')}
              onOpenCrash={() => setActiveSection('crash')}
              onOpenMines={() => setActiveSection('mines')}
              onOpenHiLo={() => setActiveSection('hi-lo')}
              onOpenRoulette={() => setActiveSection('roulette')}
            />
          )}

          {activeSection === 'coin-flip' && (
            <CoinFlipView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'bingo-bazaar' && (
            <BingoView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'plinko' && (
            <PlinkoView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'crash' && (
            <CrashView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'mines' && (
            <MinesView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'hi-lo' && (
            <HiLoView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'roulette' && (
            <RouletteView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenAuth={() => setActiveSection('signin')}
            />
          )}

          {activeSection === 'fruit-manor' && (
            <FruitManorView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              onBack={() => setActiveSection('games')}
              onOpenHistory={() => setActiveSection('game-history')}
            />
          )}

          {activeSection === 'game-history' && (
            <GameHistoryView
              currentUser={currentUser}
              onBack={() => setActiveSection('fruit-manor')}
            />
          )}

          {activeSection === 'golden-flower' && (
            <GoldenFlowerView
              currentUser={currentUser}
              coinBalance={coinBalance}
              isOffline={isOffline}
              isAdminUser={isAdminUser}
              onBack={() => setActiveSection('games')}
              onOpenHistory={() => setActiveSection('gf-history')}
            />
          )}

          {activeSection === 'gf-history' && (
            <GfHistoryView
              uid={currentUser.uid}
              onBack={() => setActiveSection('golden-flower')}
            />
          )}

          {activeSection === 'wallet' && (
            <WalletView
              coinBalance={coinBalance}
              diamondBalance={diamondBalance}
              tradingCoinBalance={tradingCoinBalance}
              transactions={transactions}
              currentUser={currentUser}
              onOpenSection={handleSelectSection}
              onBack={() => handleToggleWallet()}
              onToast={pushToast}
            />
          )}

          {activeSection === 'coins-trading' && (
            <CoinsTradingView
              coinBalance={coinBalance}
              tradingCoinBalance={tradingCoinBalance}
              transactions={transactions}
              currentUser={currentUser}
              isAdminUser={isAdminUser}
              users={users}
              onTransferCoins={handleTransferCoins}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {activeSection === 'super-agent-list' && (
            <AgentDirectoryView
              kind="SUPER_AGENT"
              users={users}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {activeSection === 'agent-list' && (
            <AgentDirectoryView
              kind="AGENT"
              users={users}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {activeSection === 'agent-promote' && (
            <AgentPromoteView
              currentUser={currentUser}
              users={users}
              onPromoteUser={handlePromoteUser}
              onBack={() => setActiveSection('profile')}
              isOffline={isOffline}
            />
          )}

          {activeSection === 'my-agent' && (
            <SuperAgencyManagementView
              type="AGENT"
              currentUser={currentUser}
              users={users}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onBack={() => setActiveSection('profile')}
              isOffline={isOffline}
              onShowToast={pushToast}
            />
          )}

          {activeSection === 'my-host' && (
            <SuperAgencyManagementView
              type="HOST"
              currentUser={currentUser}
              users={users}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onBack={() => setActiveSection('profile')}
              isOffline={isOffline}
              onShowToast={pushToast}
            />
          )}

          {activeSection === 'rank' && (
            <RankView
              currentUser={currentUser}
              users={users}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {activeSection === 'agent-ranking' && (
            <AgentRankingView
              currentUser={currentUser}
              users={users}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {activeSection === 'invite' && (
            <InviteView
              currentUser={currentUser}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {activeSection === 'invite-agent' && (
            <InviteAgentView
              currentUser={currentUser}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {activeSection === 'store' && (
            <StoreView
              coinBalance={coinBalance}
              diamondBalance={diamondBalance}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {activeSection === 'deposit' && (
            <DepositView
              currentUser={currentUser}
              coinBalance={coinBalance}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {activeSection === 'coins-convert' && (
            <CoinsConvertView
              currentUser={currentUser}
              coinBalance={coinBalance}
              diamondBalance={diamondBalance}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {activeSection === 'reward' && (
            <RewardView
              currentUser={currentUser}
              coinBalance={coinBalance}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {activeSection === 'host-rewards' && currentUser && (
            <HostRewardView
              currentUser={currentUser}
              diamondBalance={diamondBalance}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {(activeSection === 'salary' || activeSection === 'withdraw') && (
            <SalaryView
              currentUser={currentUser}
              diamondBalance={diamondBalance}
              users={users}
              transactions={transactions}
              onBack={() => setActiveSection('profile')}
              onToast={pushToast}
            />
          )}

          {activeSection === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              allUsers={users}
              followingUids={followingUids}
              blockedUids={blockedUids}
              isAdminUser={isAdminUser}
              friendsCount={followingUids.filter((uid) => followerUids.includes(uid)).length}
              coinBalance={coinBalance}
              diamondBalance={diamondBalance}
              tradingCoinBalance={tradingCoinBalance}
              onUpdateProfile={async (updates) => {
                if (!currentUser) return;
                await updateOwnProfile(currentUser.uid, updates);
                pushToast('Profile saved', undefined, 'success');
              }}
              onUnblockUser={handleToggleBlock}
              onOpenSection={handleSelectSection}
              onOpenAuth={() => setActiveSection('signin')}
              onSignOut={async () => {
                await signOutFirebase();
                pushToast('Signed out');
              }}
            />
          )}

          {activeSection === 'admin-panel' && isAdminUser && (
            <AdminPanelView
              currentUser={currentUser}
              rooms={rooms}
              reports={reports}
              promotions={promotions}
              onOpenUserProfile={(u) => setInspectedUser(u)}
              onWatchRoom={(roomId) => setActiveRoomId(roomId)}
              onResolveReport={async (reportId) => {
                await resolveReportDoc(reportId);
              }}
              onToast={pushToast}
              onClose={handleCloseAdmin}
              isOffline={isOffline}
            />
          )}

          {activeSection === 'signin' && (
            <SignInView
              currentUser={currentUser}
              userEmail={firebaseUser?.email}
              needsEmailVerification={needsEmailVerification}
              needsOnboarding={needsOnboarding && !currentUser}
              defaultDisplayName={firebaseUser?.displayName ?? ''}
              onBackToDiscover={() => setActiveSection('discover')}
              onGoogleSignIn={async () => {
                await signInWithGooglePopup();
              }}
              onEmailSignIn={async (email, password) => {
                await signInWithEmailPassword(email, password);
              }}
              onEmailRegister={async (email, password, name) => {
                await registerWithEmailPassword(email, password, name);
              }}
              onSendPasswordReset={sendPasswordReset}
              onResendVerification={resendVerificationEmail}
              onRefreshVerification={handleRefreshVerification}
              onCompleteOnboarding={async (payload) => {
                const activeAuthUser = auth.currentUser ?? firebaseUser;
                if (!activeAuthUser) return;
                const created = await completeUserOnboarding(activeAuthUser, payload);
                setCurrentUser(created);
                setNeedsOnboarding(false);
                pushToast(
                  'Account created!',
                  `@${created.username} (${created.accountType})`,
                  'success'
                );
              }}
              onSignOut={async () => {
                await signOutFirebase();
                pushToast('Signed out');
              }}
              onOpenAdminPanel={() => setActiveSection('admin-panel')}
            />
          )}
          </div>
        </main>

        <RightRail
          users={users.filter((u) => !blockedUids.includes(u.uid))}
          coinBalance={coinBalance}
          diamondBalance={diamondBalance}
          onOpenUserProfile={(u) => setInspectedUser(u)}
          onStartDirectMessage={handleStartDirectMessage}
          onOpenCoinsConvert={() => setActiveSection('coins-convert')}
          onOpenDiamondsWithdraw={() => setActiveSection('salary')}
          onOpenWallet={handleToggleWallet}
          hideWallet={isBdAgent}
        />
      </div>

      <MobileBottomBar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onOpenGoLive={() => {
          if (requireSignedIn()) setGoLiveOpen(true);
        }}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
        isOfflineSimulated={isOffline}
      />

      {/* Modals & Drawers */}
      <GoLiveModal
        open={goLiveOpen}
        onClose={() => setGoLiveOpen(false)}
        onStartLiveRoom={handleStartLiveRoom}
      />

      <AuthModal
        open={authOpen}
        needsEmailVerification={
          activeSection === 'signin' ? false : needsEmailVerification
        }
        needsOnboarding={activeSection === 'signin' ? false : needsOnboarding && !currentUser}
        defaultDisplayName={firebaseUser?.displayName ?? ''}
        userEmail={firebaseUser?.email}
        onClose={() => setAuthOpen(false)}
        onGoogleSignIn={async () => {
          await signInWithGooglePopup();
          setAuthOpen(false);
        }}
        onEmailSignIn={async (email, password) => {
          await signInWithEmailPassword(email, password);
          setAuthOpen(false);
        }}
        onEmailRegister={async (email, password, name) => {
          await registerWithEmailPassword(email, password, name);
        }}
        onResendVerification={resendVerificationEmail}
        onRefreshVerification={handleRefreshVerification}
        onSignOut={async () => {
          await signOutFirebase();
          setAuthOpen(false);
          pushToast('Signed out');
        }}
        onCompleteOnboarding={async (payload) => {
          const activeAuthUser = auth.currentUser ?? firebaseUser;
          if (!activeAuthUser) return;
          const created = await completeUserOnboarding(activeAuthUser, payload);
          setCurrentUser(created);
          setNeedsOnboarding(false);
          pushToast(
            'Account created!',
            `@${created.username}`,
            'success'
          );
        }}
      />

      <UserProfileModal
        user={inspectedUser}
        isFollowing={
          inspectedUser ? followingUids.includes(inspectedUser.uid) : false
        }
        isBlocked={
          inspectedUser ? blockedUids.includes(inspectedUser.uid) : false
        }
        onClose={() => setInspectedUser(null)}
        onToggleFollow={handleToggleFollow}
        onStartMessage={handleStartDirectMessage}
        onToggleBlock={handleToggleBlock}
        onReportUser={(u) => {
          if (!requireSignedIn()) return;
          setInspectedUser(null);
          setReportTarget({
            type: 'USER',
            id: u.uid,
            label: `${u.displayName} (@${u.username})`,
          });
        }}
      />

      <NotificationsDrawer
        open={notificationsOpen}
        notifications={mergedNotifications}
        onClose={() => setNotificationsOpen(false)}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        }
      />

      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmitReport={handleSubmitReport}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
