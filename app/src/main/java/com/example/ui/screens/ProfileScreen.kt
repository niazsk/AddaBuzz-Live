package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.Gender
import com.example.data.model.UserRole
import com.example.ui.components.GenderBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun ProfileScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()

    var showEditProfileDialog by remember { mutableStateOf(false) }
    var editName by remember { mutableStateOf(userProfile.name) }
    var editBio by remember { mutableStateOf(userProfile.bio) }
    var editGender by remember { mutableStateOf(userProfile.gender) }
    var activeFeatureDialog by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DeepVioletDark)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .testTag("profile_screen")
    ) {
        // Top Banner & Profile Info
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(SurfaceCardDark, DeepVioletDark)
                    )
                )
                .padding(top = 16.dp, bottom = 20.dp, start = 16.dp, end = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Avatar with Neon Ring & VIP Badge
                Box(contentAlignment = Alignment.BottomEnd) {
                    AsyncImage(
                        model = userProfile.avatarUrl,
                        contentDescription = userProfile.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(86.dp)
                            .clip(CircleShape)
                            .border(2.5.dp, Brush.linearGradient(listOf(ElectricPink, RoyalGold)), CircleShape)
                    )

                    // Edit avatar icon button
                    Box(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(CircleShape)
                            .background(ElectricPink)
                            .clickable { showEditProfileDialog = true },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Profile", tint = Color.White, modifier = Modifier.size(14.dp))
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = userProfile.name,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    // Male / Female ID icon badge!
                    GenderBadge(gender = userProfile.gender, level = userProfile.level)
                }

                Spacer(modifier = Modifier.height(4.dp))

                // VIP & Charm Badges Row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // VIP Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(Brush.horizontalGradient(listOf(RoyalGold, HotCoral)))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("👑 VIP ${userProfile.vipLevel}", color = Color.Black, fontSize = 9.sp, fontWeight = FontWeight.Black)
                    }

                    // Wealth Level Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(AmberGold.copy(alpha = 0.2f))
                            .border(1.dp, AmberGold, RoundedCornerShape(8.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("🛡️ Wealth Lv.${userProfile.wealthLevel}", color = AmberGold, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }

                    // Charm Level Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(ElectricPink.copy(alpha = 0.2f))
                            .border(1.dp, ElectricPink, RoundedCornerShape(8.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("💖 Charm Lv.${userProfile.charmLevel}", color = ElectricPink, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "ID: ${userProfile.idNum} • Agency: ${userProfile.agencyName} (${userProfile.agencyCode})",
                    color = ElectricViolet,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = userProfile.bio,
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 15.sp,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Stats Row: Following, Followers, Level
                Row(
                    modifier = Modifier
                        .fillMaxWidth(0.92f)
                        .clip(RoundedCornerShape(18.dp))
                        .background(SurfaceDark)
                        .border(1.dp, BorderPurple, RoundedCornerShape(18.dp))
                        .padding(vertical = 12.dp, horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${userProfile.followingCount}",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = AppStrings.get("following", uiState.language),
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }

                    Box(modifier = Modifier.width(1.dp).height(24.dp).background(BorderPurple))

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${userProfile.followersCount}",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = AppStrings.get("followers", uiState.language),
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }

                    Box(modifier = Modifier.width(1.dp).height(24.dp).background(BorderPurple))

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Lv.${userProfile.level}",
                            color = HotCoral,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Host Grade",
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }

        // Dual Currency Wallet Section: Coins & Points
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Coins Card (For spending & games)
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, AmberGold.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                        .clickable { viewModel.setShowTopUpModal(true) }
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🟡", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Coins Balance", color = TextSecondary, fontSize = 11.sp)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("${userProfile.coins}", color = AmberGold, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(AmberGold)
                                .clickable { viewModel.setShowTopUpModal(true) }
                                .padding(vertical = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("+ Top Up", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Points Card (Host Earnings -> Withdraw)
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, ElectricPink.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                        .clickable { viewModel.setShowWithdrawModal(true) }
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("💎", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Host Points", color = TextSecondary, fontSize = 11.sp)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("${userProfile.points / 1000}K Pts", color = ElectricPink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(ElectricPink)
                                .clickable { viewModel.setShowWithdrawModal(true) }
                                .padding(vertical = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Withdraw ৳", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // 8-Tile Main Grid: Reward, Rank, Games, Store, Invite, Honor Level, Fan Club, Medal Wall
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(18.dp))
                    .testTag("profile_tiles_grid")
            ) {
                Column(modifier = Modifier.padding(vertical = 14.dp, horizontal = 10.dp)) {
                    val row1 = listOf(
                        Triple("Reward", Icons.Default.CardGiftcard, Color(0xFFFB7185)) to { viewModel.setShowTasksDialog(true) },
                        Triple("Rank", Icons.Default.EmojiEvents, Color(0xFFFBBF24)) to { viewModel.navigateTo(Screen.LEADERBOARD) },
                        Triple("Games", Icons.Default.Casino, Color(0xFF34D399)) to { viewModel.navigateTo(Screen.MULTIPLAYER_GAME) },
                        Triple("Store", Icons.Default.ShoppingBag, Color(0xFF22D3EE)) to { viewModel.setShowTopUpModal(true) }
                    )
                    val row2 = listOf(
                        Triple("Invite", Icons.Default.PersonAdd, Color(0xFFFB923C)) to { activeFeatureDialog = "invite" },
                        Triple("Honor Level", Icons.Default.Shield, Color(0xFFA78BFA)) to { activeFeatureDialog = "honor" },
                        Triple("Fan Club", Icons.Default.Favorite, Color(0xFFF472B6)) to { activeFeatureDialog = "fanclub" },
                        Triple("Medal Wall", Icons.Default.MilitaryTech, Color(0xFFFACC15)) to { activeFeatureDialog = "medals" }
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        row1.forEach { (item, action) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable(onClick = action)
                                    .padding(vertical = 6.dp, horizontal = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(item.third.copy(alpha = 0.16f))
                                        .border(1.dp, item.third.copy(alpha = 0.45f), RoundedCornerShape(14.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(item.second, contentDescription = item.first, tint = item.third, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(item.first, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        row2.forEach { (item, action) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable(onClick = action)
                                    .padding(vertical = 6.dp, horizontal = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(item.third.copy(alpha = 0.16f))
                                        .border(1.dp, item.third.copy(alpha = 0.45f), RoundedCornerShape(14.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(item.second, contentDescription = item.first, tint = item.third, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(item.first, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }

            // Agent Management Block
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(18.dp))
                    .testTag("profile_agent_section")
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    // Header
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Agent Management", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(NeonCyan.copy(alpha = 0.2f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("Agency Hub", color = NeonCyan, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Text(
                            text = "All >",
                            color = ElectricPink,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { viewModel.navigateTo(Screen.ADMIN_PANEL) }
                        )
                    }

                    // 4 Agent Tiles
                    val agentTiles = listOf(
                        Triple("Agent", Icons.Default.Groups, Color(0xFF38BDF8)) to { viewModel.navigateTo(Screen.ADMIN_PANEL) },
                        Triple("Add Host", Icons.Default.PersonAddAlt1, Color(0xFFA78BFA)) to { activeFeatureDialog = "addhost" },
                        Triple("Invite Agent", Icons.Default.Share, Color(0xFF2DD4BF)) to { activeFeatureDialog = "inviteagent" },
                        Triple("Coins Trading", Icons.Default.SwapHoriz, Color(0xFFFBBF24)) to { viewModel.setShowTopUpModal(true) }
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        agentTiles.forEach { (item, action) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .clickable(onClick = action)
                                    .padding(vertical = 4.dp, horizontal = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(item.third.copy(alpha = 0.16f))
                                        .border(1.dp, item.third.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(item.second, contentDescription = item.first, tint = item.third, modifier = Modifier.size(20.dp))
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(item.first, color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // 2-Column Agent Rows
                    val agentRows = listOf(
                        Triple("Agent Rewards", Icons.Default.ConfirmationNumber, Color(0xFFFB923C)) to { activeFeatureDialog = "agentrewards" },
                        Triple("Agent Ranking", Icons.Default.BarChart, Color(0xFF38BDF8)) to { viewModel.navigateTo(Screen.LEADERBOARD) },
                        Triple("Diamond Agent", Icons.Default.Diamond, Color(0xFF818CF8)) to { activeFeatureDialog = "diamondagent" },
                        Triple("Agent Activities", Icons.Default.ShowChart, Color(0xFFFB7185)) to { activeFeatureDialog = "agentactivities" }
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(agentRows[0], agentRows[2]).forEach { (item, action) ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(SurfaceCardDark)
                                        .border(0.8.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                                        .clickable(onClick = action)
                                        .padding(horizontal = 8.dp, vertical = 8.dp)
                                ) {
                                    Icon(item.second, contentDescription = null, tint = item.third, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(item.first, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(agentRows[1], agentRows[3]).forEach { (item, action) ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(SurfaceCardDark)
                                        .border(0.8.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                                        .clickable(onClick = action)
                                        .padding(horizontal = 8.dp, vertical = 8.dp)
                                ) {
                                    Icon(item.second, contentDescription = null, tint = item.third, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(item.first, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
            }

            // Menu Items List
            listOf(
                Triple("Daily Tasks & Rewards Center", Icons.Default.CardGiftcard, { viewModel.setShowTasksDialog(true) }),
                Triple("Edit Profile & Gender Icon", Icons.Default.Person, { showEditProfileDialog = true }),
                Triple("Super Agent & Admin Dashboard", Icons.Default.AdminPanelSettings, { viewModel.navigateTo(Screen.ADMIN_PANEL) }),
                Triple("Security, E2EE & Data Backup", Icons.Default.Security, { viewModel.setShowSecurityDialog(true) }),
                Triple("Switch Language (${if (uiState.language == com.example.data.model.AppLanguage.EN) "English" else "বাংলা"})", Icons.Default.Translate, { viewModel.toggleLanguage() }),
                Triple("Dark / Neon Theme Mode", Icons.Default.DarkMode, { viewModel.toggleDarkMode() })
            ).forEach { (title, icon, action) ->
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                        .clickable(onClick = action)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(icon, contentDescription = null, tint = HotCoral, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                    }
                }
            }

            // Log Out Button
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color.Red.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
                    .clickable { viewModel.navigateTo(Screen.SIGN_IN) }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFFF5252), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Log Out", color = Color(0xFFFF5252), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(90.dp))
        }

        // Edit Profile Dialog
        if (showEditProfileDialog) {
            AlertDialog(
                onDismissRequest = { showEditProfileDialog = false },
                confirmButton = {
                    Button(
                        onClick = {
                            viewModel.updateUserProfile(editName, editBio, editGender)
                            showEditProfileDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricPink)
                    ) {
                        Text("Save Changes", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showEditProfileDialog = false }) {
                        Text("Cancel", color = TextSecondary)
                    }
                },
                title = {
                    Text("Customize Profile & Gender", color = Color.White, fontSize = 16.sp)
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = editName,
                            onValueChange = { editName = it },
                            label = { Text("Display Name") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = ElectricPink,
                                unfocusedBorderColor = BorderPurple,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        OutlinedTextField(
                            value = editBio,
                            onValueChange = { editBio = it },
                            label = { Text("Bio") },
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 3,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = ElectricPink,
                                unfocusedBorderColor = BorderPurple,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        Text(
                            text = "Select Gender ID Icon:",
                            color = ElectricViolet,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(Gender.MALE to "♂ Male ID", Gender.FEMALE to "♀ Female ID").forEach { (gender, label) ->
                                val isSelected = editGender == gender
                                val tint = if (gender == Gender.MALE) MaleBlue else FemalePink
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (isSelected) tint.copy(alpha = 0.25f) else SurfaceCardDark)
                                        .border(1.5.dp, if (isSelected) tint else BorderPurple, RoundedCornerShape(10.dp))
                                        .clickable { editGender = gender }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(label, color = tint, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                },
                containerColor = SurfaceDark
            )
        }

        // Security Dialog
        if (uiState.showSecurityDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.setShowSecurityDialog(false) },
                confirmButton = {
                    Button(
                        onClick = { viewModel.setShowSecurityDialog(false) },
                        colors = ButtonDefaults.buttonColors(containerColor = LiveGreen)
                    ) {
                        Text("Acknowledge & Close", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = LiveGreen)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Database & E2EE Security", color = Color.White, fontSize = 16.sp)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("🔒 End-to-End Encryption: Active (AES-256 GCM)", color = LiveGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text("🛡️ Two-Factor Authentication: Enabled", color = Color.White, fontSize = 11.sp)
                        Text("💾 Automated Database Backup: Active (Every 6h Snapshot)", color = Color.White, fontSize = 11.sp)
                        Text("🌐 Secure Gateway: PCI-DSS Compliant Payment Channel", color = Color.White, fontSize = 11.sp)
                        Text("⚡ Live Protocol: WebRTC Ultra-Low Latency (~32ms)", color = ElectricViolet, fontSize = 11.sp)
                    }
                },
                containerColor = SurfaceDark
            )
        }

        // Feature Dialogs for Profile & Agent Tiles
        activeFeatureDialog?.let { dialogType ->
            AlertDialog(
                onDismissRequest = { activeFeatureDialog = null },
                confirmButton = {
                    Button(
                        onClick = { activeFeatureDialog = null },
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricPink)
                    ) {
                        Text("Close", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val icon = when (dialogType) {
                            "invite" -> Icons.Default.PersonAdd
                            "honor" -> Icons.Default.Shield
                            "fanclub" -> Icons.Default.Favorite
                            "medals" -> Icons.Default.MilitaryTech
                            "addhost" -> Icons.Default.PersonAddAlt1
                            "inviteagent" -> Icons.Default.Share
                            "diamondagent" -> Icons.Default.Diamond
                            "agentrewards" -> Icons.Default.ConfirmationNumber
                            "agentactivities" -> Icons.Default.ShowChart
                            else -> Icons.Default.Info
                        }
                        val title = when (dialogType) {
                            "invite" -> "Invite Friends & Earn"
                            "honor" -> "Honor & Level Privileges"
                            "fanclub" -> "Fan Club Membership"
                            "medals" -> "Achievement Medal Wall"
                            "addhost" -> "Agency: Add New Host"
                            "inviteagent" -> "Invite Sub-Agent"
                            "diamondagent" -> "Diamond Agent Status"
                            "agentrewards" -> "Agency Commission & Rewards"
                            "agentactivities" -> "Agency Activities & Contests"
                            else -> "Details"
                        }
                        Icon(icon, contentDescription = null, tint = HotCoral, modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        when (dialogType) {
                            "invite" -> {
                                Text("🎁 Invite code: ${userProfile.agencyCode}", color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Share your referral link with new creators or viewers. Get 5,000 bonus coins + 5% permanent gift rebate on every recharge!", color = TextSecondary, fontSize = 12.sp)
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(SurfaceCardDark)
                                        .padding(8.dp)
                                ) {
                                    Text("https://addabuzz.live/join?code=${userProfile.agencyCode}", color = ElectricViolet, fontSize = 11.sp)
                                }
                            }
                            "honor" -> {
                                Text("👑 Wealth Level: Lv.${userProfile.wealthLevel} (Gold Guardian)", color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("💖 Charm Level: Lv.${userProfile.charmLevel} (Ruby Star)", color = ElectricPink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("⭐ VIP Grade: VIP ${userProfile.vipLevel} Active", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("Privileges include animated profile glow, broadcast room entrance banner, exclusive gifts, and priority customer service.", color = TextSecondary, fontSize = 11.sp)
                            }
                            "fanclub" -> {
                                Text("❤️ Fan Club: Star Creator Community", color = ElectricPink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("Members: 1,420 Active Fans", color = Color.White, fontSize = 12.sp)
                                Text("Send custom fan gifts to level up your intimacy and unlock glowing badge colors beside your name in live chats!", color = TextSecondary, fontSize = 11.sp)
                            }
                            "medals" -> {
                                Text("🎖️ Broadcaster Medal — Unlocked", color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("👑 Gifting Master — Top 5% Contributor", color = HotCoral, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("⚔️ PK Battle Veteran — 50+ Victories", color = LiveGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("🎙️ 8-Mic Party Legend — 100+ Party Hours", color = ElectricViolet, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            "addhost" -> {
                                Text("Register and manage hosts under your agency:", color = Color.White, fontSize = 12.sp)
                                Text("Host ID / Account: ${userProfile.idNum}", color = ElectricViolet, fontSize = 11.sp)
                                Text("Agency Code: ${userProfile.agencyCode} (${userProfile.agencyName})", color = TextSecondary, fontSize = 11.sp)
                                Text("Hosts contracted to your agency receive automated daily settlement and 70% direct host points share.", color = LiveGreen, fontSize = 11.sp)
                            }
                            "inviteagent" -> {
                                Text("Expand your Agency Network:", color = Color.White, fontSize = 12.sp)
                                Text("Earn an 8% sub-agent override bonus on all net points generated by hosts recruited by your sub-agents.", color = TextSecondary, fontSize = 11.sp)
                                Text("Agency Referral Link: https://addabuzz.live/agency?ref=${userProfile.agencyCode}", color = ElectricPink, fontSize = 11.sp)
                            }
                            "diamondagent" -> {
                                Text("💎 Tier 2 Senior Diamond Agency", color = ElectricPink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("Active Broadcast Hosts: 24", color = Color.White, fontSize = 12.sp)
                                Text("Monthly Host Revenue: 1,850,000 Points", color = AmberGold, fontSize = 12.sp)
                                Text("Settlement Channels: bKash, Nagad, Direct Bank Transfer", color = TextSecondary, fontSize = 11.sp)
                            }
                            "agentrewards" -> {
                                Text("📊 Agency Bonus Tiers:", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("• Tier A (10M Pts): 15% Agency Bonus", color = AmberGold, fontSize = 11.sp)
                                Text("• Tier B (5M Pts): 12% Agency Bonus", color = HotCoral, fontSize = 11.sp)
                                Text("• Tier C (1M Pts): 10% Agency Bonus", color = LiveGreen, fontSize = 11.sp)
                                Text("Current Tier: Tier B (12% Bonus Active)", color = ElectricViolet, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            }
                            "agentactivities" -> {
                                Text("🔥 Agency Spring Sprint Contest:", color = HotCoral, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("Top 3 Agencies of the month win a 500,000 Points prize pool and a 30-day Featured Agency Banner on Home!", color = TextSecondary, fontSize = 11.sp)
                                Text("Rank: #4 (Need 120,000 pts to reach Top 3)", color = AmberGold, fontSize = 11.sp)
                            }
                        }
                    }
                },
                containerColor = SurfaceDark
            )
        }
    }
}
