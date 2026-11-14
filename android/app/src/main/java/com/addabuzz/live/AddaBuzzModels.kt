package com.addabuzz.live

data class UserProfile(
    val uid: String = "",
    val platformId: String = "",
    val username: String = "",
    val displayName: String = "",
    val bio: String = "",
    val country: String = "United States",
    val gender: String = "Prefer not to say",
    val accountType: String = "USER",
    val avatarColor: String = "#6366F1",
    val followersCount: Long = 0,
    val isOnline: Boolean = true,
    val isSuspended: Boolean = false
)

data class LiveRoom(
    val roomId: String = "",
    val hostUid: String = "",
    val title: String = "",
    val description: String = "",
    val category: String = "Popular",
    val mode: String = "VIDEO",
    val status: String = "LIVE",
    val viewerCount: Long = 1,
    val isPrivateFollowersOnly: Boolean = false
)

data class GuestSeat(
    val seatNumber: Int = 1,
    val status: String = "AVAILABLE",
    val occupantUid: String? = null,
    val occupantName: String? = null,
    val occupantUsername: String? = null,
    val isMuted: Boolean = false
)

data class RoomMessage(
    val id: String = "",
    val roomId: String = "",
    val uid: String = "",
    val username: String = "",
    val displayName: String = "",
    val text: String = "",
    val isGiftEvent: Boolean = false
)

data class WalletState(
    val coinBalance: Long = 0,
    val diamondBalance: Long = 0
)

data class GiftOption(
    val giftId: String,
    val name: String,
    val currency: String,
    val price: Long
)

val DEFAULT_GIFT_CATALOG = listOf(
    GiftOption("gift_rose", "Neon Rose", "COIN", 15),
    GiftOption("gift_wave", "Sound Wave", "COIN", 40),
    GiftOption("gift_lantern", "Sky Lantern", "COIN", 90),
    GiftOption("gift_crown", "Buzz Crown", "DIAMOND", 25),
    GiftOption("gift_star", "Nova Burst", "DIAMOND", 60)
)
