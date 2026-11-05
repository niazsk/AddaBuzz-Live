package com.example.data.model

enum class Gender {
    MALE,
    FEMALE
}

enum class UserRole {
    USER,
    HOST,
    SUPER_AGENT,
    ADMIN
}

enum class AppLanguage {
    EN,
    BN
}

enum class StreamType {
    LIVE,         // Solo broadcast
    PARTY_ROOM,   // Multi-mic 4 or 9 seats party
    PK_BATTLE     // 1v1 Streamer PK clash
}

data class PartySeat(
    val index: Int,
    val userName: String? = null,
    val avatarUrl: String? = null,
    val gender: Gender? = null,
    val isHost: Boolean = false,
    val isMuted: Boolean = false,
    val isLocked: Boolean = false,
    val isSpeaking: Boolean = false,
    val charmScore: Int = 0
)

data class PKBattleState(
    val opponentName: String,
    val opponentAvatar: String,
    val opponentGender: Gender,
    val leftScore: Int = 18450,
    val rightScore: Int = 14200,
    val timeLeftSeconds: Int = 145,
    val statusText: String = "PK BATTLE IN PROGRESS 🔥",
    val punishmentText: String = "Loser does 20 squats on cam!"
)

data class Streamer(
    val id: Long,
    val name: String,
    val idNum: String,
    val viewers: String,
    val viewersCount: Int,
    val imageUrl: String,
    val category: String, // Live, Party, PK, Nearby, Newest, Gaming
    val bio: String,
    val level: Int,
    val likes: String,
    val gender: Gender,
    val isFollowing: Boolean = false,
    val latencyMs: Int = 38,
    val fps: Int = 60,
    val resolution: String = "1080p 60fps",
    val title: String = "Late Night Vibes & Music Chat",
    val country: String = "Bangladesh",
    val countryFlag: String = "🇧🇩",
    val streamType: StreamType = StreamType.LIVE,
    val charmScore: Long = 142800L,
    val partySeats: List<PartySeat> = emptyList(),
    val pkBattle: PKBattleState? = null
)

data class ChatMessage(
    val id: Long,
    val user: String,
    val text: String,
    val gender: Gender = Gender.FEMALE,
    val level: Int = 12,
    val vipLevel: Int = 1,
    val isSystem: Boolean = false,
    val isGift: Boolean = false,
    val giftIcon: String = "",
    val time: String = "Just now"
)

data class GiftItem(
    val id: String,
    val name: String,
    val nameBn: String,
    val price: Int,
    val icon: String,
    val effectDurationMs: Long = 2500L,
    val tag: String = "Popular"
)

data class LeaderboardUser(
    val rank: Int,
    val name: String,
    val idNum: String,
    val coins: Long,
    val avatarUrl: String,
    val gender: Gender,
    val level: Int,
    val crown: String? = null, // "gold", "silver", "bronze"
    val rankType: String = "Star" // "Star", "Wealth", "Charm"
)

data class NotificationItem(
    val id: Long,
    val title: String,
    val message: String,
    val time: String,
    val type: String, // "stream", "reward", "system", "gift", "pk"
    val isRead: Boolean = false
)

data class DirectMessage(
    val id: Long,
    val senderName: String,
    val avatarUrl: String,
    val lastMessage: String,
    val time: String,
    val unreadCount: Int = 0,
    val gender: Gender = Gender.FEMALE
)

data class HostTask(
    val id: String,
    val title: String,
    val rewardPoints: Int,
    val currentProgress: Int,
    val targetProgress: Int,
    val icon: String,
    val isCompleted: Boolean = false
)

data class UserProfile(
    val idNum: String = "88472910",
    val name: String = "Alex Morgan",
    val bio: String = "Live streamer, music lover & party host. Join my multi-mic room every night!",
    val gender: Gender = Gender.MALE,
    val avatarUrl: String = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
    val level: Int = 32,
    val charmLevel: Int = 28,
    val wealthLevel: Int = 35,
    val vipLevel: Int = 3,
    val followingCount: Int = 142,
    val followersCount: Int = 1890,
    // Dual currency: Coins (to spend) and Points (withdrawable earnings)
    val coins: Int = 15200,
    val points: Long = 485000L, // 100,000 Points = $10 USD
    val diamonds: Int = 2450,
    val role: UserRole = UserRole.USER,
    val agencyCode: String = "AGENCY_7788",
    val agencyName: String = "Star Diamond Agency",
    val e2eeEnabled: Boolean = true,
    val twoFactorEnabled: Boolean = true
)

data class MultiplayerGamePlayer(
    val id: String,
    val name: String,
    val avatar: String,
    val gender: Gender,
    val diceScore: Int = 0,
    val betAmount: Int = 100,
    val isWinner: Boolean = false
)

data class AdminMetrics(
    val activeStreamers: Int = 348,
    val liveViewersNow: Int = 42890,
    val dailyDiamondsTurnover: Long = 14890200,
    val hostPayoutsPending: Int = 14,
    val serverLatencyAvgMs: Int = 41,
    val backupStatus: String = "Automated Backup Active (Every 6h)",
    val lastBackupTime: String = "18 mins ago",
    val encryptionStandard: String = "AES-256 GCM + TLS 1.3"
)
