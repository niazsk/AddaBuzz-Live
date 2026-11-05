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
import com.example.ui.components.GenderBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun MessagesScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val directMessages by viewModel.directMessages.collectAsState()

    var activeChatSender by remember { mutableStateOf<String?>(null) }
    var replyText by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DeepVioletDark)
            .statusBarsPadding()
            .testTag("messages_screen")
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = AppStrings.get("messages", uiState.language),
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )

            // Tabs Switcher: Notifications vs Direct Messages
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDark)
                    .padding(2.dp)
            ) {
                listOf("Notifications", "Messages").forEach { tab ->
                    val isSelected = uiState.messagesTab == tab
                    val label = if (tab == "Notifications") AppStrings.get("notifications", uiState.language)
                    else AppStrings.get("messages", uiState.language)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (isSelected) Brush.horizontalGradient(listOf(NeonPurple, NeonPink))
                                else Brush.horizontalGradient(listOf(Color.Transparent, Color.Transparent))
                            )
                            .clickable { viewModel.setMessagesTab(tab) }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
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
        }

        // Content
        if (uiState.messagesTab == "Notifications") {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(notifications, key = { it.id }) { notif ->
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
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when (notif.type) {
                                            "stream" -> Brush.linearGradient(listOf(NeonPurple, NeonPink))
                                            "reward" -> Brush.linearGradient(listOf(AmberGold, NeonPink))
                                            "gift" -> Brush.linearGradient(listOf(LiveGreen, NeonCyan))
                                            else -> Brush.linearGradient(listOf(BorderPurple, ElectricViolet))
                                        }
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = when (notif.type) {
                                        "stream" -> Icons.Default.Videocam
                                        "reward" -> Icons.Default.CardGiftcard
                                        "gift" -> Icons.Default.Star
                                        else -> Icons.Default.Security
                                    },
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = notif.title,
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = notif.time,
                                        color = TextSecondary,
                                        fontSize = 10.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = notif.message,
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // Direct Messages List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(directMessages, key = { it.id }) { dm ->
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderPurple.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                            .clickable { activeChatSender = dm.senderName }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AsyncImage(
                                model = dm.avatarUrl,
                                contentDescription = dm.senderName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .border(1.5.dp, NeonPurple, CircleShape)
                            )

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = dm.senderName,
                                            color = Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        GenderBadge(gender = dm.gender)
                                    }
                                    Text(
                                        text = dm.time,
                                        color = TextSecondary,
                                        fontSize = 10.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = dm.lastMessage,
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            if (dm.unreadCount > 0) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .clip(CircleShape)
                                        .background(NeonPink),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "${dm.unreadCount}",
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Instant Direct Message Dialog
        if (activeChatSender != null) {
            AlertDialog(
                onDismissRequest = { activeChatSender = null },
                confirmButton = {
                    Button(
                        onClick = {
                            if (replyText.isNotBlank()) {
                                replyText = ""
                            }
                            activeChatSender = null
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NeonPurple)
                    ) {
                        Text("Send Message", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { activeChatSender = null }) {
                        Text("Cancel", color = TextSecondary)
                    }
                },
                title = {
                    Text("Chat with $activeChatSender", color = Color.White, fontSize = 15.sp)
                },
                text = {
                    Column {
                        Text(
                            text = "🔒 End-to-End Encrypted Peer Chat (AES-256)",
                            color = LiveGreen,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        OutlinedTextField(
                            value = replyText,
                            onValueChange = { replyText = it },
                            placeholder = { Text("Write private message...", fontSize = 12.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NeonPurple,
                                unfocusedBorderColor = BorderPurple,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }
                },
                containerColor = SurfaceDark
            )
        }
    }
}
