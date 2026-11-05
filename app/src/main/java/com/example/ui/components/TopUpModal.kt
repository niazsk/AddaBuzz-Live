package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
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

data class TopUpPackage(
    val coins: Int,
    val bonusCoins: Int,
    val priceUsd: String,
    val priceBdt: String
)

@Composable
fun TopUpModal(
    viewModel: AddaBuzzViewModel,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val packages = remember {
        listOf(
            TopUpPackage(10000, 0, "$0.99", "৳120"),
            TopUpPackage(55000, 5000, "$4.99", "৳600"),
            TopUpPackage(120000, 15000, "$9.99", "৳1,200"),
            TopUpPackage(650000, 100000, "$49.99", "৳6,000"),
            TopUpPackage(1400000, 300000, "$99.99", "৳12,000")
        )
    }

    var selectedPkg by remember { mutableStateOf(packages[1]) }
    var selectedMethod by remember { mutableStateOf("bKash") }
    var isProcessing by remember { mutableStateOf(false) }
    var paymentSuccess by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.65f))
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
                .testTag("topup_modal")
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🟡", fontSize = 18.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Recharge Coins / কয়েন রিচার্জ",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Packages Row
            Text(
                text = "Select Coin Tier / প্যাকেজ নির্বাচন করুন:",
                color = ElectricViolet,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                packages.take(3).forEach { pkg ->
                    val isSelected = selectedPkg == pkg
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) ElectricPink.copy(alpha = 0.25f) else SurfaceCardDark
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .border(1.5.dp, if (isSelected) AmberGold else BorderPurple, RoundedCornerShape(14.dp))
                            .clickable { selectedPkg = pkg }
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("🟡 ${pkg.coins / 1000}K", color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            if (pkg.bonusCoins > 0) {
                                Text("+${pkg.bonusCoins / 1000}K Bonus", color = LiveGreen, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(pkg.priceBdt, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Payment Methods
            Text(
                text = "Payment Gateway / পেমেন্ট গেটওয়ে:",
                color = ElectricViolet,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    Pair("bKash", Color(0xFFE2136E)),
                    Pair("Nagad", Color(0xFFF7941D)),
                    Pair("Visa/Card", Color(0xFF1A1F71)),
                    Pair("Google Pay", Color(0xFF4285F4))
                ).forEach { (method, tint) ->
                    val isSelected = selectedMethod == method
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) tint.copy(alpha = 0.35f) else SurfaceCardDark)
                            .border(1.5.dp, if (isSelected) tint else BorderPurple, RoundedCornerShape(12.dp))
                            .clickable { selectedMethod = method }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = method,
                            color = if (isSelected) Color.White else TextSecondary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Security note
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.Black.copy(alpha = 0.4f))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = LiveGreen, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "256-Bit SSL Encrypted & PCI-DSS Compliant Gateway",
                    color = LiveGreen,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Confirmation / Pay Button
            if (paymentSuccess) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(LiveGreen.copy(alpha = 0.2f))
                        .border(1.dp, LiveGreen, RoundedCornerShape(14.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = LiveGreen)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Payment Verified! +${(selectedPkg.coins + selectedPkg.bonusCoins) / 1000}K Coins Credited!",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            } else {
                Button(
                    onClick = {
                        isProcessing = true
                        paymentSuccess = true
                        viewModel.topUpCoins(selectedPkg.coins + selectedPkg.bonusCoins)
                        isProcessing = false
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("confirm_payment_btn"),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    contentPadding = PaddingValues(),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Brush.horizontalGradient(listOf(ElectricPink, HotCoral, AmberGold))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "PAY ${selectedPkg.priceBdt} WITH ${selectedMethod.uppercase()}",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }
    }
}
