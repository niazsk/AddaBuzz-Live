package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.Gender
import com.example.data.model.StreamType
import com.example.data.model.Streamer
import com.example.data.model.UserRole
import com.example.ui.components.GenderBadge
import com.example.ui.components.LatencyBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun HomeScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val streamers by viewModel.streamers.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val hostTasks by viewModel.hostTasks.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var isSearchActive by remember { mutableStateOf(false) }

    val filteredStreamers = remember(streamers, uiState.homeTab, searchQuery) {
        streamers.filter { s ->
            val matchesTab = when (uiState.homeTab) {
                "Live" -> true
                "Party" -> s.streamType == StreamType.PARTY_ROOM || s.category == "Party"
                "PK" -> s.streamType == StreamType.PK_BATTLE || s.category == "PK"
                else -> true
            }
            val matchesSearch = searchQuery.isBlank() ||
                    s.name.contains(searchQuery, ignoreCase = true) ||
                    s.title.contains(searchQuery, ignoreCase = true)
            matchesTab && matchesSearch
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DeepVioletDark)
            .statusBarsPadding()
            .testTag("home_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top App Bar with Dual Currency (Coins + Points) & Tasks Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Logo & Status
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Brush.linearGradient(listOf(ElectricPink, HotCoral, AmberGold))),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Videocam,
                            contentDescription = "Logo",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = AppStrings.get("app_title", uiState.language),
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(LiveGreen)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "348 ROOMS LIVE",
                                fontSize = 9.sp,
                                color = LiveGreen,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // Top Right Pill Controls
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Coins Pill
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(SurfaceDark)
                            .border(1.dp, AmberGold.copy(alpha = 0.6f), RoundedCornerShape(14.dp))
                            .clickable { viewModel.setShowTopUpModal(true) }
                            .padding(horizontal = 8.dp, vertical = 5.dp)
                            .testTag("home_coins_pill")
                    ) {
                        Text("🟡", fontSize = 11.sp)
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "${userProfile.coins}",
                            color = AmberGold,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Points Pill (Host Earnings with bKash withdrawal)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(SurfaceDark)
                            .border(1.dp, NeonPink.copy(alpha = 0.6f), RoundedCornerShape(14.dp))
                            .clickable { viewModel.setShowWithdrawModal(true) }
                            .padding(horizontal = 8.dp, vertical = 5.dp)
                            .testTag("home_points_pill")
                    ) {
                        Text("💎", fontSize = 11.sp)
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "${userProfile.points / 1000}K",
                            color = ElectricPink,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Daily Tasks Button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Brush.horizontalGradient(listOf(ElectricPink, HotCoral)))
                            .clickable { viewModel.setShowTasksDialog(true) }
                            .padding(horizontal = 8.dp, vertical = 6.dp)
                            .testTag("daily_tasks_btn"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🎁 Tasks", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Search Toggle
                    IconButton(
                        onClick = { isSearchActive = !isSearchActive },
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(SurfaceDark)
                    ) {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = "Search",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Search Bar (if opened)
            AnimatedVisibility(visible = isSearchActive) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search streamers, party rooms, or PK...", fontSize = 12.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 4.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ElectricPink,
                        unfocusedBorderColor = BorderPurple,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark
                    ),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )
            }

            // Room Categories Tab Bar: "Live", "Party", "PK"
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                listOf("Live", "Party", "PK").forEach { tab ->
                    val isSelected = uiState.homeTab == tab
                    val label = when (tab) {
                        "Live" -> AppStrings.get("live", uiState.language)
                        "Party" -> AppStrings.get("party", uiState.language)
                        "PK" -> AppStrings.get("pk", uiState.language)
                        else -> tab
                    }

                    Column(
                        modifier = Modifier
                            .clickable { viewModel.setHomeTab(tab) }
                            .padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (tab == "PK") {
                                Text("⚔️ ", fontSize = 12.sp)
                            } else if (tab == "Party") {
                                Text("🎙️ ", fontSize = 12.sp)
                            }
                            Text(
                                text = label,
                                fontSize = 14.sp,
                                fontWeight = if (isSelected) FontWeight.Black else FontWeight.SemiBold,
                                color = if (isSelected) ElectricPink else TextSecondary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        if (isSelected) {
                            Box(
                                modifier = Modifier
                                    .width(28.dp)
                                    .height(3.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(Brush.horizontalGradient(listOf(ElectricPink, HotCoral)))
                            )
                        }
                    }
                }
            }

            // Sub-header: Trending Now + Admin / Super Agent badge
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = AppStrings.get("trending_now", uiState.language),
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )

                if (userProfile.role == UserRole.ADMIN || userProfile.role == UserRole.SUPER_AGENT) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Brush.horizontalGradient(listOf(NeonPurple, AmberGold)))
                            .clickable { viewModel.navigateTo(Screen.ADMIN_PANEL) }
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                            .testTag("admin_dashboard_shortcut")
                    ) {
                        Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (userProfile.role == UserRole.ADMIN) "Admin Panel" else "Super Agent",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(SurfaceDark)
                            .clickable { viewModel.toggleLanguage() }
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = AppStrings.get("switch_lang", uiState.language),
                            color = HotCoral,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Streamer Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredStreamers, key = { it.id }) { streamer ->
                    BroadcastCard(
                        streamer = streamer,
                        onClick = { viewModel.selectStreamer(streamer) }
                    )
                }
            }
        }

        // Floating Action Button to Broadcast
        FloatingActionButton(
            onClick = { viewModel.navigateTo(Screen.BROADCAST_LIVE) },
            containerColor = Color.Transparent,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 8.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 76.dp, end = 16.dp)
                .size(56.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(ElectricPink, HotCoral, AmberGold)))
                .testTag("go_live_fab")
        ) {
            Icon(
                Icons.Default.Videocam,
                contentDescription = "Start Broadcast",
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }

        // Host Tasks & Reward Dialog
        if (uiState.showTasksDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.setShowTasksDialog(false) },
                confirmButton = {
                    Button(
                        onClick = { viewModel.setShowTasksDialog(false) },
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricPink)
                    ) {
                        Text("Close", fontWeight = FontWeight.Bold)
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🎁", fontSize = 20.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Daily Host Tasks & Rewards", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Complete daily broadcast tasks to earn Points withdrawable to bKash/Nagad!",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                        hostTasks.forEach { task ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, BorderPurple, RoundedCornerShape(12.dp))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(task.icon, fontSize = 20.sp)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(task.title, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            Text("Progress: ${task.currentProgress}/${task.targetProgress}", color = TextSecondary, fontSize = 10.sp)
                                        }
                                    }
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (task.isCompleted) LiveGreen else AmberGold.copy(alpha = 0.2f))
                                            .padding(horizontal = 6.dp, vertical = 3.dp)
                                    ) {
                                        Text(
                                            text = if (task.isCompleted) "CLAIMED" else "+${task.rewardPoints} Pts",
                                            color = if (task.isCompleted) Color.Black else AmberGold,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                },
                containerColor = SurfaceDark
            )
        }
    }
}

