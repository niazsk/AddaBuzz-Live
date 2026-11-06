package com.example.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Gender
import com.example.ui.theme.*
import com.example.ui.viewmodel.ActiveGiftBanner
import com.example.ui.viewmodel.FloatingHeart

@Composable
fun GenderBadge(
    gender: Gender,
    level: Int? = null,
    modifier: Modifier = Modifier
) {
    val bg = if (gender == Gender.MALE) MaleBlue else FemalePink
    val symbol = if (gender == Gender.MALE) "♂" else "♀"

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bg.copy(alpha = 0.22f))
            .border(1.dp, bg.copy(alpha = 0.7f), RoundedCornerShape(12.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
            .testTag("gender_badge_${gender.name.lowercase()}")
    ) {
        Text(
            text = symbol,
            color = bg,
            fontSize = 12.sp,
            fontWeight = FontWeight.ExtraBold
        )
        if (level != null) {
            Text(
                text = "Lv.$level",
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun FloatingHeartsDisplay(
    hearts: List<FloatingHeart>,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize()) {
        hearts.forEach { heart ->
            var offsetY by remember { mutableStateOf(0f) }
            val animatedOffsetY by animateFloatAsState(
                targetValue = -500f,
                animationSpec = tween(durationMillis = 1800, easing = LinearOutSlowInEasing),
                label = "heart_rise"
            )
            val animatedAlpha by animateFloatAsState(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 1800),
                label = "heart_alpha"
            )

            Text(
                text = "❤️",
                fontSize = 28.sp,
                color = Color(heart.colorHex),
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = (heart.leftPercent * 3.5).dp)
                    .offset(y = animatedOffsetY.dp)
            )
        }
    }
}

@Composable
fun GiftCelebrationBanner(
    banner: ActiveGiftBanner?,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = banner != null,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
        modifier = modifier
    ) {
        if (banner != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                NeonPink.copy(alpha = 0.95f),
                                NeonPurple.copy(alpha = 0.95f),
                                AmberGold.copy(alpha = 0.95f)
                            )
                        )
                    )
                    .border(1.5.dp, AmberGold, RoundedCornerShape(24.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .testTag("gift_celebration_banner")
            ) {
                Text(
                    text = banner.giftIcon,
                    fontSize = 34.sp,
                    modifier = Modifier.padding(end = 12.dp)
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${banner.senderName} sent ${banner.giftName}!",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Text(
                        text = "💎 ${banner.price} Diamonds • Super Gift Aura Activated ✨",
                        color = AmberGold,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
fun LatencyBadge(
    latencyMs: Int,
    fps: Int = 60,
    modifier: Modifier = Modifier
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Color.Black.copy(alpha = 0.6f))
            .border(0.8.dp, LiveGreen.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
            .padding(horizontal = 6.dp, vertical = 3.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(LiveGreen)
        )
        Text(
            text = "${latencyMs}ms • ${fps}fps",
            color = LiveGreen,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
