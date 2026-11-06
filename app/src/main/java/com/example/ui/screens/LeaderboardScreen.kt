package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.LeaderboardUser
import com.example.ui.components.GenderBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun LeaderboardScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val leaders: List<LeaderboardUser> = viewModel.repository.leaderboardStar

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DeepVioletDark)
            .statusBarsPadding()
            .testTag("leaderboard_screen")
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
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
                        text = AppStrings.get("leaderboard", uiState.language),
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    // Sub-tabs: Star Rank, Wealth, Charm
                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                    listOf("Star" to "⭐ Star", "Wealth" to "👑 Wealth", "Charm" to "💖 Charm").forEach { (type, label) ->
                        val isTypeSelected = uiState.leaderboardType == type
                        Text(
                            text = label,
                            color = if (isTypeSelected) HotCoral else TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = if (isTypeSelected) FontWeight.Bold else FontWeight.Medium,
                            modifier = Modifier
                                .clickable { viewModel.setLeaderboardType(type) }
                                .padding(vertical = 2.dp)
                        )
                    }
                }
            }
        }

            // Tabs: Daily, Weekly, Monthly, Totally
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Daily", "Weekly", "Monthly", "Totally").forEach { tab ->
                    val isSelected = uiState.leaderboardTab == tab
                    val label = when (tab) {
                        "Daily" -> AppStrings.get("daily", uiState.language)
                        "Weekly" -> AppStrings.get("weekly", uiState.language)
                        "Monthly" -> AppStrings.get("monthly", uiState.language)
                        "Totally" -> AppStrings.get("totally", uiState.language)
                        else -> tab
                    }
                    Text(
                        text = label,
                        color = if (isSelected) NeonPink else TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        modifier = Modifier
                            .clickable { viewModel.setLeaderboardTab(tab) }
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
        }

        // Top 3 Podiums Section
        if (leaders.size >= 3) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom
            ) {
                // 2nd Place
                PodiumColumn(
                    user = leaders[1],
                    crownEmoji = "🥈",
                    crownColor = Color(0xFFC0C0C0),
                    avatarSize = 56.dp,
                    podiumHeight = 60.dp
                )

                // 1st Place (Center and Highest)
                PodiumColumn(
                    user = leaders[0],
                    crownEmoji = "👑",
                    crownColor = AmberGold,
                    avatarSize = 72.dp,
                    podiumHeight = 85.dp
                )

                // 3rd Place
                PodiumColumn(
                    user = leaders[2],
                    crownEmoji = "🥉",
                    crownColor = Color(0xFFCD7F32),
                    avatarSize = 56.dp,
                    podiumHeight = 45.dp
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Remaining Ranked List
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(leaders.drop(3), key = { it.rank }) { user ->
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "${user.rank}",
                                color = ElectricViolet,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.width(24.dp)
                            )

                            AsyncImage(
                                model = user.avatarUrl,
                                contentDescription = user.name,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .border(1.dp, NeonPurple, CircleShape)
                            )

                            Spacer(modifier = Modifier.width(10.dp))

                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = user.name,
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    GenderBadge(gender = user.gender, level = user.level)
                                }
                                Text(
                                    text = user.idNum,
                                    color = TextSecondary,
                                    fontSize = 10.sp
                                )
                            }
                        }

                        // Coins
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("💎", fontSize = 11.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${user.coins}",
                                color = AmberGold,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PodiumColumn(
    user: LeaderboardUser,
    crownEmoji: String,
    crownColor: Color,
    avatarSize: androidx.compose.ui.unit.Dp,
    podiumHeight: androidx.compose.ui.unit.Dp
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(100.dp)
    ) {
        Text(crownEmoji, fontSize = 22.sp)

        AsyncImage(
            model = user.avatarUrl,
            contentDescription = user.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(avatarSize)
                .clip(CircleShape)
                .border(2.dp, crownColor, CircleShape)
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = user.name,
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        GenderBadge(gender = user.gender, level = user.level)

        Spacer(modifier = Modifier.height(2.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("💎", fontSize = 9.sp)
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = "${user.coins / 1000}K",
                color = AmberGold,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Podium step box
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(podiumHeight)
                .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(crownColor.copy(alpha = 0.4f), SurfaceCardDark)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "#${user.rank}",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black
            )
        }
    }
}
