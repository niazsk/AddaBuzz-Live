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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Gender
import com.example.data.model.UserRole
import com.example.ui.components.GenderBadge
import com.example.ui.theme.*
import com.example.ui.util.AppStrings
import com.example.ui.viewmodel.AddaBuzzViewModel
import com.example.ui.viewmodel.Screen

@Composable
fun SignInScreen(
    viewModel: AddaBuzzViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()

    var email by remember { mutableStateOf("streamer@addabuzz.com") }
    var password by remember { mutableStateOf("••••••••") }
    var selectedRole by remember { mutableStateOf(userProfile.role) }
    var selectedGender by remember { mutableStateOf(userProfile.gender) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(BorderPurple.copy(alpha = 0.8f), DeepVioletDark, Color.Black)
                )
            )
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp)
            .verticalScroll(rememberScrollState())
            .testTag("signin_screen"),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(top = 28.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        Brush.linearGradient(listOf(NeonPurple, NeonPink))
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Videocam,
                    contentDescription = "Logo",
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Sign In to AddaBuzz",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Text(
                text = "Real-time Broadcast & Interactive Live Adda",
                fontSize = 12.sp,
                color = TextSecondary,
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 24.dp)
        ) {
            // Role Switcher Pill for easy testing of User, Host, Super Agent, Admin
            Text(
                text = "Select Account Role / মোড নির্বাচন:",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = ElectricViolet,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(SurfaceDark)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                UserRole.values().forEach { role ->
                    val isSelected = selectedRole == role
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (isSelected) Brush.horizontalGradient(listOf(NeonPurple, NeonPink))
                                else Brush.horizontalGradient(listOf(Color.Transparent, Color.Transparent))
                            )
                            .clickable {
                                selectedRole = role
                                viewModel.setUserRole(role)
                            }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = when (role) {
                                UserRole.USER -> "User"
                                UserRole.HOST -> "Host"
                                UserRole.SUPER_AGENT -> "Agent"
                                UserRole.ADMIN -> "Admin"
                            },
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Color.White else TextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Gender Selection (Male / Female with icons as requested)
            Text(
                text = "Profile Gender (ID Icon):",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = ElectricViolet,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                listOf(Gender.MALE, Gender.FEMALE).forEach { gender ->
                    val isSelected = selectedGender == gender
                    val tint = if (gender == Gender.MALE) MaleBlue else FemalePink
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(SurfaceDark)
                            .border(
                                1.5.dp,
                                if (isSelected) tint else BorderPurple,
                                RoundedCornerShape(12.dp)
                            )
                            .clickable {
                                selectedGender = gender
                                viewModel.updateUserProfile(
                                    userProfile.name,
                                    userProfile.bio,
                                    gender
                                )
                            }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = if (gender == Gender.MALE) "♂ Male ID" else "♀ Female ID",
                            color = if (isSelected) tint else TextSecondary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Email Field
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email / Phone Number", fontSize = 12.sp) },
                leadingIcon = {
                    Icon(Icons.Default.Email, contentDescription = null, tint = ElectricViolet)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("email_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonPurple,
                    unfocusedBorderColor = BorderPurple,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = SurfaceDark,
                    unfocusedContainerColor = SurfaceDark
                ),
                shape = RoundedCornerShape(14.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Password Field
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password", fontSize = 12.sp) },
                leadingIcon = {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = ElectricViolet)
                },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("password_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonPurple,
                    unfocusedBorderColor = BorderPurple,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = SurfaceDark,
                    unfocusedContainerColor = SurfaceDark
                ),
                shape = RoundedCornerShape(14.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Submit Button
            Button(
                onClick = {
                    viewModel.setUserRole(selectedRole)
                    viewModel.updateUserProfile(userProfile.name, userProfile.bio, selectedGender)
                    viewModel.navigateTo(Screen.HOME)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("signin_button"),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.horizontalGradient(listOf(NeonPurple, NeonPink))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "SIGN IN & JOIN LIVE",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }

        // Bottom Social Logins & Footer
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(bottom = 24.dp)
        ) {
            Text(
                text = "Or continue with social account",
                fontSize = 11.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                listOf("f" to Color(0xFF1877F2), "G+" to Color(0xFFEA4335), "t" to Color(0xFF1DA1F2)).forEach { (label, bg) ->
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(bg)
                            .clickable { viewModel.navigateTo(Screen.HOME) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                }
            }
        }
    }
}
