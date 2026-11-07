package com.example.data.remote

import com.example.data.model.ChatMessage
import com.example.data.model.Gender
import com.example.data.model.PKBattleState
import com.example.data.model.PartySeat
import com.example.data.model.StreamType
import com.example.data.model.Streamer
import com.example.data.model.UserProfile
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.util.Locale

object FirestoreSources {

    private const val ROOMS = "rooms"
    private const val CHAT = "chat"
    private const val MAX_CHAT_LENGTH = 500

    private val db: FirebaseFirestore? by lazy {
        runCatching { FirebaseFirestore.getInstance() }.getOrNull()
    }

    private fun room(roomId: Long): DocumentReference? =
        db?.collection(ROOMS)?.document(roomId.toString())

    fun roomsLive(): Flow<List<Streamer>> = callbackFlow {
        val client = db
        if (client == null) {
            close()
        } else {
            val registration = client.collection(ROOMS)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        close(error)
                        return@addSnapshotListener
                    }
                    val rooms = snapshot?.documents?.mapNotNull { doc -> runCatching { doc.toStreamer() }.getOrNull() }
                        ?: emptyList()
                    trySend(rooms)
                }
            awaitClose { registration.remove() }
        }
    }

    fun chatLive(roomId: Long): Flow<List<ChatMessage>> = callbackFlow {
        val chat = room(roomId)?.collection(CHAT)
        if (chat == null) {
            close()
        } else {
            val registration = chat
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(100)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        close(error)
                        return@addSnapshotListener
                    }
                    val docs = snapshot?.documents ?: emptyList()
                    val messages = docs.reversed().mapIndexedNotNull { index, doc ->
                        runCatching { doc.toChatMessage(index) }.getOrNull()
                    }
                    trySend(messages)
                }
            awaitClose { registration.remove() }
        }
    }

    fun addChatMessage(roomId: Long, message: ChatMessage) {
        val chat = room(roomId)?.collection(CHAT) ?: return
        val text = message.text.take(MAX_CHAT_LENGTH)
        if (text.isBlank()) return
        val payload = hashMapOf<String, Any>(
            "user" to message.user,
            "text" to text,
            "gender" to message.gender.name,
            "level" to message.level,
            "vipLevel" to message.vipLevel,
            "isSystem" to message.isSystem,
            "isGift" to message.isGift,
            "giftIcon" to message.giftIcon,
            "createdAt" to FieldValue.serverTimestamp()
        )
        chat.document().set(payload)
    }

    fun setFollowing(roomId: Long, following: Boolean) {
        room(roomId)?.update("isFollowing", following)
    }

    fun seatUser(roomId: Long, seatIndex: Int, user: UserProfile) {
        val docRef = room(roomId) ?: return
        db?.runTransaction { transaction ->
            val snapshot = transaction.get(docRef)
            if (!snapshot.exists()) return@runTransaction
            val streamer = runCatching { snapshot.toStreamer() }.getOrNull() ?: return@runTransaction
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
            transaction.update(docRef, "partySeats", updatedSeats.map { it.toPayload() })
        }
    }

    fun deleteRoom(roomId: Long) {
        room(roomId)?.delete()
    }

    fun incrementPKLeftScore(roomId: Long, delta: Int) {
        room(roomId)?.update("pkBattle.leftScore", FieldValue.increment(delta.toLong()))
    }

    fun incrementCharmScore(roomId: Long, delta: Long) {
        room(roomId)?.update("charmScore", FieldValue.increment(delta))
    }

    fun incrementViewers(roomId: Long, delta: Int) {
        room(roomId)?.update("viewersCount", FieldValue.increment(delta.toLong()))
    }

    fun saveRoom(streamer: Streamer) {
        val reference = room(streamer.id) ?: return
        reference.set(streamer.toPayload())
    }

    private fun DocumentSnapshot.toStreamer(): Streamer {
        val viewersCount = getLong("viewersCount")?.toInt() ?: 0
        val seats = (get("partySeats") as? List<*>).orEmpty().mapNotNull { entry ->
            @Suppress("UNCHECKED_CAST")
            (entry as? Map<String, Any?>)?.toPartySeat()
        }
        return Streamer(
            id = id.toLongOrNull() ?: 0L,
            name = getString("name").orEmpty(),
            idNum = getString("idNum").orEmpty(),
            viewers = viewersLabel(viewersCount),
            viewersCount = viewersCount,
            imageUrl = getString("imageUrl").orEmpty(),
            category = getString("category").orEmpty(),
            bio = getString("bio").orEmpty(),
            level = getLong("level")?.toInt() ?: 1,
            likes = getString("likes").orEmpty(),
            gender = enumOr(getString("gender"), Gender.FEMALE),
            isFollowing = getBoolean("isFollowing") ?: false,
            latencyMs = getLong("latencyMs")?.toInt() ?: 38,
            fps = getLong("fps")?.toInt() ?: 60,
            resolution = getString("resolution") ?: "1080p 60fps",
            title = getString("title").orEmpty(),
            country = getString("country") ?: "Bangladesh",
            countryFlag = getString("countryFlag") ?: "🇧🇩",
            streamType = enumOr(getString("streamType"), StreamType.LIVE),
            charmScore = getLong("charmScore") ?: 0L,
            partySeats = seats,
            pkBattle = pkBattleFrom(get("pkBattle"))
        )
    }

    private fun DocumentSnapshot.toChatMessage(index: Int): ChatMessage? {
        val text = getString("text") ?: return null
        val created = getDate("createdAt")?.time ?: 0L
        return ChatMessage(
            id = created * 1000 + index,
            user = getString("user").orEmpty(),
            text = text,
            gender = enumOr(getString("gender"), Gender.FEMALE),
            level = getLong("level")?.toInt() ?: 1,
            vipLevel = getLong("vipLevel")?.toInt() ?: 1,
            isSystem = getBoolean("isSystem") ?: false,
            isGift = getBoolean("isGift") ?: false,
            giftIcon = getString("giftIcon").orEmpty(),
            time = relativeTime(created)
        )
    }

    private fun Map<String, Any?>.toPartySeat(): PartySeat = PartySeat(
            index = (this["index"] as? Number)?.toInt() ?: 0,
            userName = this["userName"] as? String,
            avatarUrl = this["avatarUrl"] as? String,
            gender = (this["gender"] as? String)?.let { enumOr(it, Gender.FEMALE) },
            isHost = this["isHost"] as? Boolean ?: false,
            isMuted = this["isMuted"] as? Boolean ?: false,
            isLocked = this["isLocked"] as? Boolean ?: false,
            isSpeaking = this["isSpeaking"] as? Boolean ?: false,
            charmScore = (this["charmScore"] as? Number)?.toInt() ?: 0
        )

    @Suppress("UNCHECKED_CAST")
    private fun pkBattleFrom(raw: Any?): PKBattleState? {
        val map = raw as? Map<String, Any?> ?: return null
        val opponent = map["opponentName"] as? String ?: return null
        return PKBattleState(
            opponentName = opponent,
            opponentAvatar = map["opponentAvatar"] as? String ?: "",
            opponentGender = enumOr(map["opponentGender"] as? String, Gender.MALE),
            leftScore = (map["leftScore"] as? Number)?.toInt() ?: 0,
            rightScore = (map["rightScore"] as? Number)?.toInt() ?: 0,
            timeLeftSeconds = (map["timeLeftSeconds"] as? Number)?.toInt() ?: 0,
            statusText = map["statusText"] as? String ?: "PK BATTLE IN PROGRESS 🔥",
            punishmentText = map["punishmentText"] as? String ?: ""
        )
    }

    private fun Streamer.toPayload(): Map<String, Any> {
        val payload = hashMapOf<String, Any>(
            "name" to name,
            "idNum" to idNum,
            "viewersCount" to viewersCount,
            "imageUrl" to imageUrl,
            "category" to category,
            "bio" to bio,
            "level" to level,
            "likes" to likes,
            "gender" to gender.name,
            "isFollowing" to isFollowing,
            "latencyMs" to latencyMs,
            "fps" to fps,
            "resolution" to resolution,
            "title" to title,
            "country" to country,
            "countryFlag" to countryFlag,
            "streamType" to streamType.name,
            "charmScore" to charmScore
        )
        if (partySeats.isNotEmpty()) payload["partySeats"] = partySeats.map { it.toPayload() }
        pkBattle?.let { payload["pkBattle"] = it.toPayload() }
        return payload
    }

    private fun PartySeat.toPayload(): Map<String, Any?> {
        val seat = hashMapOf<String, Any?>(
            "index" to index,
            "isHost" to isHost,
            "isMuted" to isMuted,
            "isLocked" to isLocked,
            "isSpeaking" to isSpeaking,
            "charmScore" to charmScore
        )
        seat["userName"] = userName
        seat["avatarUrl"] = avatarUrl
        seat["gender"] = gender?.name
        return seat
    }

    private fun PKBattleState.toPayload(): Map<String, Any> = hashMapOf(
        "opponentName" to opponentName,
        "opponentAvatar" to opponentAvatar,
        "opponentGender" to opponentGender.name,
        "leftScore" to leftScore,
        "rightScore" to rightScore,
        "timeLeftSeconds" to timeLeftSeconds,
        "statusText" to statusText,
        "punishmentText" to punishmentText
    )

    private inline fun <reified T : Enum<T>> enumOr(raw: String?, fallback: T): T {
        val name = raw ?: return fallback
        return runCatching { enumValueOf<T>(name) }.getOrDefault(fallback)
    }

    private fun viewersLabel(count: Int): String = when {
        count >= 1_000_000 -> trimZero(count / 1_000_000.0) + "M"
        count >= 1_000 -> trimZero(count / 1_000.0) + "K"
        else -> count.toString()
    }

    private fun trimZero(value: Double): String {
        val oneDecimal = String.format(Locale.US, "%.1f", value)
        return oneDecimal.removeSuffix(".0")
    }

    private fun relativeTime(millis: Long): String {
        if (millis <= 0L) return "Just now"
        val delta = System.currentTimeMillis() - millis
        return when {
            delta < 60_000L -> "Just now"
            delta < 3_600_000L -> "${delta / 60_000L}m ago"
            delta < 86_400_000L -> "${delta / 3_600_000L}h ago"
            else -> "${delta / 86_400_000L}d ago"
        }
    }
}
