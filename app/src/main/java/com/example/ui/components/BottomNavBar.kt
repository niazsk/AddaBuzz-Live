package com.example.ui.components

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

data class NavItem(
    val screen: Screen,
    val titleKey: String,
    val fallbackTitle: String,
    val icon: ImageVector,
    val testTag: String
)

@Composable
fun AddaBuzzBottomNav(
    currentScreen: Screen,
    onNavigate: (Screen) -> Unit,
    language: com.example.data.model.AppLanguage,
    modifier: Modifier = Modifier
) {
    val items = listOf(
        NavItem(Screen.HOME, "feature", "Home", Icons.Default.Explore, "nav_home"),
        NavItem(Screen.BROADCAST_LIVE, "start_broadcast", "Go Live", Icons.Default.Videocam, "nav_live"),
        NavItem(Screen.MESSAGES, "messages", "Messages", Icons.Default.ChatBubble, "nav_messages"),
        NavItem(Screen.PROFILE, "profile", "Profile", Icons.Default.Person, "nav_profile")
    )

    Surface(
        color = SurfaceDark.copy(alpha = 0.96f),
        tonalElevation = 8.dp,
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .border(0.8.dp, BorderPurple.copy(alpha = 0.8f))
            .testTag("bottom_nav_bar")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEach { item ->
                val isSelected = currentScreen == item.screen
                val title = if (item.titleKey == "feature") "Home"
                else if (item.titleKey == "start_broadcast") "Go Live"
                else if (item.titleKey == "multiplayer_game") "Arena"
                else if (item.titleKey == "leaderboard") "Rank"
                else if (item.titleKey == "messages") "Chat"
                else "Profile"

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onNavigate(item.screen) }
                        .padding(horizontal = 6.dp, vertical = 4.dp)
                        .testTag(item.testTag)
                ) {
                    if (item.screen == Screen.BROADCAST_LIVE) {
                        // Highlighted Center Go Live Button
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Brush.linearGradient(listOf(ElectricPink, HotCoral, AmberGold))),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                item.icon,
                                contentDescription = title,
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    } else {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = title,
                            tint = if (isSelected) ElectricPink else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = title,
                        color = if (isSelected) ElectricPink else TextSecondary,
                        fontSize = 10.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        }
    }
}
