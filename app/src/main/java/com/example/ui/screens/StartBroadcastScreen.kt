package com.example.ui.screens

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
import com.example.ui.components.GenderBadge
import com.example.ui.components.LatencyBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun StartBroadcastScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()

    var streamTitle by remember { mutableStateOf("Live Acoustic Adda & Q&A 🎸") }
    var selectedCategory by remember { mutableStateOf("Feature") }
    var isLiveActive by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .statusBarsPadding()
            .navigationBarsPadding()
            .testTag("start_broadcast_screen")
    ) {
        // Camera simulation preview
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        listOf(
                            if (uiState.isBeautyFilterOn) Color(0xFF26103A) else Color(0xFF150A21),
                            Color.Black
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.Videocam,
                    contentDescription = null,
                    tint = NeonPurple.copy(alpha = 0.5f),
                    modifier = Modifier.size(90.dp)
                )
                Text(
                    text = if (uiState.isFrontCamera) "Front Camera (1080p 60fps Active)" else "Back Camera (1080p 60fps Active)",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                if (uiState.isBeautyFilterOn) {
                    Text(
                        text = "✨ AI Beauty Filter: Soft Glow & Noise Reduction On",
                        color = AmberGold,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }

        // Overlay Controls
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Bar: Back button, Live Status, Latency
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = { viewModel.navigateTo(Screen.HOME) },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LatencyBadge(latencyMs = 28)
                    if (isLiveActive) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Red)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text("● LIVE", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("👥 ${uiState.broadcastViewerCount}", color = Color.White, fontSize = 11.sp)
                        }
                    }
                }
            }

            // Middle: Camera Tool Buttons on Right Side
            Column(
                modifier = Modifier.align(Alignment.End),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Switch Camera
                IconButton(
                    onClick = { viewModel.toggleCamera() },
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .border(1.dp, BorderPurple, CircleShape)
                        .testTag("toggle_camera_btn")
                ) {
                    Icon(Icons.Default.Cameraswitch, contentDescription = "Switch Camera", tint = Color.White)
                }

                // Mute Mic
                IconButton(
                    onClick = { viewModel.toggleMic() },
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .border(1.dp, if (uiState.isMicMuted) Color.Red else BorderPurple, CircleShape)
                        .testTag("toggle_mic_btn")
                ) {
                    Icon(
                        if (uiState.isMicMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        contentDescription = "Mute Mic",
                        tint = if (uiState.isMicMuted) Color.Red else Color.White
                    )
                }

                // Beauty Filter
                IconButton(
                    onClick = { viewModel.toggleBeautyFilter() },
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .border(1.dp, if (uiState.isBeautyFilterOn) AmberGold else BorderPurple, CircleShape)
                        .testTag("toggle_beauty_filter_btn")
                ) {
                    Icon(
                        Icons.Default.AutoFixHigh,
                        contentDescription = "Beauty Filter",
                        tint = if (uiState.isBeautyFilterOn) AmberGold else Color.White
                    )
                }
            }

            // Bottom Section: Title Input & Go Live Action
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.Black.copy(alpha = 0.75f))
                    .border(1.dp, BorderPurple, RoundedCornerShape(20.dp))
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    GenderBadge(gender = userProfile.gender, level = userProfile.level)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Broadcasting as ${userProfile.name}",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = streamTitle,
                    onValueChange = { streamTitle = it },
                    label = { Text("Broadcast Title / আড্ডা শিরোনাম", fontSize = 11.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = NeonPurple,
                        unfocusedBorderColor = BorderPurple,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Broadcast Type Selector (Party / PK / Solo)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        Triple(com.example.data.model.StreamType.PARTY_ROOM, "🎙️ 8-Mic Party", "Party"),
                        Triple(com.example.data.model.StreamType.PK_BATTLE, "⚔️ 1v1 PK", "PK"),
                        Triple(com.example.data.model.StreamType.LIVE, "📹 Solo Live", "Live")
                    ).forEach { (type, label, cat) ->
                        val isSelected = uiState.broadcastStreamType == type
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) Brush.horizontalGradient(listOf(ElectricPink, HotCoral))
                                    else Brush.horizontalGradient(listOf(SurfaceDark, SurfaceDark))
                                )
                                .border(1.dp, if (isSelected) AmberGold else BorderPurple, RoundedCornerShape(10.dp))
                                .clickable {
                                    viewModel.setBroadcastStreamType(type)
                                    selectedCategory = cat
                                }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(label, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        isLiveActive = !isLiveActive
                        if (isLiveActive) {
                            viewModel.startOwnBroadcast(streamTitle, selectedCategory, uiState.broadcastStreamType)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("go_live_action_btn"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isLiveActive) Color.Red else ElectricPink
                    ),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        text = if (isLiveActive) "STOP BROADCAST" else "START ${uiState.broadcastStreamType.name.replace('_', ' ')} 🔴",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
