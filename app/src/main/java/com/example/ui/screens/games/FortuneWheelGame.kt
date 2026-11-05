package com.example.ui.screens.games

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*
import com.example.ui.viewmodel.AddaBuzzViewModel
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

data class WheelSlice(
    val label: String,
    val icon: String,
    val color: Color,
    val coinsWon: Int
)

@Composable
fun FortuneWheelGame(
    viewModel: AddaBuzzViewModel,
    selectedBet: Int,
    onShowTopUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    val userProfile by viewModel.userProfile.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    val slices = listOf(
        WheelSlice("500 🟡", "🟡", Color(0xFFFF2A6D), 500),
        WheelSlice("VIP Day", "👑", Color(0xFF8A2BE2), 0),
        WheelSlice("250 🟡", "🟡", Color(0xFF00E5FF), 250),
        WheelSlice("Rose 🌹", "🌹", Color(0xFFFF5E36), 50),
        WheelSlice("1,500 🏆", "🏆", Color(0xFFFFD700), 1500),
        WheelSlice("100 🟡", "🟡", Color(0xFF00E676), 100),
        WheelSlice("Mystery 🎁", "🎁", Color(0xFFA855F7), 300),
        WheelSlice("Double ⚡", "⚡", Color(0xFFFF1356), 600)
    )

    val wheelRotation = remember { Animatable(0f) }
    var isSpinning by remember { mutableStateOf(false) }
    var resultMessage by remember { mutableStateOf("Spin the Fortune Wheel for instant coins & VIP rewards!") }
    var wonLabel by remember { mutableStateOf<String?>(null) }

    fun spinWheel() {
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
        wonLabel = null
        resultMessage = "🎡 Wheel is spinning..."

        coroutineScope.launch {
            val targetSliceIndex = Random.nextInt(slices.size)
            val sliceDegrees = 360f / slices.size
            // Pointer is at the top (270 degrees in canvas coordinates)
            // Extra full rotations (5 to 7 full circles) + alignment to target slice
            val extraRotations = 360f * (5 + Random.nextInt(3))
            val targetAngle = extraRotations + (360f - (targetSliceIndex * sliceDegrees) - (sliceDegrees / 2f))

            wheelRotation.snapTo(wheelRotation.value % 360f)
            wheelRotation.animateTo(
                targetValue = wheelRotation.value + targetAngle,
                animationSpec = tween(
                    durationMillis = 3500,
                    easing = FastOutSlowInEasing
                )
            )

            val wonSlice = slices[targetSliceIndex]
            if (wonSlice.coinsWon > 0) {
                viewModel.addCoins(wonSlice.coinsWon)
                resultMessage = "🎉 YOU WON ${wonSlice.label}! Credited to wallet!"
                wonLabel = wonSlice.label
            } else {
                resultMessage = "✨ YOU UNLOCKED ${wonSlice.label}! Perks activated!"
                wonLabel = wonSlice.label
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
            .testTag("fortune_wheel_card")
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
                            .background(AmberGold.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🎡", fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Lucky Fortune Wheel", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text("Instant Rewards & Jackpot", color = TextSecondary, fontSize = 10.sp)
                    }
                }

                wonLabel?.let { label ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(LiveGreen.copy(alpha = 0.2f))
                            .border(1.dp, LiveGreen, RoundedCornerShape(10.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(label, color = LiveGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

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
                    color = if (wonLabel != null) AmberGold else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Wheel View Container with Top Pointer
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .align(Alignment.CenterHorizontally),
                contentAlignment = Alignment.Center
            ) {
                // Canvas Wheel
                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(CircleShape)
                        .border(3.dp, AmberGold, CircleShape)
                ) {
                    val radius = size.minDimension / 2f
                    val center = Offset(size.width / 2f, size.height / 2f)
                    val sweepAngle = 360f / slices.size

                    rotate(wheelRotation.value, pivot = center) {
                        slices.forEachIndexed { i, slice ->
                            val startAngle = i * sweepAngle
                            drawArc(
                                color = slice.color,
                                startAngle = startAngle,
                                sweepAngle = sweepAngle,
                                useCenter = true,
                                size = Size(radius * 2, radius * 2),
                                topLeft = Offset(center.x - radius, center.y - radius)
                            )
                        }

                        // Slice dividers
                        for (i in slices.indices) {
                            val angleRad = (i * sweepAngle) * (PI / 180.0)
                            val endX = center.x + (radius * cos(angleRad)).toFloat()
                            val endY = center.y + (radius * sin(angleRad)).toFloat()
                            drawLine(
                                color = Color.White.copy(alpha = 0.5f),
                                start = center,
                                end = Offset(endX, endY),
                                strokeWidth = 2.dp.toPx()
                            )
                        }
                    }
                }

                // Center Pin with Gold Ring
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(SurfaceDark)
                        .border(2.dp, AmberGold, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("SPIN", color = AmberGold, fontSize = 11.sp, fontWeight = FontWeight.Black)
                }

                // Top Pointer Arrow
                Canvas(
                    modifier = Modifier
                        .size(24.dp)
                        .align(Alignment.TopCenter)
                ) {
                    val path = Path().apply {
                        moveTo(size.width / 2f, size.height)
                        lineTo(0f, 0f)
                        lineTo(size.width, 0f)
                        close()
                    }
                    drawPath(path, color = AmberGold)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Prize Legend row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                listOf("1,500 🏆", "500 🟡", "VIP 👑", "Rose 🌹").forEach { p ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceDark)
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Text(p, color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Spin Wheel Action Button
            Button(
                onClick = { spinWheel() },
                enabled = !isSpinning,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("wheel_spin_btn"),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            if (isSpinning) Brush.horizontalGradient(listOf(Color.Gray, Color.DarkGray))
                            else Brush.horizontalGradient(listOf(AmberGold, HotCoral, ElectricPink))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isSpinning) "WHEEL TURNING..." else "🎡 SPIN WHEEL • $selectedBet COINS",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}
