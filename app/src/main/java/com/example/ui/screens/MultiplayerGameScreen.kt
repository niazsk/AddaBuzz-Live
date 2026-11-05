package com.example.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Gender
import com.example.ui.components.GenderBadge
import com.example.ui.screens.games.FortuneWheelGame
import com.example.ui.screens.games.MinesGame
import com.example.ui.screens.games.SlotsGame
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun MultiplayerGameScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()

    var activeGameTab by remember { mutableStateOf("Mines") } // "Mines", "Slots", "Dice", "Wheel"
    var selectedBet by remember { mutableStateOf(100) }

    val infiniteTransition = rememberInfiniteTransition(label = "dice_wobble")
    val diceRotation by infiniteTransition.animateFloat(
        initialValue = -15f,
        targetValue = 15f,
        animationSpec = infiniteRepeatable(
            animation = tween(200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dice_rot"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DeepVioletDark)
            .statusBarsPadding()
            .padding(horizontal = 16.dp)
            .verticalScroll(rememberScrollState())
            .testTag("multiplayer_game_screen")
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { viewModel.navigateTo(Screen.PROFILE) },
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(SurfaceDark)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back to Profile",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "Modern Games Arena",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Instant Multipliers & Live Rewards 💎",
                        color = ElectricViolet,
                        fontSize = 11.sp
                    )
                }
            }

            // Coins balance pill with top-up
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(SurfaceDark)
                    .border(1.dp, AmberGold, RoundedCornerShape(16.dp))
                    .clickable { viewModel.setShowTopUpModal(true) }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text("🟡", fontSize = 12.sp)
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "${userProfile.coins}",
                    color = AmberGold,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("+", color = ElectricPink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Live Winner Ticker Banner
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceDark)
                .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            Text("🔥", fontSize = 13.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "Farhan won +1,500 Coins in Diamond Mines • Lola hit 777 Jackpot in Slots!",
                color = LiveGreen,
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Game Selection Tabs
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                Triple("Mines", "💎 Mines", ElectricPink),
                Triple("Slots", "🎰 Slots", HotCoral),
                Triple("Dice", "🎲 Dice", NeonPurple),
                Triple("Wheel", "🎡 Wheel", AmberGold)
            ).forEach { (key, label, color) ->
                val isSelected = activeGameTab == key
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .background(
                            if (isSelected) Brush.horizontalGradient(listOf(color, color.copy(alpha = 0.8f)))
                            else Brush.horizontalGradient(listOf(SurfaceDark, SurfaceDark))
                        )
                        .border(1.dp, if (isSelected) Color.White.copy(alpha = 0.6f) else BorderPurple, RoundedCornerShape(14.dp))
                        .clickable { activeGameTab = key }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        color = if (isSelected) Color.White else TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Bet Selector
        Text(
            text = "Select Stake / কয়েন বাজি নির্বাচন:",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(50, 100, 250, 500, 1000).forEach { bet ->
                val isSelected = selectedBet == bet
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (isSelected) Brush.horizontalGradient(listOf(NeonPurple, NeonPink))
                            else Brush.horizontalGradient(listOf(SurfaceCardDark, SurfaceCardDark))
                        )
                        .border(1.dp, if (isSelected) AmberGold else BorderPurple, RoundedCornerShape(12.dp))
                        .clickable { selectedBet = bet }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "🟡 $bet",
                        color = if (isSelected) Color.White else AmberGold,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Active Game Component View
        when (activeGameTab) {
            "Mines" -> MinesGame(
                viewModel = viewModel,
                selectedBet = selectedBet,
                onShowTopUp = { viewModel.setShowTopUpModal(true) }
            )
            "Slots" -> SlotsGame(
                viewModel = viewModel,
                selectedBet = selectedBet,
                onShowTopUp = { viewModel.setShowTopUpModal(true) }
            )
            "Wheel" -> FortuneWheelGame(
                viewModel = viewModel,
                selectedBet = selectedBet,
                onShowTopUp = { viewModel.setShowTopUpModal(true) }
            )
            "Dice" -> DiceArenaCard(
                viewModel = viewModel,
                uiState = uiState,
                userProfile = userProfile,
                selectedBet = selectedBet,
                diceRotation = diceRotation
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Live Arena Champions Leaderboard
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.EmojiEvents, contentDescription = null, tint = AmberGold)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "Live Arena Champions / আজকের শীর্ষ বিজয়ী",
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        listOf(
            Triple("1. Alex Morgan", "48 Wins • 🟡 14,200 Won (Mines 12x)", "👑"),
            Triple("2. Tanvir Rahman", "36 Wins • 🟡 9,800 Won (777 Slots)", "🥈"),
            Triple("3. Stella Malone", "29 Wins • 🟡 7,500 Won (Wheel Jackpot)", "🥉")
        ).forEach { (player, score, badge) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDark)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(badge, fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(player, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Text(score, color = AmberGold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(modifier = Modifier.height(90.dp))
    }
}

@Composable
fun DiceArenaCard(
    viewModel: AddaBuzzViewModel,
    uiState: com.example.ui.viewmodel.UiState,
    userProfile: com.example.data.model.UserProfile,
    selectedBet: Int,
    diceRotation: Float
) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.5.dp, BorderPurple, RoundedCornerShape(22.dp))
            .testTag("dice_arena_card")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(NeonPurple.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🎲", fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("High-Low Dice Arena", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text("3-Player Live Match • 2x Payout", color = TextSecondary, fontSize = 10.sp)
                    }
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(LiveGreen.copy(alpha = 0.2f))
                        .border(1.dp, LiveGreen, RoundedCornerShape(10.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("LIVE MATCH", color = LiveGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3 Live Players Seats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                PlayerSeat(
                    name = "You (${userProfile.name})",
                    gender = userProfile.gender,
                    dice = uiState.playerDice,
                    isRolling = uiState.isGameRolling,
                    rotation = if (uiState.isGameRolling) diceRotation else 0f,
                    isCurrentUser = true
                )

                Text("VS", color = NeonPink, fontSize = 14.sp, fontWeight = FontWeight.Black)

                PlayerSeat(
                    name = "Stella M.",
                    gender = Gender.FEMALE,
                    dice = uiState.opponentDice1,
                    isRolling = uiState.isGameRolling,
                    rotation = if (uiState.isGameRolling) -diceRotation else 0f,
                    isCurrentUser = false
                )

                Text("VS", color = NeonPink, fontSize = 14.sp, fontWeight = FontWeight.Black)

                PlayerSeat(
                    name = "Tanvir R.",
                    gender = Gender.MALE,
                    dice = uiState.opponentDice2,
                    isRolling = uiState.isGameRolling,
                    rotation = if (uiState.isGameRolling) diceRotation else 0f,
                    isCurrentUser = false
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Result Message Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(SurfaceDark)
                    .border(1.dp, BorderPurple, RoundedCornerShape(14.dp))
                    .padding(10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = uiState.gameResultMessage,
                    color = Color.White,
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Roll Button
            Button(
                onClick = { viewModel.playMultiplayerRound(selectedBet) },
                enabled = !uiState.isGameRolling,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("roll_dice_btn"),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.horizontalGradient(listOf(NeonPurple, NeonPink, AmberGold))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Casino, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (uiState.isGameRolling) "ROLLING WITH LIVE PLAYERS..." else "ROLL & WIN 2X ($selectedBet COINS)",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PlayerSeat(
    name: String,
    gender: Gender,
    dice: Int,
    isRolling: Boolean,
    rotation: Float,
    isCurrentUser: Boolean
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        GenderBadge(gender = gender)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = name,
            color = if (isCurrentUser) NeonCyan else Color.White,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(6.dp))

        Box(
            modifier = Modifier
                .size(52.dp)
                .rotate(rotation)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    if (isCurrentUser) Brush.linearGradient(listOf(NeonPurple, NeonPink))
                    else Brush.linearGradient(listOf(BorderPurple, SurfaceDark))
                )
                .border(1.5.dp, if (isCurrentUser) AmberGold else BorderPurple, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            val diceGlyph = when (dice) {
                1 -> "⚀"
                2 -> "⚁"
                3 -> "⚂"
                4 -> "⚃"
                5 -> "⚄"
                else -> "⚅"
            }
            Text(
                text = diceGlyph,
                fontSize = 32.sp,
                color = Color.White
            )
        }
    }
}
