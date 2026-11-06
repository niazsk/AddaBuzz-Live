package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MonetizationOn
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
import com.example.ui.viewmodel.AddaBuzzViewModel

@Composable
fun WithdrawModal(
    viewModel: AddaBuzzViewModel,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val userProfile by viewModel.userProfile.collectAsState()

    var withdrawAmountPoints by remember { mutableStateOf(100000L) } // 100K points = $10 USD
    var selectedMethod by remember { mutableStateOf("bKash") }
    var accountPhoneNumber by remember { mutableStateOf("01700123456") }
    var isSubmitted by remember { mutableStateOf(false) }

    val equivalentUsd = withdrawAmountPoints / 10000.0
    val equivalentBdt = (equivalentUsd * 120).toInt()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.7f))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(SurfaceDark)
                .border(1.dp, BorderPurple, RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .clickable(enabled = false) {}
                .padding(20.dp)
                .testTag("withdraw_modal")
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("💎", fontSize = 18.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Withdraw Host Points (উত্তোলন)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Current Points Balance Banner
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceCardDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ElectricPink.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Available Host Points", color = TextSecondary, fontSize = 11.sp)
                        Text("${userProfile.points} Pts", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Estimated Value", color = TextSecondary, fontSize = 11.sp)
                        Text("$${userProfile.points / 10000.0} USD (৳${(userProfile.points / 10000.0 * 120).toInt()})", color = LiveGreen, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Select Points to Withdraw
            Text("Select Amount / উত্তোলনের পরিমাণ:", color = ElectricViolet, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(100000L to "$10", 250000L to "$25", 500000L to "$50").forEach { (pts, usd) ->
                    val isSelected = withdrawAmountPoints == pts
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) ElectricPink.copy(alpha = 0.25f) else SurfaceCardDark
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .border(1.5.dp, if (isSelected) ElectricPink else BorderPurple, RoundedCornerShape(12.dp))
                            .clickable { withdrawAmountPoints = pts }
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("${pts / 1000}K Pts", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text(usd, color = AmberGold, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Select Payout Method
            Text("Withdrawal Method / পেমেন্ট মেথড:", color = ElectricViolet, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("bKash" to Color(0xFFE2136E), "Nagad" to Color(0xFFF7941D), "Bank" to Color(0xFF1A1F71), "USDT" to Color(0xFF26A17B)).forEach { (method, tint) ->
                    val isSelected = selectedMethod == method
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) tint.copy(alpha = 0.35f) else SurfaceCardDark)
                            .border(1.5.dp, if (isSelected) tint else BorderPurple, RoundedCornerShape(10.dp))
                            .clickable { selectedMethod = method }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(method, color = if (isSelected) Color.White else TextSecondary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = accountPhoneNumber,
                onValueChange = { accountPhoneNumber = it },
                label = { Text("$selectedMethod Account Number", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ElectricPink,
                    unfocusedBorderColor = BorderPurple,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (isSubmitted) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(LiveGreen.copy(alpha = 0.2f))
                        .border(1.dp, LiveGreen, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = LiveGreen)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Payout Request Approved! ৳$equivalentBdt sent to $selectedMethod ($accountPhoneNumber)", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = {
                        val ok = viewModel.withdrawPoints(withdrawAmountPoints)
                        if (ok) isSubmitted = true
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ElectricPink),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("CONFIRM WITHDRAWAL OF ৳$equivalentBdt ($$equivalentUsd USD)", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}
