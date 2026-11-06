package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.Gender
import com.example.data.model.GiftItem
import com.example.data.model.PartySeat
import com.example.data.model.PKBattleState
import com.example.data.model.StreamType
import com.example.data.model.Streamer
import com.example.ui.components.FloatingHeartsDisplay
import com.example.ui.components.GenderBadge
import com.example.ui.components.GiftCelebrationBanner
import com.example.ui.components.LatencyBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen
import kotlinx.coroutines.launch

@Composable
fun LiveStreamScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val streamer = uiState.activeStreamer ?: return
    val chatListState = rememberLazyListState()

    var chatInput by remember { mutableStateOf("") }

    LaunchedEffect(uiState.chatMessages.size) {
        if (uiState.chatMessages.isNotEmpty()) {
            chatListState.animateScrollToItem(uiState.chatMessages.size - 1)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .testTag("live_stream_screen")
    ) {
        // Video Stream Background
        AsyncImage(
            model = streamer.imageUrl,
            contentDescription = streamer.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .clickable { viewModel.triggerHeart() }
        )

        // Gradient overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.7f),
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.5f),
                            Color.Black.copy(alpha = 0.95f)
                        )
                    )
                )
        )

        // Floating Hearts Animation
        FloatingHeartsDisplay(
            hearts = uiState.floatingHearts,
            modifier = Modifier.fillMaxSize()
        )

        // Main Live Overlay Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Header: Streamer Pill, Contributor Avatars, Close Button
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Streamer Pill
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(24.dp))
                            .background(Color.Black.copy(alpha = 0.65f))
                            .border(1.dp, BorderPurple, RoundedCornerShape(24.dp))
                            .clickable { viewModel.setShowProfileCard(streamer) }
                            .padding(end = 8.dp, top = 2.dp, bottom = 2.dp, start = 2.dp)
                            .testTag("streamer_profile_pill")
                    ) {
                        AsyncImage(
                            model = streamer.imageUrl,
                            contentDescription = streamer.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .border(1.5.dp, ElectricPink, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = streamer.name,
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                GenderBadge(gender = streamer.gender, level = streamer.level)
                            }
                            Text(
                                text = "${streamer.countryFlag} 🔥 ${streamer.viewers}",
                                color = AmberGold,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        // Follow Button
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    if (streamer.isFollowing) Brush.horizontalGradient(listOf(LiveGreen, LiveGreen))
                                    else Brush.horizontalGradient(listOf(ElectricPink, HotCoral))
                                )
                                .clickable { viewModel.toggleFollowStreamer(streamer.id) }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                .testTag("follow_streamer_btn"),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (streamer.isFollowing) "✓" else "+ Follow",
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Right Actions: Latency & Close
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        LatencyBadge(latencyMs = streamer.latencyMs)

                        IconButton(
                            onClick = { viewModel.navigateTo(Screen.HOME) },
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.6f))
                                .testTag("close_stream_btn")
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // Gift Celebration Banner
                GiftCelebrationBanner(
                    banner = uiState.activeGiftBanner,
                    modifier = Modifier.padding(top = 6.dp)
                )

                // ================= SPECIAL ROOM MODE 1: PK BATTLE CLASH =================
                if (streamer.streamType == StreamType.PK_BATTLE && streamer.pkBattle != null) {
                    PKBattleClashCard(
                        pk = streamer.pkBattle,
                        streamer = streamer,
                        onBoost = { viewModel.setShowGiftModal(true) }
                    )
                }

                // ================= SPECIAL ROOM MODE 2: MULTI-MIC PARTY ROOM =================
                if (streamer.streamType == StreamType.PARTY_ROOM && streamer.partySeats.isNotEmpty()) {
                    MultiMicPartyRoomGrid(
                        seats = streamer.partySeats,
                        onTakeSeat = { seatIndex -> viewModel.takePartySeat(seatIndex) }
                    )
                }
            }

            // Bottom Area: Pinned Safety Banner, Chat Messages, Action Bar
            Column(modifier = Modifier.fillMaxWidth()) {
                // Safety Banner
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Black.copy(alpha = 0.55f))
                        .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = AppStrings.get("safety_reminder", uiState.language),
                        color = ElectricViolet,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Chat Messages List
                LazyColumn(
                    state = chatListState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(uiState.chatMessages, key = { it.id }) { msg ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color.Black.copy(alpha = 0.65f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            if (msg.vipLevel > 1) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Brush.horizontalGradient(listOf(RoyalGold, HotCoral)))
                                        .padding(horizontal = 4.dp, vertical = 1.dp)
                                ) {
                                    Text("VIP ${msg.vipLevel}", color = Color.Black, fontSize = 8.sp, fontWeight = FontWeight.Black)
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                            }
                            GenderBadge(gender = msg.gender, level = msg.level)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${msg.user}: ",
                                color = HotCoral,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = msg.text,
                                color = if (msg.isGift) AmberGold else Color.White,
                                fontSize = 11.sp,
                                fontWeight = if (msg.isGift) FontWeight.Bold else FontWeight.Normal
                            )
                            if (msg.giftIcon.isNotBlank()) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(msg.giftIcon, fontSize = 14.sp)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Bottom Action Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Chat Input Box
                    OutlinedTextField(
                        value = chatInput,
                        onValueChange = { chatInput = it },
                        placeholder = {
                            Text(
                                text = AppStrings.get("say_something", uiState.language),
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        },
                        trailingIcon = {
                            if (chatInput.isNotBlank()) {
                                IconButton(
                                    onClick = {
                                        viewModel.sendChatMessage(chatInput)
                                        chatInput = ""
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Send,
                                        contentDescription = "Send",
                                        tint = ElectricPink,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("chat_input_field"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = ElectricPink,
                            unfocusedBorderColor = BorderPurple,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedContainerColor = Color.Black.copy(alpha = 0.65f),
                            unfocusedContainerColor = Color.Black.copy(alpha = 0.65f)
                        ),
                        shape = RoundedCornerShape(22.dp),
                        singleLine = true
                    )

                    // Quick Mini-Game Button (🎲)
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Brush.linearGradient(listOf(BorderPurple, SurfaceDark)))
                            .border(1.dp, AmberGold, CircleShape)
                            .clickable { viewModel.navigateTo(Screen.MULTIPLAYER_GAME) }
                            .testTag("open_in_room_game_btn"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🎲", fontSize = 18.sp)
                    }

                    // Gift Store Button (🎁)
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(listOf(ElectricPink, HotCoral, AmberGold))
                            )
                            .clickable { viewModel.setShowGiftModal(true) }
                            .testTag("open_gift_modal_btn"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🎁", fontSize = 20.sp)
                    }

                    // Social Share Button (🔗)
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.6f))
                            .border(1.dp, BorderPurple, CircleShape)
                            .clickable { viewModel.setShowShareModal(true) }
                            .testTag("open_share_modal_btn"),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Share",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Heart Combo Trigger Button (❤️)
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(listOf(SunsetRed, ElectricPink))
                            )
                            .clickable { viewModel.triggerHeart() }
                            .testTag("trigger_heart_btn"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("❤️", fontSize = 18.sp)
                    }
                }
            }
        }

        // ================= GIFT STORE MODAL =================
        if (uiState.showGiftModal) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { viewModel.setShowGiftModal(false) }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                        .background(SurfaceDark)
                        .border(1.dp, BorderPurple, RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                        .clickable(enabled = false) {}
                        .padding(16.dp)
                        .testTag("gift_catalog_modal")
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🟡", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${userProfile.coins} Coins",
                                color = AmberGold,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "+ Top Up",
                                color = ElectricPink,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable {
                                    viewModel.setShowGiftModal(false)
                                    viewModel.setShowTopUpModal(true)
                                }
                            )
                        }

                        IconButton(onClick = { viewModel.setShowGiftModal(false) }) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Gifts Grid
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val chunks = viewModel.repository.giftCatalog.chunked(4)
                        chunks.forEach { rowGifts ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                rowGifts.forEach { gift ->
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
                                        modifier = Modifier
                                            .weight(1f)
                                            .border(1.dp, BorderPurple, RoundedCornerShape(14.dp))
                                            .clickable { viewModel.sendGift(gift) }
                                            .testTag("gift_item_${gift.id}")
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(6.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text(gift.icon, fontSize = 26.sp)
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = if (uiState.language == com.example.data.model.AppLanguage.BN) gift.nameBn else gift.name,
                                                color = Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "🟡 ${gift.price}",
                                                color = AmberGold,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ================= SOCIAL SHARE MODAL =================
        if (uiState.showShareModal) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { viewModel.setShowShareModal(false) }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                        .background(SurfaceDark)
                        .border(1.dp, BorderPurple, RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                        .clickable(enabled = false) {}
                        .padding(20.dp)
                        .testTag("share_modal")
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Share Stream to Friends",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        IconButton(onClick = { viewModel.setShowShareModal(false) }) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        listOf(
                            Triple("Facebook", "f", Color(0xFF1877F2)),
                            Triple("WhatsApp", "💬", Color(0xFF25D366)),
                            Triple("Messenger", "⚡", Color(0xFF0084FF)),
                            Triple("Copy Link", "🔗", ElectricPink)
                        ).forEach { (name, icon, bg) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.clickable { viewModel.setShowShareModal(false) }
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(bg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = icon,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(name, color = TextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }

        // ================= STREAMER PROFILE CARD POPUP =================
        if (uiState.showProfileCard != null) {
            val prof = uiState.showProfileCard!!
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f))
                    .clickable { viewModel.setShowProfileCard(null) },
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .border(1.dp, BorderPurple, RoundedCornerShape(24.dp))
                        .clickable(enabled = false) {}
                        .padding(20.dp)
                        .testTag("streamer_profile_popup")
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        AsyncImage(
                            model = prof.imageUrl,
                            contentDescription = prof.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(76.dp)
                                .clip(CircleShape)
                                .border(2.dp, ElectricPink, CircleShape)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = prof.name,
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            GenderBadge(gender = prof.gender, level = prof.level)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(prof.idNum, color = ElectricViolet, fontSize = 11.sp)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = prof.bio,
                            color = TextSecondary,
                            fontSize = 11.sp,
                            lineHeight = 16.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(SurfaceCardDark)
                                .padding(10.dp)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = {
                                    viewModel.toggleFollowStreamer(prof.id)
                                    viewModel.setShowProfileCard(null)
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (prof.isFollowing) LiveGreen else ElectricPink
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = if (prof.isFollowing) "Following" else "+ Follow",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                            }

                            OutlinedButton(
                                onClick = {
                                    viewModel.setShowProfileCard(null)
                                    viewModel.navigateTo(Screen.MESSAGES)
                                },
                                modifier = Modifier.weight(1f),
                                border = ButtonDefaults.outlinedButtonBorder.copy(brush = Brush.horizontalGradient(listOf(ElectricPink, HotCoral))),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Message", color = Color.White, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PKBattleClashCard(
    pk: PKBattleState,
    streamer: Streamer,
    onBoost: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.75f)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .border(1.dp, BorderPurple, RoundedCornerShape(18.dp))
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header: Status & Timer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(PKRed))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(pk.statusText, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Black)
                }
                Text("⏱️ 02:08", color = AmberGold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Dual Streamers: Left vs Right
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Streamer
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        model = streamer.imageUrl,
                        contentDescription = streamer.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .border(2.dp, PKBlue, CircleShape)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Column {
                        Text(streamer.name, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                        Text("${pk.leftScore} Pts", color = PKBlue, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    }
                }

                // Center PK Emblem
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Brush.linearGradient(listOf(PKBlue, PKRed)))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("⚔️ PK", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
                }

                // Right Opponent
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(pk.opponentName, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                        Text("${pk.rightScore} Pts", color = PKRed, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    AsyncImage(
                        model = pk.opponentAvatar,
                        contentDescription = pk.opponentName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .border(2.dp, PKRed, CircleShape)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Score Progress Bar (Blue vs Red)
            val total = (pk.leftScore + pk.rightScore).coerceAtLeast(1)
            val blueFraction = (pk.leftScore.toFloat() / total).coerceIn(0.1f, 0.9f)

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color.Black)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .weight(blueFraction)
                        .background(PKBlue)
                )
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .weight(1f - blueFraction)
                        .background(PKRed)
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Punishment text & Boost action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = pk.punishmentText,
                    color = TextSecondary,
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Button(
                    onClick = onBoost,
                    colors = ButtonDefaults.buttonColors(containerColor = PKBlue),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text("Boost PK 🔥", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun MultiMicPartyRoomGrid(
    seats: List<PartySeat>,
    onTakeSeat: (Int) -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.72f)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .border(1.dp, BorderPurple, RoundedCornerShape(18.dp))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🎙️ 8-Mic Party Voice & Video Room",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Tap empty seat to speak",
                    color = HotCoral,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 2 Rows of 4 seats each
            val rows = seats.chunked(4)
            rows.forEach { rowSeats ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    rowSeats.forEach { seat ->
                        PartySeatItem(seat = seat, onTake = { onTakeSeat(seat.index) })
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
            }
        }
    }
}

@Composable
fun PartySeatItem(
    seat: PartySeat,
    onTake: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(64.dp)
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(if (seat.userName != null) SurfaceDark else SeatEmpty)
                .border(
                    1.5.dp,
                    if (seat.isSpeaking) LiveGreen else if (seat.isHost) RoyalGold else BorderPurple,
                    CircleShape
                )
                .clickable { if (seat.userName == null && !seat.isLocked) onTake() },
            contentAlignment = Alignment.Center
        ) {
            if (seat.avatarUrl != null) {
                AsyncImage(
                    model = seat.avatarUrl,
                    contentDescription = seat.userName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(CircleShape)
                )
                if (seat.isHost) {
                    Text(
                        "👑",
                        fontSize = 10.sp,
                        modifier = Modifier.align(Alignment.TopEnd)
                    )
                }
            } else if (seat.isLocked) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
            } else {
                Text("+ Mic", color = HotCoral, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            text = seat.userName ?: "Seat ${seat.index}",
            color = if (seat.userName != null) Color.White else TextSecondary,
            fontSize = 9.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
