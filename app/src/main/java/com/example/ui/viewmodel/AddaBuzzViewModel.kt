package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.*
import com.example.data.repository.AddaBuzzRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlin.random.Random

enum class Screen {
    SPLASH,
    SIGN_IN,
    HOME,
    LIVE_STREAM,
    BROADCAST_LIVE,
    MULTIPLAYER_GAME,
    LEADERBOARD,
    MESSAGES,
    PROFILE,
    ADMIN_PANEL
}

data class FloatingHeart(
    val id: Long,
    val colorHex: Long,
    val leftPercent: Float
)

data class ActiveGiftBanner(
    val giftName: String,
    val giftIcon: String,
    val senderName: String,
    val price: Int
)

data class UiState(
    val currentScreen: Screen = Screen.SPLASH,
    val activeStreamer: Streamer? = null,
    val homeTab: String = "Live", // Live, Party, PK, Nearby, Gaming
    val leaderboardTab: String = "Daily", // Daily, Weekly, Monthly, Totally
    val leaderboardType: String = "Star", // Star, Wealth, Charm
    val messagesTab: String = "Notifications",
    val language: AppLanguage = AppLanguage.EN,
    val isDarkMode: Boolean = true,
    val showGiftModal: Boolean = false,
    val showShareModal: Boolean = false,
    val showProfileCard: Streamer? = null,
    val showTopUpModal: Boolean = false,
    val showWithdrawModal: Boolean = false,
    val showSecurityDialog: Boolean = false,
    val showTasksDialog: Boolean = false,
    val floatingHearts: List<FloatingHeart> = emptyList(),
    val activeGiftBanner: ActiveGiftBanner? = null,
    val chatMessages: List<ChatMessage> = emptyList(),
    // Broadcast studio state
    val isFrontCamera: Boolean = true,
    val isMicMuted: Boolean = false,
    val isBeautyFilterOn: Boolean = true,
    val broadcastViewerCount: Int = 238,
    val broadcastStreamType: StreamType = StreamType.PARTY_ROOM,
    // Multiplayer Game State
    val isGameRolling: Boolean = false,
    val playerDice: Int = 4,
    val opponentDice1: Int = 3,
    val opponentDice2: Int = 5,
    val gameBetAmount: Int = 100,
    val gameResultMessage: String = "Place your bet & roll against live players!",
    val totalGameWins: Int = 14
)

