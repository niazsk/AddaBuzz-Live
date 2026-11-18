import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  AccountPromotionRecord,
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
  postRoomMessageDoc,
  promoteUserDoc,
  registerWithEmailPassword,
  rejectJoinRequestDoc,
  reloadCurrentAuthUser,
  requestRoomSeatDoc,
  resendVerificationEmail,
  resolveReportDoc,
  sendDirectMessageDoc,
  sendPasswordReset,
  sendVirtualGiftTransaction,
  transferCoins,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFirebase,
  submitReportDoc,
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
  subscribeWalletData,
  toggleBlockDoc,
  toggleFollowDoc,
  updateOwnProfile,
  updateSeatStateDoc,
} from './lib/firestoreService';
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
import { ProfileView } from './components/views/ProfileView';
import { AdminRolesView } from './components/views/AdminRolesView';
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
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeDirectMessages, setActiveDirectMessages] = useState<DirectMessage[]>([]);
  const [promotions, setPromotions] = useState<AccountPromotionRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
        pushToast(
          'Profile lookup error',
          error instanceof Error ? error.message : 'Unable to load profile.',
          'error'
        );
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

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

    const unsubWallet = subscribeWalletData(
      currentUser.uid,
      (coins, diamonds) => {
        setCoinBalance(coins);
        setDiamondBalance(diamonds);
      },
      (txs) => setTransactions(txs)
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

    const isSuperAgentUser = currentUser.accountType === 'SUPER_AGENT';

    const unsubPromos = isSuperAgentUser
      ? subscribePromotions((recs) => setPromotions(recs))
      : () => {};

    const unsubReports = subscribeReports(
      currentUser.uid,
      isSuperAgentUser || isAdminUser,
      (reps) => setReports(reps)
    );

    return () => {
      unsubWallet();
      unsubSocial();
      unsubFollowers();
      unsubConvs();
      unsubPromos();
      unsubReports();
    };
  }, [authReady, firebaseUser?.uid, currentUser?.uid, currentUser?.accountType, isAdminUser]);

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
    } else if (section === 'admin') {
      if (activeSection !== 'admin') adminReturnRef.current = activeSection;
      setActiveSection('admin');
    } else {
      setActiveSection(section);
    }
  };

  const handleCloseAdmin = () => setActiveSection(adminReturnRef.current);

  // 4. Active Live Room details subscription (seats, join requests, messages) + viewer count
  useEffect(() => {
    if (!activeRoomId) {
      setActiveSeats([]);
      setActiveJoinRequests([]);
      setActiveComments([]);
      return;
    }

    const unsub = subscribeRoomDetails(activeRoomId, {
      onSeats: (s) => setActiveSeats(s),
      onJoinRequests: (r) => setActiveJoinRequests(r),
      onMessages: (m) => setActiveComments(m),
    });

    void adjustRoomViewerCountDoc(activeRoomId, 1);

    return () => {
      unsub();
      void adjustRoomViewerCountDoc(activeRoomId, -1);
    };
  }, [activeRoomId, currentUser?.uid]);

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
    isPrivateFollowersOnly: boolean;
  }) => {
    const me = requireSignedIn();
    if (!me) return;
    try {
      const roomId = await createLiveRoomDoc(me, payload);
      setGoLiveOpen(false);
      setActiveRoomId(roomId);
      pushToast('Live room created in Firestore', payload.title, 'success');
    } catch (err) {
      pushToast(
        'Could not create live room',
        err instanceof Error ? err.message : 'Firestore write rejected.',
        'error'
      );
    }
  };

  const handleEndRoom = async (roomId: string) => {
    try {
      await endLiveRoomDoc(roomId);
      setActiveRoomId(null);
      pushToast('Live room ended', 'Room status updated to ENDED in Firestore.');
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

  const handleSendGift = async (roomId: string, gift: GiftCatalogItem) => {
    const me = requireSignedIn();
    if (!me) return;
    const room = liveRooms.find((r) => r.roomId === roomId);
    const host = users.find((u) => u.uid === room?.hostUid);
    try {
      await sendVirtualGiftTransaction(
        roomId,
        me,
        host?.username ?? 'host',
        gift
      );
      pushToast(
        `Sent ${gift.name}`,
        `Atomic Firestore transaction recorded (-${gift.price} ${
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

  const handleTransferCoins = async (recipient: UserProfile, amount: number) => {
    const me = requireSignedIn();
    if (!me) return;
    await transferCoins(me, recipient, amount);
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
        'Only the BD Agent can promote a USER to Super Agent.',
        'error'
      );
      return;
    }
    try {
      await promoteUserDoc(me, target, afterType);
      pushToast(
        `Promoted @${target.username} to ${afterType === 'SUPER_AGENT' ? 'Super Agent' : 'Agent'}`,
        'Immutable Firestore promotion audit record saved.',
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
        'Safety report saved to Firestore',
        'Queued in Roles & Safety for moderation review.',
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
          <span>Connecting to AddaBuzz Live USA...</span>
        </div>
      </div>
    );
  }

  // Auth gate: nothing in the app is accessible until sign-in + onboarding complete
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#08090E] text-[#F4F6FB] flex items-center justify-center px-4 py-8">
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
              'Account created in Firestore!',
              `@${created.username} (${created.accountType})`,
              'success'
            );
          }}
          onSignOut={async () => {
            await signOutFirebase();
            pushToast('Signed out');
          }}
          onOpenAdminPanel={() => setActiveSection('admin')}
        />
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
    <div className="min-h-screen bg-[#08090E] text-[#F4F6FB] flex flex-col">
      {isOffline && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-100 flex items-center justify-between gap-3">
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
              onUnblockUser={handleToggleBlock}
              onOpenAuth={() => setActiveSection('signin')}
              isOfflineSimulated={isOffline}
            />
          )}

          {activeSection === 'games' && (
            <GamesView
              coinBalance={coinBalance}
              onBack={() => setActiveSection('profile')}
              onOpenFruitManor={() => setActiveSection('fruit-manor')}
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

          {activeSection === 'wallet' && (
            <WalletView
              coinBalance={coinBalance}
              diamondBalance={diamondBalance}
              transactions={transactions}
            />
          )}

          {activeSection === 'coins-trading' && (
            <CoinsTradingView
              coinBalance={coinBalance}
              transactions={transactions}
              currentUser={currentUser}
              isAdminUser={isAdminUser}
              users={users}
              onTransferCoins={handleTransferCoins}
              onBack={() => setActiveSection('profile')}
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
              onUpdateProfile={async (updates) => {
                if (!currentUser) return;
                await updateOwnProfile(currentUser.uid, updates);
                pushToast('Profile saved to Firestore', undefined, 'success');
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

          {activeSection === 'admin' && (
            <AdminRolesView
              currentUser={currentUser}
              isAdminUser={isAdminUser}
              users={users}
              promotions={promotions}
              reports={reports}
              onPromoteUser={handlePromoteUser}
              onResolveReport={async (reportId) => {
                await resolveReportDoc(reportId);
                pushToast('Report marked resolved', undefined, 'success');
              }}
              onOpenAuth={() => setActiveSection('signin')}
              onClose={handleCloseAdmin}
              isOffline={isOffline}
            />
          )}

          {activeSection === 'signin' && (
            <SignInView
              currentUser={currentUser}
              userEmail={firebaseUser?.email}
              needsEmailVerification={needsEmailVerification}
              needsOnboarding={needsOnboarding}
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
                  'Account created in Firestore!',
                  `@${created.username} (${created.accountType})`,
                  'success'
                );
              }}
              onSignOut={async () => {
                await signOutFirebase();
                pushToast('Signed out');
              }}
              onOpenAdminPanel={() => setActiveSection('admin')}
            />
          )}
        </main>

        <RightRail
          users={users.filter((u) => !blockedUids.includes(u.uid))}
          coinBalance={coinBalance}
          diamondBalance={diamondBalance}
          onOpenUserProfile={(u) => setInspectedUser(u)}
          onStartDirectMessage={handleStartDirectMessage}
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
        needsOnboarding={activeSection === 'signin' ? false : needsOnboarding}
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
            'Account created in Firestore!',
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
