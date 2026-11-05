package com.example.ui.screens.games

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*
import com.example.ui.viewmodel.AddaBuzzViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

@Composable
fun SlotsGame(
    viewModel: AddaBuzzViewModel,
    selectedBet: Int,
    onShowTopUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    val userProfile by viewModel.userProfile.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    val symbols = listOf("🍒", "🍉", "🔔", "⭐", "💎", "7️⃣")

    var isSpinning by remember { mutableStateOf(false) }
    var reel1 by remember { mutableStateOf("7️⃣") }
    var reel2 by remember { mutableStateOf("💎") }
    var reel3 by remember { mutableStateOf("7️⃣") }
    var resultMessage by remember { mutableStateOf("Press SPIN to match 3 symbols & win up to 15x Jackpot!") }
    var lastWinAmount by remember { mutableStateOf(0) }

    fun spinReels() {
        if (isSpinning) return
        if (userProfile.coins < selectedBet) {
            resultMessage = "Not enough coins! Please top up your wallet."
            onShowTopUp()
            return
        }

        val deducted = viewModel.deductCoins(selectedBet)
        if (!deducted) {
            resultMessage = "Could not deduct coins. Check balance."
            return
        }

        isSpinning = true
        lastWinAmount = 0
        resultMessage = "🎰 Reels spinning..."

        coroutineScope.launch {
            // Animation cycle
            repeat(10) {
                delay(100)
                reel1 = symbols.random()
                reel2 = symbols.random()
                reel3 = symbols.random()
            }

            // Decide outcome with weighted probability
            delay(150)
            val luck = Random.nextInt(100)
            val finalReels = when {
                luck < 5 -> listOf("💎", "💎", "💎") // 5% chance 15x Jackpot
                luck < 12 -> listOf("7️⃣", "7️⃣", "7️⃣") // 7% chance 10x Super win
                luck < 22 -> listOf("⭐", "⭐", "⭐") // 10% chance 5x Star trio
                luck < 35 -> {
                    val sym = listOf("🍒", "🍉", "🔔").random()
                    listOf(sym, sym, sym) // 13% chance 3x match
                }
                luck < 60 -> {
                    val sym = symbols.random()
                    val other = symbols.filter { it != sym }.random()
                    listOf(sym, sym, other).shuffled() // 25% chance pair (1.5x)
                }
                else -> {
                    // Miss
                    val shuffled = symbols.shuffled()
                    listOf(shuffled[0], shuffled[1], shuffled[2])
                }
            }

            reel1 = finalReels[0]
            reel2 = finalReels[1]
            reel3 = finalReels[2]

            // Calculate payout
            val payoutMult: Float = when {
                reel1 == "💎" && reel2 == "💎" && reel3 == "💎" -> 15.0f
                reel1 == "7️⃣" && reel2 == "7️⃣" && reel3 == "7️⃣" -> 10.0f
                reel1 == "⭐" && reel2 == "⭐" && reel3 == "⭐" -> 5.0f
                reel1 == reel2 && reel2 == reel3 -> 3.0f
                reel1 == reel2 || reel2 == reel3 || reel1 == reel3 -> 1.5f
                else -> 0.0f
            }

            val winAmount = (selectedBet * payoutMult).toInt()
            if (winAmount > 0) {
                viewModel.addCoins(winAmount)
                lastWinAmount = winAmount
                resultMessage = if (payoutMult >= 10.0f) {
                    "🎉 MEGA JACKPOT! You won $winAmount Coins (${payoutMult.toInt()}x)!"
                } else {
                    "✨ WINNER! +$winAmount Coins (${"%.1f".format(payoutMult)}x) credited!"
                }
            } else {
                resultMessage = "💔 Almost there! Spin again for the next rush!"
            }

            isSpinning = false
        }
    }

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
        modifier = modifier
            .fillMaxWidth()
            .border(1.5.dp, BorderPurple, RoundedCornerShape(22.dp))
            .testTag("slots_game_card")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
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
                            .background(HotCoral.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🎰", fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Neon 777 Slots", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text("3-Reel Jackpot Rush", color = TextSecondary, fontSize = 10.sp)
                    }
                }

                // Win badge
                if (lastWinAmount > 0) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(LiveGreen.copy(alpha = 0.2f))
                            .border(1.dp, LiveGreen, RoundedCornerShape(10.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text("+$lastWinAmount 🟡", color = LiveGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Result Message Pill
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDark)
                    .border(1.dp, BorderPurple.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                    .padding(vertical = 8.dp, horizontal = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = resultMessage,
                    color = if (lastWinAmount > 0) AmberGold else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3-Reel Machine Frame
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(SurfaceDark)
                    .border(2.dp, Brush.horizontalGradient(listOf(NeonPurple, NeonPink, AmberGold)), RoundedCornerShape(18.dp))
                    .padding(14.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    listOf(reel1, reel2, reel3).forEachIndexed { i, sym ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(84.dp)
                                .padding(horizontal = 4.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(
                                    Brush.verticalGradient(
                                        listOf(SurfaceCardDark, Color(0xFF1F1238), SurfaceCardDark)
                                    )
                                )
                                .border(1.dp, AmberGold.copy(alpha = 0.5f), RoundedCornerShape(14.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = sym,
                                fontSize = 42.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Paytable mini chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf("💎💎💎 15x", "7️⃣7️⃣7️⃣ 10x", "⭐⭐⭐ 5x", "Pair 1.5x").forEach { item ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceDark)
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Text(item, color = TextSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Spin Button
            Button(
                onClick = { spinReels() },
                enabled = !isSpinning,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("slots_spin_btn"),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            if (isSpinning) Brush.horizontalGradient(listOf(Color.Gray, Color.DarkGray))
                            else Brush.horizontalGradient(listOf(ElectricPink, HotCoral, AmberGold))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isSpinning) "SPINNING REELS..." else "🎰 SPIN • $selectedBet COINS",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}
