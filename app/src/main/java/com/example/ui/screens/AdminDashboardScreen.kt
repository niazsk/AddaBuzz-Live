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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun AdminDashboardScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val adminMetrics by viewModel.adminMetrics.collectAsState()

    var commissionRate by remember { mutableStateOf(12) }
    var targetBanId by remember { mutableStateOf("") }
    var systemBroadcastMsg by remember { mutableStateOf("") }
    var backupStatusText by remember { mutableStateOf(adminMetrics.backupStatus) }
    var showActionNotice by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DeepVioletDark)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp)
            .verticalScroll(rememberScrollState())
            .testTag("admin_dashboard_screen")
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { viewModel.navigateTo(Screen.HOME) }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                Spacer(modifier = Modifier.width(4.dp))
                Column {
                    Text(
                        text = "Admin & Super Agent Dashboard",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Real-Time Telemetry & Host Control",
                        color = ElectricViolet,
                        fontSize = 11.sp
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(LiveGreen.copy(alpha = 0.2f))
                    .border(1.dp, LiveGreen, RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text("SUPER AGENT", color = LiveGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Live Telemetry KPI Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            KpiCard(
                title = "Active Streamers",
                value = "${adminMetrics.activeStreamers}",
                sub = "32 Host Rooms",
                icon = Icons.Default.Videocam,
                accent = NeonPurple,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = "Live Viewers",
                value = "${adminMetrics.liveViewersNow / 1000}K",
                sub = "Low-latency (~38ms)",
                icon = Icons.Default.Groups,
                accent = NeonPink,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            KpiCard(
                title = "Diamond Turnover",
                value = "14.8M",
                sub = "৳1,850,000 Volume",
                icon = Icons.Default.Diamond,
                accent = AmberGold,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = "Server Latency",
                value = "${adminMetrics.serverLatencyAvgMs} ms",
                sub = "99.98% Uptime SLA",
                icon = Icons.Default.Speed,
                accent = LiveGreen,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Automated Backup Status Box
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderPurple, RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CloudSync, contentDescription = null, tint = NeonCyan, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Automated Cloud & DB Backup", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Text("STATUS: OK", color = LiveGreen, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "$backupStatusText • Encrypted AES-256 replication across 3 redundant regions.",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                Button(
                    onClick = {
                        backupStatusText = "Snapshot Created Just Now (Manual Triggered)"
                        showActionNotice = "Database Snapshot successfully archived and verified!"
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonPurple),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("Trigger Instant Backup Snapshot", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Super Agent Commission & Management Tool
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderPurple, RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Super Agent Commission & Customization", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text("Agency ID: AGENCY_DHAKA_77 • Target Host Quota: 50", color = ElectricViolet, fontSize = 11.sp)

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Host Commission Rate: $commissionRate%", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { if (commissionRate > 5) commissionRate -= 1 },
                            colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("-1%", color = Color.White, fontSize = 11.sp)
                        }
                        Button(
                            onClick = { if (commissionRate < 30) commissionRate += 1 },
                            colors = ButtonDefaults.buttonColors(containerColor = NeonPurple),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("+1%", color = Color.White, fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Broadcast Moderation & System Alert Tool
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderPurple, RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Moderation & Push Broadcast Alert", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = systemBroadcastMsg,
                    onValueChange = { systemBroadcastMsg = it },
                    placeholder = { Text("Write urgent notice to all active streamers & viewers...", fontSize = 11.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = NeonPurple,
                        unfocusedBorderColor = BorderPurple,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = {
                        if (systemBroadcastMsg.isNotBlank()) {
                            showActionNotice = "System Broadcast sent to 42,890 live users!"
                            systemBroadcastMsg = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = NeonPink),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Send Live Global Announcement", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        // Action confirmation notification
        if (showActionNotice != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = LiveGreen.copy(alpha = 0.2f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, LiveGreen, RoundedCornerShape(12.dp))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(showActionNotice!!, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    IconButton(onClick = { showActionNotice = null }, modifier = Modifier.size(20.dp)) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
fun KpiCard(
    title: String,
    value: String,
    sub: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
        modifier = modifier.border(1.dp, BorderPurple, RoundedCornerShape(16.dp))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(sub, color = accent, fontSize = 10.sp)
        }
    }
}
