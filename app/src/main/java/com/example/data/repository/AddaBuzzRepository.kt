package com.example.data.repository

import com.example.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class AddaBuzzRepository {

    private val _streamers = MutableStateFlow(
        listOf(
            // Streamer 1: MULTI-MIC PARTY ROOM (Iconic 8-seat audio/video room)
            Streamer(
                id = 1L,
                name = "Stella Malone",
                idNum = "ID: 34983532",
                viewers = "55.4K",
                viewersCount = 55400,
                imageUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
                category = "Party",
                bio = "Singer, host & gamer. Join our 8-mic midnight karaoke & chit-chat room!",
                level = 42,
                likes = "158.4K",
                gender = Gender.FEMALE,
                latencyMs = 32,
                title = "🎉 8-Mic Karaoke & Adda Party Room",
                country = "Bangladesh",
                countryFlag = "🇧🇩",
                streamType = StreamType.PARTY_ROOM,
                charmScore = 582400L,
                partySeats = listOf(
                    PartySeat(1, "Stella (Host)", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, isHost = true, isSpeaking = true, charmScore = 12500),
                    PartySeat(2, "Prince Karim", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", Gender.MALE, isSpeaking = false, charmScore = 8400),
                    PartySeat(3, "Nadia Roy", "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, isSpeaking = true, charmScore = 9200),
                    PartySeat(4, "Farhan Pro", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200", Gender.MALE, isSpeaking = false, charmScore = 5600),
                    PartySeat(5, "Lola Bailey", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, isSpeaking = false, charmScore = 7100),
                    PartySeat(6, null, null, null, isLocked = false),
                    PartySeat(7, null, null, null, isLocked = false),
                    PartySeat(8, null, null, null, isLocked = true)
                )
            ),

            // Streamer 2: PK BATTLE (1v1 Clash with Live Score Bar!)
            Streamer(
                id = 2L,
                name = "Tanvir Rahman",
                idNum = "ID: 42383213",
                viewers = "48.2K",
                viewersCount = 48200,
                imageUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
                category = "PK",
                bio = "Rank 1 PK Gladiator! Sending gifts boosts our side to win the clash!",
                level = 45,
                likes = "98.1K",
                gender = Gender.MALE,
                latencyMs = 28,
                title = "⚔️ INTENSE 1v1 PK CLASH vs RAHIM",
                country = "Bangladesh",
                countryFlag = "🇧🇩",
                streamType = StreamType.PK_BATTLE,
                charmScore = 924500L,
                pkBattle = PKBattleState(
                    opponentName = "Rahim King",
                    opponentAvatar = "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
                    opponentGender = Gender.MALE,
                    leftScore = 24800,
                    rightScore = 19400,
                    timeLeftSeconds = 128,
                    statusText = "LIVE PK BATTLE 🔥",
                    punishmentText = "Punishment: Loser sings a funny song & puts powder on face!"
                )
            ),

            // Streamer 3: SOLO LIVE SINGER
            Streamer(
                id = 3L,
                name = "Natalie Caldwell",
                idNum = "ID: 51283920",
                viewers = "22.8K",
                viewersCount = 22800,
                imageUrl = "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800",
                category = "Live",
                bio = "Singer & acoustic guitarist. Come chill and request favorite songs!",
                level = 29,
                likes = "65.1K",
                gender = Gender.FEMALE,
                latencyMs = 35,
                title = "Midnight Jam & Acoustic Songs 🎸",
                country = "Philippines",
                countryFlag = "🇵🇭",
                streamType = StreamType.LIVE
            ),

            // Streamer 4: GAMING / PK ROOM
            Streamer(
                id = 4L,
                name = "Farhan Ahmed",
                idNum = "ID: 88294012",
                viewers = "31.5K",
                viewersCount = 31500,
                imageUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800",
                category = "Gaming",
                bio = "Pro Mobile Gamer & Streamer. Live Battle Royale & Custom Rooms!",
                level = 52,
                likes = "84.3K",
                gender = Gender.MALE,
                latencyMs = 29,
                title = "Mobile Legends & Custom Giveaways 🎮",
                country = "Bangladesh",
                countryFlag = "🇧🇩",
                streamType = StreamType.LIVE
            ),

            // Streamer 5: DANCE & PARTY
            Streamer(
                id = 5L,
                name = "Lola Bailey",
                idNum = "ID: 34983932",
                viewers = "34.2K",
                viewersCount = 34200,
                imageUrl = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800",
                category = "Party",
                bio = "Chit-chat, dance & fun games! Open mic for everyone.",
                level = 42,
                likes = "96.3K",
                gender = Gender.FEMALE,
                latencyMs = 35,
                title = "Club Vibes & Multi-Seat Dance Party 💃",
                country = "India",
                countryFlag = "🇮🇳",
                streamType = StreamType.PARTY_ROOM,
                partySeats = listOf(
                    PartySeat(1, "Lola (Host)", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, isHost = true, isSpeaking = true),
                    PartySeat(2, "Rohan", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", Gender.MALE, isSpeaking = false),
                    PartySeat(3, "Sneha", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, isSpeaking = true),
                    PartySeat(4, null, null, null)
                )
            ),

            // Streamer 6: FASHION & TALK
            Streamer(
                id = 6L,
                name = "Dollie Holmes",
                idNum = "ID: 64983324",
                viewers = "18.9K",
                viewersCount = 18900,
                imageUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800",
                category = "Live",
                bio = "Fashion designer & beauty guru. Makeup tips and life chats.",
                level = 21,
                likes = "32.8K",
                gender = Gender.FEMALE,
                latencyMs = 42,
                title = "Glam Night & Chatting With Viewers 💄",
                country = "United Arab Emirates",
                countryFlag = "🇦🇪",
                streamType = StreamType.LIVE
            )
        )
    )
    val streamers: StateFlow<List<Streamer>> = _streamers.asStateFlow()

    val giftCatalog: List<GiftItem> = listOf(
        GiftItem("gift_rose", "Red Rose", "লাল গোলাপ", 19, "🌹", tag = "Hot"),
        GiftItem("gift_heart", "Love Heart", "ভালোবাসার হৃদয়", 99, "💝", tag = "Sweet"),
        GiftItem("gift_balloons", "Romantic Balloons", "রোমান্টিক বেলুন", 199, "🎈", tag = "Party"),
        GiftItem("gift_cake", "Birthday Cake", "জন্মদিনের কেক", 299, "🎂", tag = "Celebration"),
        GiftItem("gift_box", "Mystery Box", "রহস্যময় উপহার বাক্স", 520, "🎁", tag = "Surprise"),
        GiftItem("gift_bouquet", "Flower Bouquet", "ফুলের তোড়া", 999, "💐", tag = "Luxury"),
        GiftItem("gift_puppy", "Cute Puppy", "মিষ্টি কুকুরছানা", 1314, "🐶", tag = "Beloved"),
        GiftItem("gift_ring", "Diamond Ring", "হীরার আংটি", 5200, "💍", tag = "VIP"),
        GiftItem("gift_car", "Sports Car", "স্পোর্টস কার", 9999, "🏎️", tag = "Super VIP"),
        GiftItem("gift_yacht", "Luxury Yacht", "বিলাসবহুল ইয়ট", 19999, "🛥️", tag = "Royal"),
        GiftItem("gift_crown", "Royal Crown", "রাজকীয় মুকুট", 29999, "👑", tag = "Emperor"),
        GiftItem("gift_rocket", "Space Rocket", "মহাকাশ রকেট", 50000, "🚀", tag = "Galaxy")
    )

    private val _hostTasks = MutableStateFlow(
        listOf(
            HostTask("task_1", "Live Broadcast 60 Mins", 15000, 45, 60, "📹"),
            HostTask("task_2", "Receive 50,000 Coins in Gifts", 20000, 32000, 50000, "💎"),
            HostTask("task_3", "Host an 8-Seat Multi-Mic Party", 10000, 1, 1, "🎙️", isCompleted = true),
            HostTask("task_4", "Win 2 Streamer PK Battles", 12000, 1, 2, "⚔️")
        )
    )
    val hostTasks: StateFlow<List<HostTask>> = _hostTasks.asStateFlow()

    private val _userProfile = MutableStateFlow(
        UserProfile(
            idNum = "88472910",
            name = "Alex Morgan",
            bio = "Broadcaster & Multi-mic party host! Join my room every night 9 PM.",
            gender = Gender.MALE,
            level = 38,
            charmLevel = 34,
            wealthLevel = 45,
            vipLevel = 3,
            followingCount = 142,
            followersCount = 1890,
            coins = 18500,
            points = 520000L, // Withdrawable: $52 USD (৳6,240 BDT)
            diamonds = 18500,
            role = UserRole.USER,
            agencyCode = "AGENCY_DHAKA_77",
            agencyName = "Diamond Star Agency",
            e2eeEnabled = true,
            twoFactorEnabled = true
        )
    )
    val userProfile: StateFlow<UserProfile> = _userProfile.asStateFlow()

    private val _notifications = MutableStateFlow(
        listOf(
            NotificationItem(
                id = 1L,
                title = "Stella started an 8-Mic Party!",
                message = "Grab seat #6 or #7 now in 'Karaoke & Adda Party'!",
                time = "2m ago",
                type = "stream"
            ),
            NotificationItem(
                id = 2L,
                title = "PK Battle Started!",
                message = "Tanvir is in a 1v1 PK clash against Rahim King. Support with gifts!",
                time = "8m ago",
                type = "pk"
            ),
            NotificationItem(
                id = 3L,
                title = "Daily Target Completed 🎉",
                message = "You earned +10,000 Points from your multi-seat host party task!",
                time = "1h ago",
                type = "reward"
            ),
            NotificationItem(
                id = 4L,
                title = "Gift Received",
                message = "Top gifter Karim sent a Luxury Yacht (19,999 Coins) to your room.",
                time = "4h ago",
                type = "gift"
            ),
            NotificationItem(
                id = 5L,
                title = "Security & E2EE Verified",
                message = "Your wallet and stream sessions are fully encrypted with AES-256 GCM.",
                time = "1d ago",
                type = "system"
            )
        )
    )
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    private val _directMessages = MutableStateFlow(
        listOf(
            DirectMessage(1L, "Stella Malone", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", "Thanks for the awesome rocket gift! Will you join seat #2 tonight?", "5m ago", 1, Gender.FEMALE),
            DirectMessage(2L, "Tanvir Rahman", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", "Hey bro, let's schedule our 1v1 PK battle tomorrow at 9 PM!", "30m ago", 0, Gender.MALE),
            DirectMessage(3L, "Super Agent Rahim", "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200", "Your monthly agency points payout ($52.00) is ready to withdraw via bKash.", "2h ago", 0, Gender.MALE),
            DirectMessage(4L, "AddaBuzz Official Security", "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200", "Welcome! Remember to keep 2FA enabled for safe bKash/Nagad payouts.", "1d ago", 0, Gender.FEMALE)
        )
    )
    val directMessages: StateFlow<List<DirectMessage>> = _directMessages.asStateFlow()

    val leaderboardStar: List<LeaderboardUser> = listOf(
        LeaderboardUser(1, "Myrtle Clarke", "ID: 1063294", 2863294, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, 68, "gold", "Star"),
        LeaderboardUser(2, "Betty Vega", "ID: 1283294", 1983294, "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, 55, "silver", "Star"),
        LeaderboardUser(3, "Tanvir Rahman", "ID: 10283294", 1492340, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", Gender.MALE, 51, "bronze", "Star"),
        LeaderboardUser(4, "Johnny Rios", "ID: 34983294", 963294, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200", Gender.MALE, 48),
        LeaderboardUser(5, "Lola Bailey", "ID: 42383213", 842983, "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, 42),
        LeaderboardUser(6, "Jayden Hansen", "ID: 34983932", 694783, "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200", Gender.MALE, 37),
        LeaderboardUser(7, "Dollie Holmes", "ID: 64983324", 532473, "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200", Gender.FEMALE, 30)
    )

    private val _adminMetrics = MutableStateFlow(AdminMetrics())
    val adminMetrics: StateFlow<AdminMetrics> = _adminMetrics.asStateFlow()

    fun toggleFollow(streamerId: Long) {
        _streamers.update { list ->
            list.map { s ->
                if (s.id == streamerId) s.copy(isFollowing = !s.isFollowing) else s
            }
        }
    }

    fun deductCoins(amount: Int): Boolean {
        if (_userProfile.value.coins >= amount) {
            _userProfile.update {
                it.copy(
                    coins = it.coins - amount,
                    diamonds = it.diamonds - amount
                )
            }
            return true
        }
        return false
    }

    fun addCoins(amount: Int) {
        _userProfile.update {
            it.copy(
                coins = it.coins + amount,
                diamonds = it.diamonds + amount
            )
        }
    }

    fun withdrawPoints(pointsToWithdraw: Long): Boolean {
        if (_userProfile.value.points >= pointsToWithdraw) {
            _userProfile.update { it.copy(points = it.points - pointsToWithdraw) }
            return true
        }
        return false
    }

    fun updateProfile(name: String, bio: String, gender: Gender) {
        _userProfile.update {
            it.copy(name = name, bio = bio, gender = gender)
        }
    }

    fun updateRole(role: UserRole) {
        _userProfile.update { it.copy(role = role) }
    }

    fun takePartySeat(streamerId: Long, seatIndex: Int) {
        val user = _userProfile.value
        _streamers.update { list ->
            list.map { streamer ->
                if (streamer.id == streamerId && streamer.partySeats.isNotEmpty()) {
                    val updatedSeats = streamer.partySeats.map { seat ->
                        if (seat.index == seatIndex && seat.userName == null && !seat.isLocked) {
                            seat.copy(
                                userName = user.name,
                                avatarUrl = user.avatarUrl,
                                gender = user.gender,
                                isSpeaking = true
                            )
                        } else seat
                    }
                    streamer.copy(partySeats = updatedSeats)
                } else streamer
            }
        }
    }

    fun boostPKScore(streamerId: Long, points: Int) {
        _streamers.update { list ->
            list.map { streamer ->
                if (streamer.id == streamerId && streamer.pkBattle != null) {
                    val updatedPK = streamer.pkBattle.copy(
                        leftScore = streamer.pkBattle.leftScore + points
                    )
                    streamer.copy(pkBattle = updatedPK)
                } else streamer
            }
        }
    }

    fun addBroadcastStream(title: String, category: String, streamType: StreamType): Streamer {
        val user = _userProfile.value
        val seats = if (streamType == StreamType.PARTY_ROOM) {
            listOf(
                PartySeat(1, "${user.name} (Host)", user.avatarUrl, user.gender, isHost = true, isSpeaking = true),
                PartySeat(2, null, null, null),
                PartySeat(3, null, null, null),
                PartySeat(4, null, null, null),
                PartySeat(5, null, null, null),
                PartySeat(6, null, null, null),
                PartySeat(7, null, null, null),
                PartySeat(8, null, null, null)
            )
        } else emptyList()

        val pk = if (streamType == StreamType.PK_BATTLE) {
            PKBattleState(
                opponentName = "Challenger Host",
                opponentAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
                opponentGender = Gender.MALE,
                leftScore = 1200,
                rightScore = 1500,
                timeLeftSeconds = 180
            )
        } else null

        val newStreamer = Streamer(
            id = System.currentTimeMillis(),
            name = user.name,
            idNum = "ID: ${user.idNum}",
            viewers = "1",
            viewersCount = 1,
            imageUrl = user.avatarUrl,
            category = category,
            bio = user.bio,
            level = user.level,
            likes = "0",
            gender = user.gender,
            isFollowing = false,
            latencyMs = 28,
            title = title,
            streamType = streamType,
            partySeats = seats,
            pkBattle = pk
        )
        _streamers.update { listOf(newStreamer) + it }
        return newStreamer
    }
}