@Composable
fun BroadcastCard(
    streamer: Streamer,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
        modifier = modifier
            .fillMaxWidth()
            .height(235.dp)
            .border(1.dp, BorderPurple.copy(alpha = 0.6f), RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .testTag("streamer_card_${streamer.id}")
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = streamer.imageUrl,
                contentDescription = streamer.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Dark Scrim Overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.Black.copy(alpha = 0.45f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.88f)
                            )
                        )
                    )
            )

            // Top Badges
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Stream Type Badge (PK / Party / Live)
                when (streamer.streamType) {
                    StreamType.PK_BATTLE -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Brush.horizontalGradient(listOf(PKRed, PKBlue)))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("⚔️ PK", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Black)
                        }
                    }
                    StreamType.PARTY_ROOM -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Brush.horizontalGradient(listOf(ElectricPink, HotCoral)))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("🎙️ 8-MIC", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    StreamType.LIVE -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Black.copy(alpha = 0.6f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(LiveGreen)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("LIVE", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Country Flag & Viewers Count
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.6f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(streamer.countryFlag, fontSize = 10.sp)
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = streamer.viewers,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // Bottom Info: Gender Badge, Name, Title, Charm Score
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(bottom = 4.dp)
                ) {
                    GenderBadge(gender = streamer.gender, level = streamer.level)
                    LatencyBadge(latencyMs = streamer.latencyMs)
                }

                Text(
                    text = streamer.name,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = streamer.title,
                    color = TextSecondary,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