class AddaBuzzViewModel(
    val repository: AddaBuzzRepository = AddaBuzzRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    val streamers: StateFlow<List<Streamer>> = repository.streamers
    val userProfile: StateFlow<UserProfile> = repository.userProfile
    val notifications: StateFlow<List<NotificationItem>> = repository.notifications
    val directMessages: StateFlow<List<DirectMessage>> = repository.directMessages
    val adminMetrics: StateFlow<AdminMetrics> = repository.adminMetrics
    val hostTasks: StateFlow<List<HostTask>> = repository.hostTasks

    private var chatJob: Job? = null
    private var viewersJob: Job? = null
    private var activeRoomId: Long? = null
    private val pendingChat = mutableListOf<ChatMessage>()

    init {
        _uiState.update {
            it.copy(
                chatMessages = listOf(
                    ChatMessage(1L, "Andrew", "Welcome to AddaBuzz Live! High quality stream 🔥", Gender.MALE, 14, vipLevel = 2),
                    ChatMessage(2L, "Stella", "Thanks for tuning in everyone! ❤️ Send your love & join mic!", Gender.FEMALE, 42, vipLevel = 4),
                    ChatMessage(3L, "James", "Audio is so crisp, low latency feels instant!", Gender.MALE, 8),
                    ChatMessage(4L, "Karim", "Hello from Dhaka! Love this community 🇧🇩", Gender.MALE, 28, vipLevel = 3),
                    ChatMessage(5L, "Nadia", "Just sent a Luxury Yacht! 🛥️ Go team!", Gender.FEMALE, 19, isGift = true, giftIcon = "🛥️", vipLevel = 5)
                )
            )
        }

        viewModelScope.launch {
            delay(2200)
            if (_uiState.value.currentScreen == Screen.SPLASH) {
                _uiState.update { it.copy(currentScreen = Screen.HOME) }
            }
        }

        // Keep the open room in sync with Firestore snapshots (viewers, PK score, seats).
        viewModelScope.launch {
            repository.streamers.collect { rooms ->
                val active = _uiState.value.activeStreamer ?: return@collect
                val fresh = rooms.find { it.id == active.id } ?: return@collect
                if (fresh != active) {
                    _uiState.update { it.copy(activeStreamer = fresh) }
                }
            }
        }
    }

    private fun enterRoom(roomId: Long?) {
        chatJob?.cancel()
        viewersJob?.cancel()
        pendingChat.clear()
        activeRoomId = roomId
        if (roomId == null) return

        chatJob = viewModelScope.launch {
            try {
                repository.chatFeed(roomId).collect { remote -> renderChat(remote) }
            } catch (_: Exception) {
                // Offline or rules blocked: keep whatever is on screen.
            }
        }

        viewersJob = viewModelScope.launch {
            while (true) {
                delay(4000)
                repository.tickViewers(roomId, Random.nextInt(1, 4))
            }
        }
    }

    private fun renderChat(remote: List<ChatMessage>) {
        val delivered = remote.map { it.user to it.text }.toSet()
        pendingChat.removeAll { (it.user to it.text) in delivered }
        _uiState.update { it.copy(chatMessages = remote + pendingChat) }
    }

    private fun publishChat(message: ChatMessage) {
        val roomId = activeRoomId
        if (roomId == null) {
            _uiState.update { it.copy(chatMessages = it.chatMessages + message) }
            return
        }
        pendingChat.add(message)
        _uiState.update { it.copy(chatMessages = it.chatMessages + message) }
        repository.sendChat(roomId, message)
    }

    fun navigateTo(screen: Screen) {
        if (screen != Screen.LIVE_STREAM && screen != Screen.BROADCAST_LIVE) {
            enterRoom(null)
        }
        _uiState.update { it.copy(currentScreen = screen) }
    }

    fun setHomeTab(tab: String) {
        _uiState.update { it.copy(homeTab = tab) }
    }

    fun setLeaderboardTab(tab: String) {
        _uiState.update { it.copy(leaderboardTab = tab) }
    }

    fun setLeaderboardType(type: String) {
        _uiState.update { it.copy(leaderboardType = type) }
    }

    fun setMessagesTab(tab: String) {
        _uiState.update { it.copy(messagesTab = tab) }
    }

    fun toggleLanguage() {
        _uiState.update {
            it.copy(language = if (it.language == AppLanguage.EN) AppLanguage.BN else AppLanguage.EN)
        }
    }

    fun toggleDarkMode() {
        _uiState.update { it.copy(isDarkMode = !it.isDarkMode) }
    }

    fun selectStreamer(streamer: Streamer) {
        _uiState.update {
            it.copy(
                activeStreamer = streamer,
                currentScreen = Screen.LIVE_STREAM
            )
        }
        enterRoom(streamer.id)
    }

    fun toggleFollowStreamer(streamerId: Long) {
        repository.toggleFollow(streamerId)
        val active = _uiState.value.activeStreamer
        if (active != null && active.id == streamerId) {
            _uiState.update {
                it.copy(activeStreamer = active.copy(isFollowing = !active.isFollowing))
            }
        }
    }

    fun triggerHeart() {
        val id = System.currentTimeMillis() + Random.nextLong(1000)
        val colors = listOf(0xFFFF2A6D, 0xFFFF5E36, 0xFFFF1356, 0xFFFFD700, 0xFF00E5FF, 0xFFA855F7)
        val colorHex = colors.random()
        val left = Random.nextFloat() * 70f + 15f
        val newHeart = FloatingHeart(id, colorHex, left)

        _uiState.update { it.copy(floatingHearts = it.floatingHearts + newHeart) }

        viewModelScope.launch {
            delay(1800)
            _uiState.update { state ->
                state.copy(floatingHearts = state.floatingHearts.filter { it.id != id })
            }
        }
    }

    fun sendChatMessage(text: String) {
        if (text.isBlank()) return
        val user = userProfile.value
        val msg = ChatMessage(
            id = System.currentTimeMillis(),
            user = user.name,
            text = text.take(500),
            gender = user.gender,
            level = user.level,
            vipLevel = user.vipLevel
        )
        publishChat(msg)
    }

    fun sendGift(gift: GiftItem) {
        val success = repository.deductCoins(gift.price)
        if (success) {
            val user = userProfile.value
            val active = _uiState.value.activeStreamer
            val banner = ActiveGiftBanner(
                giftName = gift.name,
                giftIcon = gift.icon,
                senderName = user.name,
                price = gift.price
            )
            val giftMsg = ChatMessage(
                id = System.currentTimeMillis(),
                user = user.name,
                text = "sent ${gift.name} ${gift.icon}!",
                gender = user.gender,
                level = user.level,
                isGift = true,
                giftIcon = gift.icon,
                vipLevel = user.vipLevel
            )

            // Gifts raise the host's charm; in a PK room they also push our side's score.
            if (active != null) {
                repository.boostCharmScore(active.id, gift.price)
                if (active.pkBattle != null) {
                    repository.boostPKScore(active.id, gift.price)
                    _uiState.update {
                        val updatedPK = active.pkBattle.copy(
                            leftScore = active.pkBattle.leftScore + gift.price
                        )
                        it.copy(activeStreamer = active.copy(pkBattle = updatedPK))
                    }
                }
            }

            _uiState.update {
                it.copy(
                    showGiftModal = false,
                    activeGiftBanner = banner
                )
            }
            publishChat(giftMsg)

            viewModelScope.launch {
                delay(2800)
                _uiState.update { it.copy(activeGiftBanner = null) }
            }
        }
    }

    fun takePartySeat(seatIndex: Int) {
        val active = _uiState.value.activeStreamer ?: return
        repository.takePartySeat(active.id, seatIndex)
        // Refresh active streamer from repository
        val updated = repository.streamers.value.find { it.id == active.id }
        if (updated != null) {
            _uiState.update { it.copy(activeStreamer = updated) }
        }
    }

    fun topUpCoins(amount: Int) {
        repository.addCoins(amount)
        _uiState.update { it.copy(showTopUpModal = false) }
    }

    fun withdrawPoints(points: Long): Boolean {
        val ok = repository.withdrawPoints(points)
        if (ok) {
            _uiState.update { it.copy(showWithdrawModal = false) }
        }
        return ok
    }

    fun setShowGiftModal(show: Boolean) {
        _uiState.update { it.copy(showGiftModal = show) }
    }

    fun setShowShareModal(show: Boolean) {
        _uiState.update { it.copy(showShareModal = show) }
    }

    fun setShowProfileCard(streamer: Streamer?) {
        _uiState.update { it.copy(showProfileCard = streamer) }
    }

    fun setShowTopUpModal(show: Boolean) {
        _uiState.update { it.copy(showTopUpModal = show) }
    }

    fun setShowWithdrawModal(show: Boolean) {
        _uiState.update { it.copy(showWithdrawModal = show) }
    }

    fun setShowSecurityDialog(show: Boolean) {
        _uiState.update { it.copy(showSecurityDialog = show) }
    }

    fun setShowTasksDialog(show: Boolean) {
        _uiState.update { it.copy(showTasksDialog = show) }
    }

    fun toggleCamera() {
        _uiState.update { it.copy(isFrontCamera = !it.isFrontCamera) }
    }

    fun toggleMic() {
        _uiState.update { it.copy(isMicMuted = !it.isMicMuted) }
    }

    fun toggleBeautyFilter() {
        _uiState.update { it.copy(isBeautyFilterOn = !it.isBeautyFilterOn) }
    }

    fun setBroadcastStreamType(type: StreamType) {
        _uiState.update { it.copy(broadcastStreamType = type) }
    }

    fun startOwnBroadcast(title: String, category: String, streamType: StreamType) {
        val newStreamer = repository.addBroadcastStream(title, category, streamType)
        _uiState.update {
            it.copy(
                activeStreamer = newStreamer,
                currentScreen = Screen.BROADCAST_LIVE
            )
        }
        enterRoom(newStreamer.id)
    }

    fun playMultiplayerRound(bet: Int) {
        if (_uiState.value.isGameRolling) return
        val currentCoins = userProfile.value.coins
        if (currentCoins < bet) {
            _uiState.update { it.copy(gameResultMessage = "Not enough coins! Please recharge.") }
            return
        }

        repository.deductCoins(bet)
        _uiState.update {
            it.copy(
                isGameRolling = true,
                gameBetAmount = bet,
                gameResultMessage = "Rolling dice in live multiplayer room..."
            )
        }

        viewModelScope.launch {
            repeat(6) {
                delay(120)
                _uiState.update {
                    it.copy(
                        playerDice = Random.nextInt(1, 7),
                        opponentDice1 = Random.nextInt(1, 7),
                        opponentDice2 = Random.nextInt(1, 7)
                    )
                }
            }
            delay(200)
            val pScore = Random.nextInt(1, 7)
            val o1Score = Random.nextInt(1, 7)
            val o2Score = Random.nextInt(1, 7)

            val won = pScore >= o1Score && pScore >= o2Score
            val prize = bet * 2

            if (won) {
                repository.addCoins(prize)
            }

            val msg = if (won) {
                "🎉 You WON! +$prize Coins credited to your wallet!"
            } else {
                "💔 Opponents had higher score. Better luck next roll!"
            }

            _uiState.update {
                it.copy(
                    isGameRolling = false,
                    playerDice = pScore,
                    opponentDice1 = o1Score,
                    opponentDice2 = o2Score,
                    gameResultMessage = msg,
                    totalGameWins = if (won) it.totalGameWins + 1 else it.totalGameWins
                )
            }
        }
    }

    fun deductCoins(amount: Int): Boolean {
        return repository.deductCoins(amount)
    }

    fun addCoins(amount: Int) {
        repository.addCoins(amount)
    }

    fun updateUserProfile(name: String, bio: String, gender: Gender) {
        repository.updateProfile(name, bio, gender)
    }

    fun setUserRole(role: UserRole) {
        repository.updateRole(role)
    }
}
