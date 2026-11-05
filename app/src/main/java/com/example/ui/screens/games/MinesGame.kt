package com.example.ui.screens.games

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Shield
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
import kotlin.random.Random

@Composable
fun MinesGame(
    viewModel: AddaBuzzViewModel,
    selectedBet: Int,
    onShowTopUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    val userProfile by viewModel.userProfile.collectAsState()

    var isGameActive by remember { mutableStateOf(false) }
    var isBusted by remember { mutableStateOf(false) }
    var isCashedOut by remember { mutableStateOf(false) }
    var revealedTiles by remember { mutableStateOf(setOf<Int>()) }
    var bombIndices by remember { mutableStateOf(setOf<Int>()) }
    var currentMultiplier by remember { mutableStateOf(1.0f) }
    var statusMessage by remember { mutableStateOf("Set stake & tap START BOARD to uncover 💎 diamonds!") }

    val multipliers = listOf(1.20f, 1.50f, 1.95f, 2.60f, 3.60f, 5.20f, 7.80f, 12.00f, 19.50f, 32.00f, 55.00f, 99.00f, 190.00f)

    fun startNewGame() {
        if (userProfile.coins < selectedBet) {
            statusMessage = "Not enough coins! Please top up your wallet."
            onShowTopUp()
            return
        }
        val deducted = viewModel.deductCoins(selectedBet)
        if (!deducted) {
            statusMessage = "Could not deduct coins. Check balance."
            return
        }

        // Generate 3 unique bomb positions out of 16
        val bombs = mutableSetOf<Int>()
        while (bombs.size < 3) {
            bombs.add(Random.nextInt(16))
        }

        bombIndices = bombs
        revealedTiles = emptySet()
        currentMultiplier = 1.0f
        isGameActive = true
        isBusted = false
        isCashedOut = false
        statusMessage = "Game started! Tap tiles to uncover 💎 diamonds or cash out anytime."
    }

    fun onTileClick(index: Int) {
        if (!isGameActive || isBusted || isCashedOut || revealedTiles.contains(index)) return

        val newRevealed = revealedTiles + index
        revealedTiles = newRevealed

        if (bombIndices.contains(index)) {
            // Hit bomb!
            isBusted = true
            isGameActive = false
            statusMessage = "💥 BOOM! You hit a mine. Round lost!"
        } else {
            // Hit diamond!
            val diamondCount = newRevealed.size
            val nextMult = multipliers.getOrElse(diamondCount - 1) { multipliers.last() }
            currentMultiplier = nextMult

            if (diamondCount >= 13) {
                // All diamonds uncovered!
                val prize = (selectedBet * currentMultiplier).toInt()
                viewModel.addCoins(prize)
                isCashedOut = true
                isGameActive = false
                statusMessage = "🏆 ALL DIAMONDS FOUND! Won $prize Coins ($currentMultiplier x)!"
            } else {
                val currentWinnings = (selectedBet * currentMultiplier).toInt()
                statusMessage = "💎 Diamond found! Current cashout: $currentWinnings Coins ($currentMultiplier x)"
            }
        }
    }

    fun cashOut() {
        if (!isGameActive || revealedTiles.isEmpty() || isBusted || isCashedOut) return

        val prize = (selectedBet * currentMultiplier).toInt()
        viewModel.addCoins(prize)
        isCashedOut = true
        isGameActive = false
        statusMessage = "💰 CASHED OUT! +$prize Coins ($currentMultiplier x) added to wallet!"
    }

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
        modifier = modifier
            .fillMaxWidth()
            .border(1.5.dp, BorderPurple, RoundedCornerShape(22.dp))
            .testTag("mines_game_card")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header with multipliers and status
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
                            .background(ElectricPink.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("💎", fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Diamond Mines", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text("13 Diamonds • 3 Mines", color = TextSecondary, fontSize = 10.sp)
                    }
                }

                // Current Multiplier Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (isBusted) PKRed.copy(alpha = 0.25f)
                            else if (isGameActive && revealedTiles.isNotEmpty()) LiveGreen.copy(alpha = 0.25f)
                            else SurfaceDark
                        )
                        .border(
                            1.dp,
                            if (isBusted) PKRed else if (isGameActive && revealedTiles.isNotEmpty()) LiveGreen else BorderPurple,
                            RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = if (isBusted) "BUSTED" else "${"%.2f".format(currentMultiplier)}x",
                        color = if (isBusted) PKRed else if (isGameActive && revealedTiles.isNotEmpty()) LiveGreen else AmberGold,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Status message pill
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
                    text = statusMessage,
                    color = if (isBusted) PKRed else if (isCashedOut) AmberGold else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 4x4 Grid of 16 Tiles
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                for (row in 0 until 4) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        for (col in 0 until 4) {
                            val index = row * 4 + col
                            val isRevealed = revealedTiles.contains(index)
                            val isBomb = bombIndices.contains(index)
                            val showBombOnBust = isBusted && isBomb

                            val tileBg by animateColorAsState(
                                targetValue = when {
                                    isRevealed && isBomb -> PKRed.copy(alpha = 0.35f)
                                    isRevealed && !isBomb -> LiveGreen.copy(alpha = 0.25f)
                                    showBombOnBust -> PKRed.copy(alpha = 0.2f)
                                    isGameActive -> SurfaceDark
                                    else -> SurfaceDark.copy(alpha = 0.6f)
                                },
                                animationSpec = tween(250),
                                label = "tile_bg"
                            )

                            val tileBorder = when {
                                isRevealed && isBomb -> PKRed
                                isRevealed && !isBomb -> LiveGreen
                                showBombOnBust -> PKRed.copy(alpha = 0.6f)
                                isGameActive -> NeonPurple.copy(alpha = 0.5f)
                                else -> BorderPurple
                            }

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(tileBg)
                                    .border(1.2.dp, tileBorder, RoundedCornerShape(12.dp))
                                    .clickable(enabled = isGameActive && !isRevealed && !isBusted && !isCashedOut) {
                                        onTileClick(index)
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                when {
                                    isRevealed && isBomb -> Text("💣", fontSize = 20.sp)
                                    isRevealed && !isBomb -> Text("💎", fontSize = 20.sp)
                                    showBombOnBust -> Text("💣", fontSize = 16.sp, modifier = Modifier.padding(2.dp))
                                    isGameActive -> Text("?", color = ElectricViolet, fontSize = 16.sp, fontWeight = FontWeight.Black)
                                    else -> Text("🔒", fontSize = 14.sp)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons: Start Board OR Cash Out
            if (isGameActive && revealedTiles.isNotEmpty() && !isBusted && !isCashedOut) {
                val currentWinnings = (selectedBet * currentMultiplier).toInt()
                Button(
                    onClick = { cashOut() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("mines_cashout_btn"),
                    colors = ButtonDefaults.buttonColors(containerColor = LiveGreen),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("💰 CASH OUT $currentWinnings COINS", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 13.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("(${"%.2f".format(currentMultiplier)}x)", color = Color.Black.copy(alpha = 0.7f), fontSize = 12.sp)
                    }
                }
            } else {
                Button(
                    onClick = { startNewGame() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("mines_start_btn"),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    contentPadding = PaddingValues(),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Brush.horizontalGradient(listOf(ElectricPink, HotCoral, AmberGold))),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("💎 START MINES • $selectedBet COINS", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}
