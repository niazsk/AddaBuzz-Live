package com.addabuzz.live

import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.tasks.await
import kotlin.random.Random

class AddaBuzzRepository(
    databaseId: String = "(default)"
) {
    val auth: FirebaseAuth = FirebaseAuth.getInstance()
    val db: FirebaseFirestore =
        FirebaseFirestore.getInstance(FirebaseApp.getInstance(), databaseId)

    private val adminEmails = setOf("niazskapp@gmail.com", "fayselsk@gmail.com")

    fun isBootstrappedAdmin(email: String?): Boolean {
        return email != null && adminEmails.contains(email.trim().lowercase())
    }

    suspend fun signInWithEmail(email: String, password: String): FirebaseUser {
        val result = auth.signInWithEmailAndPassword(email.trim(), password).await()
        return result.user ?: error("Authentication failed.")
    }

    suspend fun registerWithEmail(email: String, password: String): FirebaseUser {
        val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
        val user = result.user ?: error("Registration failed.")
        if (!user.isEmailVerified) {
            user.sendEmailVerification().await()
        }
        return user
    }

    suspend fun reloadVerifiedStatus(): FirebaseUser? {
        val user = auth.currentUser ?: return null
        user.reload().await()
        user.getIdToken(true).await()
        return auth.currentUser
    }

    suspend fun resendVerification() {
        val user = auth.currentUser ?: error("No active user.")
        user.sendEmailVerification().await()
    }

    fun signOut() {
        auth.signOut()
    }

    suspend fun fetchUserProfile(uid: String): UserProfile? {
        val snap = db.collection("users").document(uid).get().await()
        if (!snap.exists()) return null
        return UserProfile(
            uid = snap.getString("uid") ?: uid,
            platformId = snap.getString("platformId") ?: "",
            username = snap.getString("username") ?: "",
            displayName = snap.getString("displayName") ?: "",
            bio = snap.getString("bio") ?: "",
            country = snap.getString("country") ?: "United States",
            gender = snap.getString("gender") ?: "Prefer not to say",
            accountType = snap.getString("accountType") ?: "USER",
            avatarColor = snap.getString("avatarColor") ?: "#6366F1",
            followersCount = snap.getLong("followersCount") ?: 0L,
            isOnline = snap.getBoolean("isOnline") ?: true,
            isSuspended = snap.getBoolean("isSuspended") ?: false
        )
    }

    suspend fun completeOnboarding(
        user: FirebaseUser,
        rawUsername: String,
        displayName: String
    ): UserProfile {
        if (!user.isEmailVerified) {
            error("Please verify your email address before creating your profile.")
        }
        val normalized = rawUsername.trim().lowercase().replace(Regex("[^a-z0-9_]"), "").take(32)
        require(normalized.length >= 3) { "Username must be at least 3 characters." }

        val usernameRef = db.collection("usernames").document(normalized)
        if (usernameRef.get().await().exists()) {
            error("Username @$normalized is already taken.")
        }

        val role = if (isBootstrappedAdmin(user.email)) "SUPER_AGENT" else "USER"
        val platformId = "AB-${100000 + Random.nextInt(899999)}"
        val safeName = displayName.trim().ifEmpty { normalized }.take(64)

        val batch = db.batch()
        batch.set(
            usernameRef,
            mapOf(
                "uid" to user.uid,
                "username" to normalized,
                "createdAt" to FieldValue.serverTimestamp()
            )
        )
        batch.set(
            db.collection("users").document(user.uid),
            mapOf(
                "uid" to user.uid,
                "platformId" to platformId,
                "username" to normalized,
                "displayName" to safeName,
                "bio" to "Creator on AddaBuzz Live Android.",
                "country" to "United States",
                "gender" to "Prefer not to say",
                "accountType" to role,
                "avatarColor" to "#6366F1",
                "coverGradient" to "linear-gradient(135deg, #3B0764 0%, #1E3A8A 100%)",
                "followersCount" to 0L,
                "followingCount" to 0L,
                "isOnline" to true,
                "showPresence" to true,
                "lastActiveLabel" to "Online",
                "isNewCreator" to true,
                "isSuspended" to false,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
        batch.set(
            db.collection("userPrivate").document(user.uid),
            mapOf(
                "uid" to user.uid,
                "email" to (user.email ?: "unknown@addabuzz.live"),
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
        batch.set(
            db.collection("wallets").document(user.uid),
            mapOf(
                "uid" to user.uid,
                "coinBalance" to 500L,
                "diamondBalance" to 120L,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
        val welcomeTxId = "tx_welcome_${user.uid.take(16)}"
        batch.set(
            db.collection("wallets").document(user.uid)
                .collection("transactions").document(welcomeTxId),
            mapOf(
                "transactionId" to welcomeTxId,
                "uid" to user.uid,
                "currency" to "COIN",
                "direction" to "CREDIT",
                "amount" to 500L,
                "reason" to "Welcome Community Grant (Coins)",
                "counterparty" to "AddaBuzz Platform",
                "idempotencyKey" to "welcome_grant_coin_${user.uid}",
                "createdAt" to FieldValue.serverTimestamp()
            )
        )
        batch.commit().await()
        return fetchUserProfile(user.uid) ?: error("Profile created but failed to load.")
    }

    fun observeLiveRooms(onUpdate: (List<LiveRoom>) -> Unit): ListenerRegistration {
        return db.collection("liveRooms")
            .whereEqualTo("status", "LIVE")
            .whereEqualTo("isPrivateFollowersOnly", false)
            .limit(40)
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val items = snap.documents.map { d ->
                    LiveRoom(
                        roomId = d.getString("roomId") ?: d.id,
                        hostUid = d.getString("hostUid") ?: "",
                        title = d.getString("title") ?: "Live Room",
                        description = d.getString("description") ?: "",
                        category = d.getString("category") ?: "Popular",
                        mode = d.getString("mode") ?: "VIDEO",
                        status = d.getString("status") ?: "LIVE",
                        viewerCount = d.getLong("viewerCount") ?: 1L,
                        isPrivateFollowersOnly = d.getBoolean("isPrivateFollowersOnly") ?: false
                    )
                }
                onUpdate(items)
            }
    }

    fun observePublicUsers(onUpdate: (List<UserProfile>) -> Unit): ListenerRegistration {
        return db.collection("users")
            .whereEqualTo("isSuspended", false)
            .limit(60)
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val items = snap.documents.map { d ->
                    UserProfile(
                        uid = d.getString("uid") ?: d.id,
                        platformId = d.getString("platformId") ?: "",
                        username = d.getString("username") ?: "",
                        displayName = d.getString("displayName") ?: "",
                        bio = d.getString("bio") ?: "",
                        country = d.getString("country") ?: "United States",
                        gender = d.getString("gender") ?: "Prefer not to say",
                        accountType = d.getString("accountType") ?: "USER",
                        avatarColor = d.getString("avatarColor") ?: "#6366F1",
                        followersCount = d.getLong("followersCount") ?: 0L,
                        isOnline = d.getBoolean("isOnline") ?: false,
                        isSuspended = false
                    )
                }
                onUpdate(items)
            }
    }

    fun observeWallet(uid: String, onUpdate: (WalletState) -> Unit): ListenerRegistration {
        return db.collection("wallets").document(uid)
            .addSnapshotListener { snap, _ ->
                if (snap != null && snap.exists()) {
                    onUpdate(
                        WalletState(
                            coinBalance = snap.getLong("coinBalance") ?: 0L,
                            diamondBalance = snap.getLong("diamondBalance") ?: 0L
                        )
                    )
                }
            }
    }

    fun observeSeats(roomId: String, onUpdate: (List<GuestSeat>) -> Unit): ListenerRegistration {
        return db.collection("liveRooms").document(roomId).collection("seats")
            .whereGreaterThanOrEqualTo("seatNumber", 1)
            .whereLessThanOrEqualTo("seatNumber", 8)
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val byNum = snap.documents.associate { d ->
                    val num = (d.getLong("seatNumber") ?: 1L).toInt()
                    num to GuestSeat(
                        seatNumber = num,
                        status = d.getString("status") ?: "AVAILABLE",
                        occupantUid = d.getString("occupantUid"),
                        occupantName = d.getString("occupantName"),
                        occupantUsername = d.getString("occupantUsername"),
                        isMuted = d.getBoolean("isMuted") ?: false
                    )
                }
                onUpdate((1..8).map { num -> byNum[num] ?: GuestSeat(seatNumber = num) })
            }
    }

    fun observeRoomMessages(roomId: String, onUpdate: (List<RoomMessage>) -> Unit): ListenerRegistration {
        return db.collection("liveRooms").document(roomId).collection("messages")
            .whereEqualTo("roomId", roomId)
            .limit(80)
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val msgs = snap.documents.map { d ->
                    RoomMessage(
                        id = d.getString("id") ?: d.id,
                        roomId = roomId,
                        uid = d.getString("uid") ?: "",
                        username = d.getString("username") ?: "",
                        displayName = d.getString("displayName") ?: "",
                        text = d.getString("text") ?: "",
                        isGiftEvent = d.getBoolean("isGiftEvent") ?: false
                    )
                }
                onUpdate(msgs)
            }
    }

    suspend fun createLiveRoom(host: UserProfile, title: String, category: String, mode: String): String {
        val roomId = "room_${System.currentTimeMillis()}_${host.uid.take(6)}"
        val batch = db.batch()
        batch.set(
            db.collection("liveRooms").document(roomId),
            mapOf(
                "roomId" to roomId,
                "hostUid" to host.uid,
                "title" to title.trim().take(120),
                "description" to "Streaming live from AddaBuzz Android.",
                "category" to category,
                "mode" to mode,
                "status" to "LIVE",
                "viewerCount" to 1L,
                "isPrivateFollowersOnly" to false,
                "isFeatured" to false,
                "fallbackGradient" to "linear-gradient(135deg, #3B0764 0%, #1E3A8A 100%)",
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
        for (i in 1..8) {
            batch.set(
                db.collection("liveRooms").document(roomId).collection("seats").document("seat_$i"),
                mapOf(
                    "seatNumber" to i,
                    "status" to "AVAILABLE",
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            )
        }
        batch.commit().await()
        return roomId
    }

    suspend fun postRoomMessage(roomId: String, sender: UserProfile, text: String) {
        val msgId = "msg_${System.currentTimeMillis()}_${Random.nextInt(1000, 9999)}"
        db.collection("liveRooms").document(roomId).collection("messages").document(msgId)
            .set(
                mapOf(
                    "id" to msgId,
                    "roomId" to roomId,
                    "uid" to sender.uid,
                    "username" to sender.username,
                    "displayName" to sender.displayName,
                    "accountType" to sender.accountType,
                    "text" to text.trim().take(400),
                    "createdAt" to FieldValue.serverTimestamp()
                )
            ).await()
    }

    suspend fun sendGift(roomId: String, sender: UserProfile, gift: GiftOption) {
        val walletRef = db.collection("wallets").document(sender.uid)
        val txId = "tx_${System.currentTimeMillis()}_${Random.nextInt(100, 999)}"
        val txRef = walletRef.collection("transactions").document(txId)
        val msgId = "msg_gift_${System.currentTimeMillis()}_${Random.nextInt(100, 999)}"
        val msgRef = db.collection("liveRooms").document(roomId).collection("messages").document(msgId)

        db.runTransaction { tx ->
            val wSnap = tx.get(walletRef)
            val coins = wSnap.getLong("coinBalance") ?: 0L
            val diamonds = wSnap.getLong("diamondBalance") ?: 0L
            if (gift.currency == "COIN" && coins < gift.price) {
                error("Insufficient Coins (need ${gift.price}).")
            }
            if (gift.currency == "DIAMOND" && diamonds < gift.price) {
                error("Insufficient Diamonds (need ${gift.price}).")
            }
            tx.update(
                walletRef,
                mapOf(
                    "coinBalance" to if (gift.currency == "COIN") coins - gift.price else coins,
                    "diamondBalance" to if (gift.currency == "DIAMOND") diamonds - gift.price else diamonds,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            )
            tx.set(
                txRef,
                mapOf(
                    "transactionId" to txId,
                    "uid" to sender.uid,
                    "currency" to gift.currency,
                    "direction" to "DEBIT",
                    "amount" to gift.price,
                    "reason" to "Sent ${gift.name}",
                    "idempotencyKey" to "gift_${gift.giftId}_${System.currentTimeMillis()}",
                    "createdAt" to FieldValue.serverTimestamp()
                )
            )
            tx.set(
                msgRef,
                mapOf(
                    "id" to msgId,
                    "roomId" to roomId,
                    "uid" to sender.uid,
                    "username" to sender.username,
                    "displayName" to sender.displayName,
                    "accountType" to sender.accountType,
                    "text" to "Sent ${gift.name} (${gift.price} ${gift.currency})!",
                    "isGiftEvent" to true,
                    "giftName" to gift.name,
                    "giftCurrency" to gift.currency,
                    "giftAmount" to gift.price,
                    "createdAt" to FieldValue.serverTimestamp()
                )
            )
        }.await()
    }

    suspend fun promoteUserToAgent(actor: UserProfile, target: UserProfile) {
        val promoId = "promo_${System.currentTimeMillis()}_${target.uid.take(8)}"
        val batch = db.batch()
        batch.update(
            db.collection("users").document(target.uid),
            mapOf(
                "accountType" to "AGENT",
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
        batch.set(
            db.collection("accountPromotions").document(promoId),
            mapOf(
                "promotionId" to promoId,
                "actorUid" to actor.uid,
                "actorUsername" to actor.username,
                "targetUid" to target.uid,
                "targetUsername" to target.username,
                "beforeType" to "USER",
                "afterType" to "AGENT",
                "createdAt" to FieldValue.serverTimestamp()
            )
        )
        batch.commit().await()
    }

    suspend fun requestSeat(roomId: String, seatNumber: Int, user: UserProfile) {
        val seatRef = db.collection("liveRooms").document(roomId)
            .collection("seats").document("seat_$seatNumber")
        val reqId = "req_${user.uid.take(12)}_$seatNumber"
        val reqRef = db.collection("liveRooms").document(roomId)
            .collection("joinRequests").document(reqId)

        val batch = db.batch()
        batch.update(
            seatRef,
            mapOf(
                "status" to "REQUESTED",
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
        batch.set(
            reqRef,
            mapOf(
                "requestId" to reqId,
                "roomId" to roomId,
                "uid" to user.uid,
                "username" to user.username,
                "displayName" to user.displayName,
                "avatarColor" to user.avatarColor,
                "preferredSeatNumber" to seatNumber,
                "createdAt" to FieldValue.serverTimestamp()
            )
        )
        batch.commit().await()
    }

    suspend fun stepDownSeat(roomId: String, seatNumber: Int) {
        val seatRef = db.collection("liveRooms").document(roomId)
            .collection("seats").document("seat_$seatNumber")
        seatRef.update(
            mapOf(
                "status" to "AVAILABLE",
                "occupantUid" to FieldValue.delete(),
                "occupantName" to FieldValue.delete(),
                "occupantUsername" to FieldValue.delete(),
                "occupantAvatarColor" to FieldValue.delete(),
                "isMuted" to FieldValue.delete(),
                "isSpeaking" to FieldValue.delete(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()
    }

    suspend fun endLiveRoom(roomId: String) {
        db.collection("liveRooms").document(roomId).update(
            mapOf(
                "status" to "ENDED",
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()
    }
}
